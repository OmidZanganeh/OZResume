'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import FilterSidebar from './FilterSidebar';
import StockCard from './StockCard';
import DateTimeline from './DateTimeline';
import BacktestPanel from './BacktestPanel';
import { MOCK_STOCKS } from './mockStocks';
import { SCREEN_TICKERS } from './tickers';
import type { Stock } from './types';
import { passesScreen, DEFAULT_SCREENER_STATE, enabledFilterCount } from './filters';
import type { ScreenerState } from './filters';
import { buildAllSnapshots, computeBacktest, formatAsOfDate } from './historical';
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
  warning?: string;
}

export type SortMode =
  | 'ticker'
  | 'return-desc'
  | 'return-asc'
  | 'pe-asc'
  | 'eps-desc';

export const SORT_OPTIONS: { id: SortMode; label: string; historical?: boolean }[] = [
  { id: 'ticker', label: 'Ticker A–Z' },
  { id: 'return-desc', label: 'Return ↓ best', historical: true },
  { id: 'return-asc', label: 'Return ↑ worst', historical: true },
  { id: 'pe-asc', label: 'P/E low → high' },
  { id: 'eps-desc', label: 'EPS growth high → low' },
];

function sortStocks(
  stocks: Stock[],
  sortMode: SortMode,
  snapshots: ReturnType<typeof buildAllSnapshots>,
): Stock[] {
  const list = [...stocks];
  switch (sortMode) {
    case 'return-desc':
      return list.sort((a, b) =>
        snapshots.get(b.ticker)!.returnToTodayPct - snapshots.get(a.ticker)!.returnToTodayPct,
      );
    case 'return-asc':
      return list.sort((a, b) =>
        snapshots.get(a.ticker)!.returnToTodayPct - snapshots.get(b.ticker)!.returnToTodayPct,
      );
    case 'pe-asc':
      return list.sort((a, b) =>
        snapshots.get(a.ticker)!.peRatio - snapshots.get(b.ticker)!.peRatio,
      );
    case 'eps-desc':
      return list.sort((a, b) =>
        snapshots.get(b.ticker)!.epsGrowth - snapshots.get(a.ticker)!.epsGrowth,
      );
    default:
      return list.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }
}

export default function StockScreener() {
  const [screenerState, setScreenerState] = useState<ScreenerState>(DEFAULT_SCREENER_STATE);
  const [daysAgo, setDaysAgo] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('ticker');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>('loading');
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cacheLabel, setCacheLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function applyPayload(data: MarketPayload) {
      const list = Array.isArray(data.stocks) && data.stocks.length > 0
        ? data.stocks
          : MOCK_STOCKS;

        setStocks(list);
      setDataSource(data.source ?? 'mock');
      setDataWarning(data.warning ?? null);
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
        // Still revalidate in background without blocking UI
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
        const fallback = MOCK_STOCKS;
        setStocks(fallback.length > 0 ? fallback : MOCK_STOCKS);
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

  const isHistorical = daysAgo > 0;
  const { rsiPeriod } = screenerState;

  useEffect(() => {
    if (isHistorical && sortMode === 'ticker') setSortMode('return-desc');
    if (!isHistorical && (sortMode === 'return-desc' || sortMode === 'return-asc')) setSortMode('ticker');
  }, [isHistorical]); // eslint-disable-line react-hooks/exhaustive-deps

  const snapshots = useMemo(
    () => buildAllSnapshots(stocks, daysAgo, rsiPeriod),
    [stocks, daysAgo, rsiPeriod],
  );

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

  const sortedStocks = useMemo(
    () => sortStocks(stocks, sortMode, snapshots),
    [stocks, sortMode, snapshots],
  );

  const matchCount = matchingSet.size;
  const total = stocks.length;
  const activeFilters = enabledFilterCount(screenerState);
  const isLoading = dataSource === 'loading';

  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <Link href="/tools" className={styles.backLink}>← Tools</Link>
        <div className={styles.brand}>
          <BarChart3 size={18} className={styles.brandIcon} />
          <span>Stock Screener</span>
        </div>
      </header>

      <DateTimeline daysAgo={daysAgo} onChange={setDaysAgo} />

      {(isLoading || dataWarning || loadError) && (
        <div className={styles.dataBanner} role="status">
          {isLoading && (
            <span className={styles.dataBannerLoading}>
              <Loader2 size={14} className={styles.spinIcon} />
              Loading live market data ({SCREEN_TICKERS.length} stocks across 5 sectors, weekly refresh)…
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
              Live data via {dataSource === 'finnhub' ? 'Finnhub' : 'FMP'} · {total} stocks · weekly refresh
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
                {isHistorical ? `Matches on ${formatAsOfDate(daysAgo)}` : 'Matching Assets'}
              </h1>
              <p className={styles.resultsSub}>
                {activeFilters === 0
                  ? 'No filters active — showing all stocks. Enable filters in the sidebar.'
                  : isHistorical
                    ? `${activeFilters} filter${activeFilters !== 1 ? 's' : ''} on past data · RSI(${rsiPeriod})`
                    : `${activeFilters} active filter${activeFilters !== 1 ? 's' : ''} · RSI(${rsiPeriod})`}
              </p>
            </div>
            <div className={styles.countBadge} aria-live="polite">
              <span className={styles.countMatch}>{matchCount}</span>
              <span className={styles.countSep}>/</span>
              <span className={styles.countTotal}>{total}</span>
              <span className={styles.countLabel}>assets</span>
            </div>
          </div>

          <BacktestPanel daysAgo={daysAgo} backtest={backtest} />

          <div className={styles.sortBar}>
            <span className={styles.sortLabel}>Sort by</span>
            <div className={styles.sortOptions}>
              {SORT_OPTIONS.filter(o => !o.historical || isHistorical).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.sortBtn} ${sortMode === opt.id ? styles.sortBtnActive : ''}`}
                  onClick={() => setSortMode(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.grid} role="list">
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={styles.cardSkeleton} aria-hidden />
              ))
            ) : (
              sortedStocks.map(stock => {
                const snap = snapshots.get(stock.ticker)!;
                return (
                  <StockCard
                    key={stock.ticker}
                    stock={stock}
                    metrics={snap}
                    visible={matchingSet.has(stock.ticker)}
                    isHistorical={isHistorical}
                    returnToTodayPct={snap.returnToTodayPct}
                    priceThen={snap.priceThen}
                    rsiPeriod={rsiPeriod}
                  />
                );
              })
            )}
          </div>

          {!isLoading && matchCount === 0 && (
            <p className={styles.emptyState}>
              No stocks match{activeFilters > 0 ? ' your active filters' : ''}
              {isHistorical ? ' at that date' : ''}. Try enabling fewer filters or widening ranges.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
