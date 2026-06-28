'use client';

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { BacktestSummary, Stock } from './types';
import { formatAsOfDate } from './timelineDate';
import { buildCumulativeBacktestSeries } from './charts/chartSeries';
import BacktestLineChart from './charts/BacktestLineChart';
import styles from './StockScreener.module.css';

interface Props {
  daysAgo: number;
  backtest: BacktestSummary | null;
  universeLabel?: string;
  stocks?: Stock[];
  matchedTickers?: Set<string>;
}

function fmtPct(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function BacktestPanel({
  daysAgo,
  backtest,
  universeLabel = 'Index avg',
  stocks = [],
  matchedTickers = new Set(),
}: Props) {
  const cumulative = useMemo(
    () => buildCumulativeBacktestSeries(stocks, daysAgo, matchedTickers),
    [stocks, daysAgo, matchedTickers],
  );

  if (daysAgo <= 0 || !backtest) return null;

  return (
    <section className={styles.backtestPanel} aria-label="Backtest summary">
      <div className={styles.backtestHead}>
        <TrendingUp size={16} />
        <p>
          Backtest from <strong>{formatAsOfDate(daysAgo)}</strong>
          {' '}— if you bought every stock matching your filters then, held to today:
        </p>
      </div>
      <div className={styles.backtestStats}>
        <div className={styles.backtestStat}>
          <span className={styles.backtestStatLabel}>Matched</span>
          <span>{backtest.matchedCount}</span>
        </div>
        <div className={styles.backtestStat}>
          <span className={styles.backtestStatLabel}>Avg return</span>
          <span className={backtest.matchedAvgReturn >= 0 ? styles.growthUp : styles.growthDown}>
            {fmtPct(backtest.matchedAvgReturn)}
          </span>
        </div>
        <div className={styles.backtestStat}>
          <span className={styles.backtestStatLabel}>{universeLabel}</span>
          <span>{fmtPct(backtest.universeAvgReturn)}</span>
        </div>
        <div className={styles.backtestStat}>
          <span className={styles.backtestStatLabel}>Alpha</span>
          <span className={
            backtest.alpha > 2 ? styles.growthUp
              : backtest.alpha < -2 ? styles.growthDown
                : styles.growthFlat
          }>
            {fmtPct(backtest.alpha)}
          </span>
        </div>
      </div>
      {cumulative.length > 1 && (
        <BacktestLineChart
          points={cumulative}
          universeLabel={universeLabel}
          height={220}
        />
      )}
    </section>
  );
}
