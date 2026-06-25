'use client';

import {
  useMemo,
  useState,
  useEffect,
  useDeferredValue,
  useTransition,
  useCallback,
} from 'react';
import Link from 'next/link';
import { BarChart3, Loader2, AlertTriangle } from 'lucide-react';
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
  buildAllSnapshots,
  buildTodaySnapshots,
  computeBacktest,
  formatAsOfDate,
} from './historical';
import { rankSimilarityToday, similarityScoresToday } from './similarity';
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

  const [referenceTicker, setReferenceTicker] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isHistorical) {
      setReferenceTicker(null);
      setSortColumn('ticker');
      setSortDir('asc');
    } else {
      setSortColumn('returnToTodayPct');
      setSortDir('desc');
    }
  }, [isHistorical]);

  const snapshots = useMemo(
    () => buildAllSnapshots(stocks, deferredDaysAgo),
    [stocks, deferredDaysAgo],
  );

  const todaySnapshots = useMemo(
    () => buildTodaySnapshots(stocks),
    [stocks],
  );

  const todayMetrics = useMemo(() => {
    const m = new Map<string, import('./types').StockMetrics>();
    for (const [ticker, snap] of todaySnapshots) {
      m.set(ticker, snap);
    }
    return m;
  }, [todaySnapshots]);

  const referenceSnapshot = referenceTicker ? snapshots.get(referenceTicker) : undefined;
  const showSimilarity = Boolean(isHistorical && referenceTicker && referenceSnapshot);

  const similarityMap = useMemo(() => {
    if (!showSimilarity || !referenceSnapshot || !referenceTicker) {
      return new Map<string, number>();
    }
    return similarityScoresToday(referenceSnapshot, todayMetrics, referenceTicker);
  }, [showSimilarity, referenceSnapshot, referenceTicker, todayMetrics]);

  const topMatches = useMemo(() => {
    if (!showSimilarity || !referenceSnapshot || !referenceTicker) return [];
    return rankSimilarityToday(referenceSnapshot, todayMetrics, referenceTicker, 12);
  }, [showSimilarity, referenceSnapshot, referenceTicker, todayMetrics]);

  const matchingSet = useMemo(() => {
    const matched = stocks.filter(s =>
      passesScreen(s, snapshots.get(s.ticker)!, screenerState),
    );
    return new Set(matched.map(s => s.ticker));
  }, [stocks, screenerState, snapshots]);

  const backtest = useMemo(() => {
    if (!isHistorical) return null;
    return computeBacktest(stocks, snapshots, matchingSet);
  }, [isHistorical, stocks, snapshots, matchingSet]);

  const tableRows = useMemo(() => {
    const rows = stocks.map(stock => ({
      stock,
      snapshot: snapshots.get(stock.ticker)!,
      visible: matchingSet.has(stock.ticker),
      similarity: showSimilarity ? similarityMap.get(stock.ticker) : undefined,
    }));
    return sortRows(rows, sortColumn, sortDir);
  }, [stocks, snapshots, matchingSet, showSimilarity, similarityMap, sortColumn, sortDir]);

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
    setReferenceTicker(prev => (prev === ticker ? null : ticker));
    if (ticker) {
      setSortColumn('similarity');
      setSortDir('desc');
    }
  }, []);

  const matchCount = matchingSet.size;
  const total = stocks.length;
  const activeFilters = enabledFilterCount(screenerState);
  const isLoading = dataSource === 'loading';
  const referenceStock = referenceTicker
    ? stocks.find(s => s.ticker === referenceTicker)
    : undefined;

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
                  ? 'All factors reflect the selected date. Pick a strong past performer (◉) to find similar setups today.'
                  : 'Live Finnhub snapshot — drag the timeline to explore up to 1 year back.'}
                {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters !== 1 ? 's' : ''} active`}
                {isTimelineStale && (
                  <span className={styles.dateBarHint}> · updating…</span>
                )}
              </p>
            </div>
            <div className={styles.countBadge} aria-live="polite">
              <span className={styles.countMatch}>{matchCount}</span>
              <span className={styles.countSep}>/</span>
              <span className={styles.countTotal}>{total}</span>
              <span className={styles.countLabel}>shown</span>
            </div>
          </div>

          <BacktestPanel daysAgo={deferredDaysAgo} backtest={backtest} />

          {showSimilarity && referenceStock && referenceSnapshot && (
            <SimilarityPanel
              daysAgo={deferredDaysAgo}
              reference={referenceStock}
              referenceSnapshot={referenceSnapshot}
              topMatches={topMatches}
              onClear={() => setReferenceTicker(null)}
            />
          )}

          <StockTable
            rows={tableRows}
            isHistorical={isHistorical}
            showSimilarity={showSimilarity}
            referenceTicker={referenceTicker}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
            onSelectReference={handleSelectReference}
            isLoading={isLoading}
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
