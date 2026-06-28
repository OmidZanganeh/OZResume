'use client';

import {
  useMemo,
  useState,
  useEffect,
  useDeferredValue,
  useTransition,
  useCallback,
  useRef,
} from 'react';
import Link from 'next/link';
import { BarChart3, Loader2, AlertTriangle, Download, Search } from 'lucide-react';
import FilterBar from './FilterBar';
import StockTable, { sortRows, type SortDir } from './StockTable';
import type { TableColumnId } from './tableColumns';
import DateTimeline from './DateTimeline';
import BacktestPanel from './BacktestPanel';
import SimilarityPanel from './SimilarityPanel';
import WatchlistPanel from './WatchlistPanel';
import VisualViewTabs from './views/VisualViewTabs';
import ChartsView from './views/ChartsView';
import SectorView from './views/SectorView';
import CompareView from './views/CompareView';
import type { VisualViewMode } from './views/visualViewMode';
import chartStyles from './charts/Charts.module.css';
import { MOCK_STOCKS } from './mockStocks';
import type { Stock } from './types';
import {
  DEFAULT_RETURN_PERIOD_DAYS,
  targetDaysAgoFromPeriod,
} from './returnPeriods';
import { passesScreen, DEFAULT_SCREENER_STATE, enabledFilterCount } from './filters';
import { parsedExpressionUsesMomentum } from './filterExpressionCache';
import { EMPTY_SNAPSHOTS } from './snapshotConstants';
import type { ScreenerState } from './filters';
import {
  buildTodaySnapshots,
  computeBacktest,
  formatAsOfDate,
  priceMomentumProfile,
  returnBetweenDaysAgo,
} from './historical';
import {
  buildSnapshotsAsync,
  invalidateSnapshotCache,
  peekSnapshotCache,
} from './snapshotCache';
import { rankSimilarityToday, similarityScoresToday, fundamentalProfileFromMetrics } from './similarity';
import { buildPatternFactorFilter } from './patternMatchFilter';
import { visibleColumns } from './tableColumns';
import { downloadScreenerCsv, screenerCsvFilename } from './exportCsv';
import {
  readSessionMarketCache,
  writeSessionMarketCache,
  formatCacheAge,
} from './clientCache';
import { useWatchlists, type ViewMode } from './watchlists';
import {
  selectionLabel,
  universesForSelection,
  universeCacheKey,
  DEFAULT_UNIVERSE_SELECTION,
  type UniverseSelection,
} from './universe';
import styles from './StockScreener.module.css';

function mergeStockLists(prev: Stock[], incoming: Stock[]): Stock[] {
  const prevWeekly = new Map(
    prev
      .filter(s => s.weeklyHistory?.length)
      .map(s => [s.ticker, s.weeklyHistory!] as const),
  );
  const prevFund = new Map(
    prev
      .filter(s => s.fundamentalHistory?.length)
      .map(s => [s.ticker, s.fundamentalHistory!] as const),
  );
  return incoming.map(stock => {
    const keptWeekly = stock.weeklyHistory?.length ? undefined : prevWeekly.get(stock.ticker);
    const keptFund = stock.fundamentalHistory?.length ? undefined : prevFund.get(stock.ticker);
    if (!keptWeekly && !keptFund) return stock;
    return {
      ...stock,
      ...(keptWeekly?.length ? { weeklyHistory: keptWeekly } : {}),
      ...(keptFund?.length ? { fundamentalHistory: keptFund } : {}),
    };
  });
}

/** Merge multiple stock lists by ticker (S&P + NASDAQ union). */
function unionStockLists(lists: Stock[][]): Stock[] {
  const map = new Map<string, Stock>();
  for (const list of lists) {
    for (const stock of list) {
      const existing = map.get(stock.ticker);
      if (!existing) {
        map.set(stock.ticker, stock);
        continue;
      }
      map.set(stock.ticker, {
        ...existing,
        ...stock,
        weeklyHistory: stock.weeklyHistory?.length ? stock.weeklyHistory : existing.weeklyHistory,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
}

type DataSource = 'finnhub' | 'fmp' | 'mock' | 'loading';

interface MarketPayload {
  stocks: Stock[];
  source: DataSource;
  cachedAt?: string;
  expiresAt?: string;
  fromCache?: boolean;
  totalSymbols?: number;
  refreshComplete?: boolean;
  warning?: string;
}

export default function StockScreener() {
  const [screenerState, setScreenerState] = useState<ScreenerState>(DEFAULT_SCREENER_STATE);
  const [daysAgo, setDaysAgo] = useState(0);
  const deferredDaysAgo = useDeferredValue(daysAgo);
  const [returnPeriodDays, setReturnPeriodDays] = useState(DEFAULT_RETURN_PERIOD_DAYS);
  const deferredReturnPeriodDays = useDeferredValue(returnPeriodDays);
  const [isDatePending, startDateTransition] = useTransition();
  const [, startFilterTransition] = useTransition();
  const setDaysAgoDeferred = useCallback((next: number) => {
    startDateTransition(() => setDaysAgo(next));
  }, []);

  const [referenceTickers, setReferenceTickers] = useState<Set<string>>(() => new Set());
  const [sortColumn, setSortColumn] = useState<TableColumnId>('ticker');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>('loading');
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cacheLabel, setCacheLabel] = useState<string | null>(null);
  const [totalSymbols, setTotalSymbols] = useState<number | undefined>();
  const [patternLoading, setPatternLoading] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('universe');
  const [universeSelection, setUniverseSelection] = useState<UniverseSelection>(
    DEFAULT_UNIVERSE_SELECTION,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [visualViewMode, setVisualViewMode] = useState<VisualViewMode>('table');
  const [selectedChartTicker, setSelectedChartTicker] = useState<string | null>(null);
  const [compareTickers, setCompareTickers] = useState<string[]>([]);
  const watchlist = useWatchlists();
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;

  const lastReadySnapshots = useRef({
    daysAgo: 0,
    map: new Map<string, import('./types').StockSnapshot>(),
    stocksKey: '',
  });

  useEffect(() => {
    if (dataSource === 'mock') return;
    if (deferredDaysAgo <= 0 && referenceTickers.size === 0) return;

    let cancelled = false;
    let batches = 0;
    const maxBatches = 40;

    async function enrichBatch() {
      if (cancelled || batches >= maxBatches) return;
      const missing = stocksRef.current
        .filter(s => !s.weeklyHistory?.length)
        .slice(0, 25);
      if (missing.length === 0) return;

      batches += 1;
      try {
        const res = await fetch(
          `/api/stock-screener/weekly?symbols=${encodeURIComponent(missing.map(s => s.ticker).join(','))}`,
        );
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          results?: Record<string, NonNullable<Stock['weeklyHistory']>>;
        };
        const results = body.results ?? {};
        if (Object.keys(results).length === 0) return;
        setStocks(prev =>
          prev.map(s => {
            const w = results[s.ticker];
            return w?.length ? { ...s, weeklyHistory: w } : s;
          }),
        );
      } catch {
        // ignore — next batch may succeed
      }
    }

    void enrichBatch();
    const id = window.setInterval(() => void enrichBatch(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [deferredDaysAgo, referenceTickers.size, dataSource]);

  useEffect(() => {
    let cancelled = false;

    function applyPayload(data: MarketPayload) {
      const list = Array.isArray(data.stocks) && data.stocks.length > 0
        ? data.stocks
        : MOCK_STOCKS;

      setStocks(prev => (prev.length === 0 ? list : mergeStockLists(prev, list)));
      setDataSource(data.source ?? 'mock');
      setDataWarning(data.warning ?? null);
      setTotalSymbols(data.totalSymbols);
      const age = formatCacheAge(data.cachedAt);
      setCacheLabel(
        data.source !== 'mock' && age
          ? `Snapshot from ${age}${data.fromCache ? ' (cached)' : ''}`
          : null,
      );
      writeSessionMarketCache(data, universeCacheKey(universeSelection));
    }

    function sessionPayloadForSelection(): MarketPayload | null {
      const cacheKey = universeCacheKey(universeSelection);
      const direct = readSessionMarketCache(cacheKey);
      if (direct && Array.isArray(direct.stocks) && direct.stocks.length > 0) {
        return direct as MarketPayload;
      }

      const ids = universesForSelection(universeSelection);
      if (ids.length === 1) return null;

      const parts = ids
        .map(id => readSessionMarketCache(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p?.stocks?.length));

      if (parts.length === 0) return null;

      const stocks = unionStockLists(
        parts.map(p => (Array.isArray(p.stocks) ? p.stocks : []) as Stock[]),
      );
      if (stocks.length === 0) return null;

      return {
        stocks,
        source: (parts.every(p => p.source === 'mock') ? 'mock' : 'finnhub') as DataSource,
        cachedAt: parts.map(p => p.cachedAt).filter(Boolean).sort().pop(),
        fromCache: true,
        warning: parts.map(p => p.warning).filter(Boolean).join(' '),
        totalSymbols: stocks.length,
      };
    }

    let hadCachedStocks = false;

    async function loadMarketData() {
      setStocks([]);
      setReferenceTickers(new Set());
      invalidateSnapshotCache();
      lastReadySnapshots.current = { daysAgo: 0, map: new Map(), stocksKey: '' };

      const sessionHit = sessionPayloadForSelection();
      if (sessionHit?.stocks?.length) {
        hadCachedStocks = true;
        applyPayload(sessionHit);
        setDataSource((sessionHit.source as DataSource) ?? 'mock');
        setLoadError(null);
      } else {
        setDataSource('loading');
      }
      setLoadError(null);

      try {
        const ids = universesForSelection(universeSelection);
        const multi = ids.length > 1;
        const responses = await Promise.all(
          ids.map(id => fetch(`/api/stock-screener?universe=${id}`)),
        );
        if (cancelled) return;

        const payloads = await Promise.all(responses.map(async res => {
          if (!res.ok) throw new Error(`API error ${res.status}`);
          return (await res.json()) as MarketPayload;
        }));
        if (cancelled) return;

        const mergedStocks = unionStockLists(payloads.map(p => p.stocks ?? []));
        const warnings = payloads.map(p => p.warning).filter(Boolean);
        const allMock = payloads.every(p => p.source === 'mock');
        const expectedTotal = payloads.reduce((sum, p) => sum + (p.totalSymbols ?? p.stocks?.length ?? 0), 0);

        applyPayload({
          stocks: mergedStocks.length > 0 ? mergedStocks : MOCK_STOCKS,
          source: allMock ? 'mock' : 'finnhub',
          cachedAt: payloads.map(p => p.cachedAt).filter(Boolean).sort().pop(),
          fromCache: payloads.some(p => p.fromCache),
          refreshComplete: payloads.every(p => p.refreshComplete !== false),
          totalSymbols: multi ? mergedStocks.length : expectedTotal,
          warning: warnings.length ? warnings.join(' ') : undefined,
        });
      } catch (err) {
        if (cancelled) return;
        if (hadCachedStocks) return;
        setStocks(MOCK_STOCKS);
        setDataSource('mock');
        setDataWarning('Could not reach market API — using demo data.');
        setLoadError(err instanceof Error ? err.message : 'Load failed');
        setCacheLabel(null);
      }
    }

    loadMarketData();
    return () => { cancelled = true; };
  }, [universeSelection]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isHistorical = deferredDaysAgo > 0;
  const isTimelineStale = daysAgo !== deferredDaysAgo || isDatePending;

  const [snapshots, setSnapshots] = useState<Map<string, import('./types').StockSnapshot>>(
    () => new Map(),
  );
  const [snapshotsForDays, setSnapshotsForDays] = useState(0);

  useEffect(() => {
    invalidateSnapshotCache();
  }, [stocks]);

  useEffect(() => {
    if (stocks.length === 0) {
      setSnapshots(new Map());
      setSnapshotsForDays(0);
      return;
    }

    const days = deferredDaysAgo;
    const cached = peekSnapshotCache(stocks, days);
    if (cached) {
      setSnapshots(cached);
      setSnapshotsForDays(days);
      return;
    }

    const signal = { cancelled: false };

    void buildSnapshotsAsync(stocks, days, signal).then(built => {
      if (!signal.cancelled) {
        setSnapshots(built);
        setSnapshotsForDays(days);
      }
    });

    return () => {
      signal.cancelled = true;
    };
  }, [stocks, deferredDaysAgo]);

  const snapshotsReady = snapshotsForDays === deferredDaysAgo && snapshots.size > 0;
  const isSnapshotsStale = !snapshotsReady || isTimelineStale;

  const stocksTickerKey = useMemo(
    () => stocks.map(s => s.ticker).sort().join('\0'),
    [stocks],
  );

  if (snapshotsReady) {
    lastReadySnapshots.current = {
      daysAgo: deferredDaysAgo,
      map: snapshots,
      stocksKey: stocksTickerKey,
    };
  }

  const canUseStaleSnapshots =
    lastReadySnapshots.current.stocksKey === stocksTickerKey &&
    lastReadySnapshots.current.map.size > 0;

  const activeSnapshots = snapshotsReady
    ? snapshots
    : canUseStaleSnapshots
      ? lastReadySnapshots.current.map
      : EMPTY_SNAPSHOTS;
  const activeDaysAgo = snapshotsReady ? deferredDaysAgo : lastReadySnapshots.current.daysAgo;

  useEffect(() => {
    if (!isHistorical) {
      setReferenceTickers(new Set());
      setSortColumn('ticker');
      setSortDir('asc');
    } else {
      setSortColumn('returnToTodayPct');
      setSortDir('desc');
    }
  }, [isHistorical]);

  const todaySnapshots = useMemo(
    () => buildTodaySnapshots(stocks),
    [stocks],
  );

  const todayPatterns = useMemo(() => {
    const m = new Map<string, import('./similarity').PatternProfile>();
    for (const stock of stocks) {
      const momentum = priceMomentumProfile(stock, 0);
      if (!momentum) continue;
      const snap = todaySnapshots.get(stock.ticker);
      m.set(stock.ticker, {
        momentum,
        fundamentals: snap ? fundamentalProfileFromMetrics(snap) : null,
      });
    }
    return m;
  }, [stocks, todaySnapshots]);

  const referenceProfiles = useMemo(() => {
    return [...referenceTickers]
      .map(ticker => {
        const stock = stocks.find(s => s.ticker === ticker);
        if (!stock) return null;
        const momentum = priceMomentumProfile(stock, activeDaysAgo);
        if (!momentum) return null;
        const snapshot = activeSnapshots.get(ticker) ?? todaySnapshots.get(ticker);
        if (!snapshot) return null;
        return {
          stock,
          pattern: {
            momentum,
            fundamentals: fundamentalProfileFromMetrics(snapshot),
          },
          snapshot,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e != null);
  }, [referenceTickers, stocks, activeDaysAgo, activeSnapshots, todaySnapshots]);

  const showSimilarity = Boolean(isHistorical && referenceProfiles.length > 0);

  const similarityMap = useMemo(() => {
    if (!showSimilarity || referenceProfiles.length === 0) {
      return new Map<string, number>();
    }
    return similarityScoresToday(
      referenceProfiles.map(r => r.pattern),
      todayPatterns,
      referenceTickers,
    );
  }, [showSimilarity, referenceProfiles, todayPatterns, referenceTickers]);

  const topMatches = useMemo(() => {
    if (!showSimilarity || referenceProfiles.length === 0) return [];
    return rankSimilarityToday(
      referenceProfiles.map(r => r.pattern),
      todayPatterns,
      referenceTickers,
      12,
    );
  }, [showSimilarity, referenceProfiles, todayPatterns, referenceTickers]);

  const returnTargetDaysAgo = useMemo(
    () => targetDaysAgoFromPeriod(activeDaysAgo, deferredReturnPeriodDays),
    [activeDaysAgo, deferredReturnPeriodDays],
  );

  const patternFactorScreen = useMemo(
    () => screenerState.filterMode === 'code'
      && parsedExpressionUsesMomentum(screenerState.codeExpression),
    [screenerState.filterMode, screenerState.codeExpression],
  );

  const matchingSet = useMemo(() => {
    const snapMap = isHistorical ? activeSnapshots : todaySnapshots;
    const matched = stocks.filter(s => {
      const snap = snapMap.get(s.ticker);
      if (!snap) return false;
      const ctx = {
        returnToTodayPct: snap.returnToTodayPct,
        priceThen: snap.priceThen,
        returnToTargetPct:
          isHistorical && returnTargetDaysAgo < activeDaysAgo
            ? returnBetweenDaysAgo(s, activeDaysAgo, returnTargetDaysAgo) ?? undefined
            : undefined,
        similarity: showSimilarity ? similarityMap.get(s.ticker) : undefined,
        momentum: patternFactorScreen ? todayPatterns.get(s.ticker)?.momentum : undefined,
        todayMetrics: patternFactorScreen ? todaySnapshots.get(s.ticker) : undefined,
        patternFactorScreen,
      };
      return passesScreen(s, snap, screenerState, ctx);
    });
    return new Set(matched.map(s => s.ticker));
  }, [
    stocks,
    screenerState,
    isHistorical,
    activeSnapshots,
    todaySnapshots,
    returnTargetDaysAgo,
    activeDaysAgo,
    showSimilarity,
    similarityMap,
    todayPatterns,
    patternFactorScreen,
  ]);

  const backtest = useMemo(() => {
    if (!isHistorical) return null;
    return computeBacktest(stocks, activeSnapshots, matchingSet);
  }, [isHistorical, stocks, activeSnapshots, matchingSet]);

  const tableRows = useMemo(() => {
    const rows = stocks.flatMap(stock => {
      const snapshot =
        activeSnapshots.get(stock.ticker) ?? todaySnapshots.get(stock.ticker);
      if (!snapshot) return [];
      return [{
        stock,
        snapshot,
        visible: matchingSet.has(stock.ticker),
        similarity: showSimilarity ? similarityMap.get(stock.ticker) : undefined,
        returnToTargetPct:
          isHistorical && returnTargetDaysAgo < activeDaysAgo
            ? returnBetweenDaysAgo(stock, activeDaysAgo, returnTargetDaysAgo) ?? undefined
            : undefined,
      }];
    });
    return sortRows(rows, sortColumn, sortDir);
  }, [
    stocks,
    activeSnapshots,
    todaySnapshots,
    matchingSet,
    showSimilarity,
    similarityMap,
    sortColumn,
    sortDir,
    isHistorical,
    returnTargetDaysAgo,
    activeDaysAgo,
  ]);

  const displayRows = useMemo(() => {
    let rows =
      viewMode !== 'watchlist'
        ? tableRows
        : tableRows
            .filter(r => watchlist.activeTickers.has(r.stock.ticker))
            .map(r => ({ ...r, visible: true }));

    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter(r => {
      const ticker = r.stock.ticker.toLowerCase();
      const name = r.stock.companyName.toLowerCase();
      return ticker.includes(q) || name.includes(q);
    });
  }, [tableRows, viewMode, watchlist.activeTickers, searchQuery]);

  const searchActive = searchQuery.trim().length > 0;
  const shownCount = displayRows.length;

  const handleToggleWatchlist = useCallback(
    (ticker: string) => {
      watchlist.toggleTicker(ticker);
    },
    [watchlist],
  );

  const ensureWeeklyHistory = useCallback(async (ticker: string) => {
    const stock = stocksRef.current.find(s => s.ticker === ticker);
    if (!stock || stock.weeklyHistory?.length || dataSource === 'mock') return;
    try {
      const res = await fetch(
        `/api/stock-screener/weekly?symbols=${encodeURIComponent(ticker)}`,
      );
      if (!res.ok) return;
      const body = (await res.json()) as { results?: Record<string, Stock['weeklyHistory']> };
      const w = body.results?.[ticker];
      if (!w?.length) return;
      setStocks(prev =>
        prev.map(s => (s.ticker === ticker ? { ...s, weeklyHistory: w } : s)),
      );
    } catch {
      // ignore
    }
  }, [dataSource]);

  const handleSelectChart = useCallback((ticker: string) => {
    setSelectedChartTicker(ticker);
    setVisualViewMode('charts');
    void ensureWeeklyHistory(ticker);
  }, [ensureWeeklyHistory]);

  const handleSort = useCallback((col: TableColumnId) => {
    setSortColumn(prev => {
      if (prev === col) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(col === 'ticker' || col === 'companyName' || col === 'sector' ? 'asc' : 'desc');
      return col;
    });
  }, []);

  const handleSelectReference = useCallback(async (ticker: string) => {
    let stock = stocks.find(s => s.ticker === ticker);
    if (!stock) return;

    if (referenceTickers.has(ticker)) {
      setReferenceTickers(prev => {
        const next = new Set(prev);
        next.delete(ticker);
        return next;
      });
      return;
    }

    if (!stock.weeklyHistory?.length && dataSource !== 'mock') {
      setPatternLoading(prev => new Set(prev).add(ticker));
      try {
        const res = await fetch(
          `/api/stock-screener/weekly?symbol=${encodeURIComponent(ticker)}`,
        );
        if (!res.ok) {
          setDataWarning(
            `Could not load weekly prices for ${ticker}. Pattern match needs weekly history.`,
          );
          return;
        }
        const body = (await res.json()) as { weeklyHistory?: Stock['weeklyHistory'] };
        if (!body.weeklyHistory?.length) {
          setDataWarning(`No weekly price history for ${ticker}.`);
          return;
        }
        setStocks(prev =>
          prev.map(s =>
            s.ticker === ticker ? { ...s, weeklyHistory: body.weeklyHistory } : s,
          ),
        );
        stock = { ...stock, weeklyHistory: body.weeklyHistory };
      } catch {
        setDataWarning(`Failed to load weekly prices for ${ticker}.`);
        return;
      } finally {
        setPatternLoading(prev => {
          const next = new Set(prev);
          next.delete(ticker);
          return next;
        });
      }
    }

    if (!stock.weeklyHistory?.length) {
      setDataWarning('Weekly price history is required for pattern match.');
      return;
    }

    setReferenceTickers(prev => new Set(prev).add(ticker));
    setSortColumn('similarity');
    setSortDir('desc');
  }, [stocks, dataSource, referenceTickers]);

  const patternFactorPreview = useMemo(
    () => (referenceProfiles.length > 0
      ? buildPatternFactorFilter(referenceProfiles.map(r => r.pattern))
      : null),
    [referenceProfiles],
  );

  const patternFilterActive = Boolean(
    showSimilarity
    && patternFactorPreview
    && screenerState.filterMode === 'code'
    && screenerState.codeExpression.trim() === patternFactorPreview.expression,
  );

  const handleApplyPatternFilter = useCallback(() => {
    const built = buildPatternFactorFilter(referenceProfiles.map(r => r.pattern));
    if (!built) return;
    startFilterTransition(() => {
      setScreenerState(prev => ({
        ...prev,
        filterMode: 'code',
        codeExpression: built.expression,
      }));
      setVisualViewMode('table');
    });
    requestAnimationFrame(() => {
      document.getElementById('stock-screener-filters')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [referenceProfiles, startFilterTransition]);

  const exportColumns = useMemo(
    () => visibleColumns(isHistorical, showSimilarity, deferredReturnPeriodDays),
    [isHistorical, showSimilarity, deferredReturnPeriodDays],
  );

  const handleDownloadCsv = useCallback(() => {
    downloadScreenerCsv(displayRows, exportColumns, {
      filteredOnly: viewMode === 'watchlist' ? false : true,
      filename: screenerCsvFilename(
        deferredDaysAgo,
        viewMode === 'watchlist' ? watchlist.active.name : undefined,
        universeSelection,
      ),
    });
  }, [displayRows, exportColumns, deferredDaysAgo, viewMode, watchlist.active.name, universeSelection]);

  const universeLabel = selectionLabel(universeSelection);
  const matchCount = viewMode === 'watchlist' ? displayRows.length : matchingSet.size;
  const total = stocks.length;
  const weeklyReadyCount = useMemo(
    () => stocks.filter(s => s.weeklyHistory?.length).length,
    [stocks],
  );
  const activeFilters = enabledFilterCount(screenerState);
  const isLoading = dataSource === 'loading';

  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <Link href="/web-apps" className={styles.backLink}>← Web apps</Link>
        <div className={styles.brand}>
          <BarChart3 size={18} className={styles.brandIcon} />
          <span>Stock Screener</span>
        </div>
      </header>

      <DateTimeline
        daysAgo={daysAgo}
        onChange={setDaysAgoDeferred}
        returnPeriodDays={returnPeriodDays}
        onReturnPeriodChange={daysAgo > 0 ? setReturnPeriodDays : undefined}
      />

      {(isLoading || dataWarning || loadError) && (
        <div className={styles.dataBanner} role="status">
          {isLoading && (
            <span className={styles.dataBannerLoading}>
              <Loader2 size={14} className={styles.spinIcon} />
              Loading {universeLabel} data (weekly cache)…
            </span>
          )}
          {!isLoading && dataWarning && (
            <span className={styles.dataBannerWarn}>
              <AlertTriangle size={14} />
              {dataWarning}
            </span>
          )}
          {!isLoading && dataSource !== 'mock' && !dataWarning && (
            <span className={styles.dataBannerOk}>
              Live Finnhub data · {total}{totalSymbols ? ` / ${totalSymbols}` : ''} {universeLabel} · weekly refresh
              {cacheLabel ? ` · ${cacheLabel}` : ''}
            </span>
          )}
        </div>
      )}

      <div className={styles.layout}>
        <aside className={styles.sidebarColumn}>
          <WatchlistPanel
            viewMode={viewMode}
            universeSelection={universeSelection}
            onViewModeChange={setViewMode}
            onUniverseSelectionChange={setUniverseSelection}
            store={watchlist.store}
            active={watchlist.active}
            onSelectList={watchlist.setActiveId}
            onCreateList={watchlist.createList}
            onRenameList={watchlist.renameList}
            onDeleteList={watchlist.deleteList}
            onRemoveTicker={watchlist.removeTicker}
          />
        </aside>

        <main className={styles.main}>
          <FilterBar
            state={screenerState}
            onChange={setScreenerState}
            isHistorical={isHistorical}
          />

          <VisualViewTabs mode={visualViewMode} onChange={setVisualViewMode} />

          <div className={styles.resultsHeader}>
            <div>
              <h1 className={styles.resultsTitle}>
                {viewMode === 'watchlist'
                  ? `Watchlist: ${watchlist.active.name}`
                  : isHistorical
                    ? `Universe on ${formatAsOfDate(deferredDaysAgo)}`
                    : `${universeLabel} Universe`}
              </h1>
              <p className={styles.resultsSub}>
                {viewMode === 'watchlist'
                  ? 'All factors for your saved tickers — same columns as the full screener.'
                  : isHistorical
                    ? 'Weekly closing prices and returns since that date. Fundamentals use the latest fiscal report before that date. New listings show earliest available bar before IPO (*).'
                    : 'Live Finnhub snapshot — drag the timeline to explore up to 10 years back. Use Table / Charts / Sector / Compare tabs below filters.'}
                {viewMode === 'universe' && isHistorical && dataSource !== 'mock' && (
                  <> · Click ◉ to pick a pattern{weeklyReadyCount < total ? ' (weekly prices load on first click)' : ''}</>
                )}
                {viewMode === 'universe' && activeFilters > 0 && ` · ${activeFilters} filter${activeFilters !== 1 ? 's' : ''} active`}
                {isTimelineStale && (
                  <span className={styles.dateBarHint}> · updating…</span>
                )}
              </p>
            </div>
            <div className={styles.headerActions}>
              <div className={styles.searchBox}>
                <Search size={15} className={styles.searchIcon} aria-hidden />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search ticker or company…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label="Search stocks by ticker or company name"
                />
                {searchActive && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={handleDownloadCsv}
                disabled={isLoading || shownCount === 0}
                title="Download filtered results as CSV (raw numbers for spreadsheets)"
              >
                <Download size={14} />
                CSV
              </button>
              <div className={styles.countBadge} aria-live="polite">
                <span className={styles.countMatch}>{searchActive ? shownCount : matchCount}</span>
                <span className={styles.countSep}>/</span>
                <span className={styles.countTotal}>
                  {searchActive
                    ? viewMode === 'watchlist'
                      ? watchlist.active.tickers.length
                      : matchCount
                    : total}
                </span>
                <span className={styles.countLabel}>
                  {searchActive ? 'found' : viewMode === 'watchlist' ? 'stocks' : 'shown'}
                </span>
              </div>
            </div>
          </div>

          <BacktestPanel
            daysAgo={deferredDaysAgo}
            backtest={backtest}
            universeLabel={`${universeLabel} avg`}
            stocks={stocks}
            matchedTickers={matchingSet}
          />

          {showSimilarity && (
            <SimilarityPanel
              daysAgo={deferredDaysAgo}
              references={referenceProfiles}
              referencePatterns={referenceProfiles.map(r => r.pattern)}
              topMatches={topMatches}
              onClear={() => setReferenceTickers(new Set())}
              onApplyFilter={handleApplyPatternFilter}
              filterActive={patternFilterActive}
            />
          )}

          <div className={chartStyles.visualContent}>
            {visualViewMode === 'table' && (
              <StockTable
                rows={displayRows}
                isHistorical={isHistorical}
                showSimilarity={showSimilarity}
                returnPeriodDays={deferredReturnPeriodDays}
                referenceTickers={referenceTickers}
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={handleSort}
                onSelectReference={handleSelectReference}
                isLoading={isLoading || (stocks.length > 0 && tableRows.length === 0)}
                isUpdating={isSnapshotsStale && activeSnapshots.size > 0}
                patternLoading={patternLoading}
                watchlistTickers={watchlist.activeTickers}
                onToggleWatchlist={handleToggleWatchlist}
                selectedChartTicker={selectedChartTicker}
                onSelectChart={handleSelectChart}
              />
            )}

            {visualViewMode === 'charts' && !isLoading && (
              <ChartsView
                rows={displayRows}
                selectedTicker={selectedChartTicker}
                onSelectTicker={setSelectedChartTicker}
                daysAgo={deferredDaysAgo}
                onEnsureWeekly={ticker => void ensureWeeklyHistory(ticker)}
              />
            )}

            {visualViewMode === 'sector' && !isLoading && (
              <SectorView rows={displayRows} filteredOnly={viewMode !== 'watchlist'} />
            )}

            {visualViewMode === 'compare' && !isLoading && (
              <CompareView
                rows={displayRows}
                compareTickers={compareTickers}
                onCompareChange={setCompareTickers}
                daysAgo={deferredDaysAgo}
                stocks={stocks}
                matchedTickers={matchingSet}
                universeLabel={`${universeLabel} avg`}
              />
            )}

            {visualViewMode !== 'table' && isLoading && (
              <p className={chartStyles.viewEmpty}>Loading market data…</p>
            )}
          </div>

          {visualViewMode === 'table' && (
            <>
              {!isLoading && searchActive && shownCount === 0 && (
                <p className={styles.emptyState}>
                  No stocks match “{searchQuery.trim()}”. Try another ticker or company name.
                </p>
              )}

              {!isLoading && !searchActive && viewMode === 'watchlist' && watchlist.active.tickers.length === 0 && (
                <p className={styles.emptyState}>
                  This watchlist is empty. Switch to {universeLabel} and click ★ on any row to add stocks.
                </p>
              )}

              {!isLoading && !searchActive && viewMode === 'watchlist' && watchlist.active.tickers.length > 0 && displayRows.length === 0 && (
                <p className={styles.emptyState}>
                  Watchlist tickers aren’t in the current snapshot yet. They may appear after the weekly cache refresh.
                </p>
              )}

              {!isLoading && !searchActive && viewMode === 'universe' && matchCount === 0 && (
                <p className={styles.emptyState}>
                  No stocks match your filters{isHistorical ? ' at that date' : ''}. Widen ranges or disable filters.
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
