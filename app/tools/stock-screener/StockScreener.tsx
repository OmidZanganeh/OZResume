'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import FilterSidebar from './FilterSidebar';
import StockCard from './StockCard';
import DateTimeline from './DateTimeline';
import BacktestPanel from './BacktestPanel';
import { MOCK_STOCKS } from './mockStocks';
import type { Stock } from './types';
import { passesFilters } from './metricStyles';
import { buildAllSnapshots, computeBacktest, formatAsOfDate } from './historical';
import { DEFAULT_FILTERS } from './types';
import type { ScreenerFilters } from './types';
import styles from './StockScreener.module.css';

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
  const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [daysAgo, setDaysAgo] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('ticker');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isHistorical = daysAgo > 0;

  useEffect(() => {
    if (isHistorical && sortMode === 'ticker') setSortMode('return-desc');
    if (!isHistorical && (sortMode === 'return-desc' || sortMode === 'return-asc')) setSortMode('ticker');
  }, [isHistorical]); // eslint-disable-line react-hooks/exhaustive-deps -- only react to date mode change

  const snapshots = useMemo(
    () => buildAllSnapshots(MOCK_STOCKS, daysAgo),
    [daysAgo],
  );

  const matchingSet = useMemo(() => {
    const matched = MOCK_STOCKS.filter(s => passesFilters(snapshots.get(s.ticker)!, filters));
    return new Set(matched.map(s => s.ticker));
  }, [filters, snapshots]);

  const backtest = useMemo(() => {
    if (!isHistorical) return null;
    return computeBacktest(MOCK_STOCKS, snapshots, matchingSet);
  }, [isHistorical, snapshots, matchingSet]);

  const sortedStocks = useMemo(
    () => sortStocks(MOCK_STOCKS, sortMode, snapshots),
    [sortMode, snapshots],
  );

  const matchCount = matchingSet.size;
  const total = MOCK_STOCKS.length;

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

      <div className={styles.layout}>
        <FilterSidebar filters={filters} onChange={setFilters} isHistorical={isHistorical} />

        <main className={styles.main}>
          <div className={styles.resultsHeader}>
            <div>
              <h1 className={styles.resultsTitle}>
                {isHistorical ? `Matches on ${formatAsOfDate(daysAgo)}` : 'Matching Assets'}
              </h1>
              <p className={styles.resultsSub}>
                {isHistorical
                  ? 'Filters apply to past fundamentals — compare returns to today to test your screen'
                  : 'Adjust sliders to narrow the universe in real time'}
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
            {sortedStocks.map(stock => {
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
                />
              );
            })}
          </div>

          {matchCount === 0 && (
            <p className={styles.emptyState}>
              No stocks match your criteria{isHistorical ? ' at that date' : ''}. Try loosening one or more filters.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
