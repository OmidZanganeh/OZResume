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
import { BarChart3, Loader2, AlertTriangle, Download } from 'lucide-react';
import FilterSidebar from './FilterSidebar';
import StockTable, { sortRows, type SortDir } from './StockTable';
import type { TableColumnId } from './tableColumns';
import DateTimeline from './DateTimeline';
import BacktestPanel from './BacktestPanel';
import SimilarityPanel from './SimilarityPanel';
import { MOCK_STOCKS } from './mockStocks';
import type { Stock } from './types';
import { passesScreen, DEFAULT_SCREENER_STATE, enabledFilterCount } from './filters';
import type { ScreenerState } from './filters';
import {
  buildTodaySnapshots,
  computeBacktest,
  formatAsOfDate,
  priceMomentumProfile,
} from './historical';
import {
  buildSnapshotsAsync,
  invalidateSnapshotCache,
  peekSnapshotCache,
} from './snapshotCache';
import { rankSimilarityToday, similarityScoresToday } from './similarity';
import { visibleColumns } from './tableColumns';
import { downloadScreenerCsv, screenerCsvFilename } from './exportCsv';
import {
  readSessionMarketCache,
  writeSessionMarketCache,
  formatCacheAge,
} from './clientCache';
import styles from './StockScreener.module.css';

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
  const [isDatePending, startDateTransition] = useTransition();
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

  useEffect(() => {
    let cancelled = false;

    function applyPayload(data: MarketPayload) {
      const list = Array.isArray(data.stocks) && data.stocks.length > 0
        ? data.stocks
        : MOCK_STOCKS;

      setStocks(list);
      setDataSource(data.source ?? 'mock');
      setDataWarning(data.warning ?? null);
      setTotalSymbols(data.totalSymbols);
      const age = formatCacheAge(data.cachedAt);
      setCacheLabel(
        data.source !== 'mock' && age
          ? `Snapshot from ${age}${data.fromCache ? ' (cached)' : ''}`
          : null,
      );
      writeSessionMarketCache(data);
    }

    let hadCachedStocks = false;

    async function loadMarketData() {
      const sessionHit = readSessionMarketCache();
      if (sessionHit && Array.isArray(sessionHit.stocks) && sessionHit.stocks.length > 0) {
        hadCachedStocks = true;
        applyPayload(sessionHit as MarketPayload);
        setDataSource((sessionHit.source as DataSource) ?? 'mock');
        setLoadError(null);
      } else {
        setDataSource('loading');
      }
      setLoadError(null);

      try {
        const res = await fetch('/api/stock-screener');
        if (!res.ok) throw new Error(`API error ${res.status}`);

        const data = (await res.json()) as MarketPayload;
        if (cancelled) return;
        applyPayload(data);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const lastReadySnapshots = useRef({
    daysAgo: 0,
    map: new Map<string, import('./types').StockSnapshot>(),
  });
  if (snapshotsReady) {
    lastReadySnapshots.current = { daysAgo: deferredDaysAgo, map: snapshots };
  }
  const activeSnapshots =
    snapshotsReady ? snapshots : lastReadySnapshots.current.map;
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

  const todayMetrics = useMemo(() => {
    const m = new Map<string, import('./weeklyMomentum').MomentumProfile>();
    for (const stock of stocks) {
      const profile = priceMomentumProfile(stock, 0);
      if (profile) m.set(stock.ticker, profile);
    }
    return m;
  }, [stocks]);

  const referenceProfiles = useMemo(() => {
    return [...referenceTickers]
      .map(ticker => {
        const stock = stocks.find(s => s.ticker === ticker);
        if (!stock) return null;
        const profile = priceMomentumProfile(stock, activeDaysAgo);
        if (!profile) return null;
        return { stock, profile, snapshot: activeSnapshots.get(ticker)! };
      })
      .filter((e): e is NonNullable<typeof e> => e != null);
  }, [referenceTickers, stocks, activeDaysAgo, activeSnapshots]);

  const showSimilarity = Boolean(isHistorical && referenceProfiles.length > 0);

  const similarityMap = useMemo(() => {
    if (!showSimilarity || referenceProfiles.length === 0) {
      return new Map<string, number>();
    }
    return similarityScoresToday(
      referenceProfiles.map(r => r.profile),
      todayMetrics,
      referenceTickers,
    );
  }, [showSimilarity, referenceProfiles, todayMetrics, referenceTickers]);

  const topMatches = useMemo(() => {
    if (!showSimilarity || referenceProfiles.length === 0) return [];
    return rankSimilarityToday(
      referenceProfiles.map(r => r.profile),
      todayMetrics,
      referenceTickers,
      12,
    );
  }, [showSimilarity, referenceProfiles, todayMetrics, referenceTickers]);

  const matchingSet = useMemo(() => {
    const matched = stocks.filter(s => {
      const todaySnap = todaySnapshots.get(s.ticker)!;
      return passesScreen(s, todaySnap, screenerState);
    });
    return new Set(matched.map(s => s.ticker));
  }, [stocks, screenerState, todaySnapshots]);

  const backtest = useMemo(() => {
    if (!isHistorical) return null;
    return computeBacktest(stocks, activeSnapshots, matchingSet);
  }, [isHistorical, stocks, activeSnapshots, matchingSet]);

  const tableRows = useMemo(() => {
    const rows = stocks.map(stock => ({
      stock,
      snapshot: activeSnapshots.get(stock.ticker)!,
      visible: matchingSet.has(stock.ticker),
      similarity: showSimilarity ? similarityMap.get(stock.ticker) : undefined,
    }));
    return sortRows(rows, sortColumn, sortDir);
  }, [stocks, activeSnapshots, matchingSet, showSimilarity, similarityMap, sortColumn, sortDir]);

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

  const handleSelectReference = useCallback((ticker: string) => {
    setReferenceTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
    setSortColumn('similarity');
    setSortDir('desc');
  }, []);

  const exportColumns = useMemo(
    () => visibleColumns(isHistorical, showSimilarity),
    [isHistorical, showSimilarity],
  );

  const handleDownloadCsv = useCallback(() => {
    downloadScreenerCsv(tableRows, exportColumns, {
      filteredOnly: true,
      filename: screenerCsvFilename(deferredDaysAgo),
    });
  }, [tableRows, exportColumns, deferredDaysAgo]);

  const matchCount = matchingSet.size;
  const total = stocks.length;
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

      <DateTimeline daysAgo={daysAgo} onChange={setDaysAgoDeferred} />

      {(isLoading || dataWarning || loadError) && (
        <div className={styles.dataBanner} role="status">
          {isLoading && (
            <span className={styles.dataBannerLoading}>
              <Loader2 size={14} className={styles.spinIcon} />
              Loading S&P 500 data (weekly cache)…
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
              Live Finnhub data · {total}{totalSymbols ? ` / ${totalSymbols}` : ''} S&P 500 · weekly refresh
              {cacheLabel ? ` · ${cacheLabel}` : ''}
            </span>
          )}
        </div>
      )}

      <div className={styles.layout}>
        <FilterSidebar
          state={screenerState}
          onChange={setScreenerState}
          isHistorical={isHistorical}
        />

        <main className={styles.main}>
          <div className={styles.resultsHeader}>
            <div>
              <h1 className={styles.resultsTitle}>
                {isHistorical ? `Universe on ${formatAsOfDate(deferredDaysAgo)}` : 'S&P 500 Universe'}
              </h1>
              <p className={styles.resultsSub}>
                {isHistorical
                  ? 'Weekly closing prices and returns since that date. Filters use today’s live fundamentals.'
                  : 'Live Finnhub snapshot — drag the timeline to explore up to 1 year back.'}
                {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters !== 1 ? 's' : ''} active`}
                {isTimelineStale && (
                  <span className={styles.dateBarHint}> · updating…</span>
                )}
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={handleDownloadCsv}
                disabled={isLoading || matchCount === 0}
                title="Download filtered results as CSV (raw numbers for spreadsheets)"
              >
                <Download size={14} />
                CSV
              </button>
              <div className={styles.countBadge} aria-live="polite">
                <span className={styles.countMatch}>{matchCount}</span>
                <span className={styles.countSep}>/</span>
                <span className={styles.countTotal}>{total}</span>
                <span className={styles.countLabel}>shown</span>
              </div>
            </div>
          </div>

          <BacktestPanel daysAgo={deferredDaysAgo} backtest={backtest} />

          {showSimilarity && (
            <SimilarityPanel
              daysAgo={deferredDaysAgo}
              references={referenceProfiles}
              topMatches={topMatches}
              onClear={() => setReferenceTickers(new Set())}
            />
          )}

          <StockTable
            rows={tableRows}
            isHistorical={isHistorical}
            showSimilarity={showSimilarity}
            referenceTickers={referenceTickers}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
            onSelectReference={handleSelectReference}
            isLoading={isLoading || (stocks.length > 0 && activeSnapshots.size === 0)}
            isUpdating={isSnapshotsStale && activeSnapshots.size > 0}
          />

          {!isLoading && matchCount === 0 && (
            <p className={styles.emptyState}>
              No stocks match your filters{isHistorical ? ' at that date' : ''}. Widen ranges or disable filters.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
