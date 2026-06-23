'use client';

import { TrendingDown, TrendingUp, Target } from 'lucide-react';
import type { BacktestSummary } from './types';
import { formatAsOfDate } from './historical';
import styles from './StockScreener.module.css';

interface Props {
  daysAgo: number;
  backtest: BacktestSummary | null;
}

function fmtPct(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function BacktestPanel({ daysAgo, backtest }: Props) {
  if (daysAgo <= 0 || !backtest) return null;

  const { matchedCount, matchedAvgReturn, universeAvgReturn, alpha } = backtest;
  const alphaGood = alpha > 0;

  return (
    <div className={styles.backtestPanel}>
      <div className={styles.backtestHead}>
        <Target size={16} />
        <span>
          Backtest from <strong>{formatAsOfDate(daysAgo)}</strong>
          {matchedCount > 0
            ? <> — {matchedCount} stock{matchedCount !== 1 ? 's' : ''} would have passed your filters</>
            : <> — no stocks match at that date</>
          }
        </span>
      </div>

      {matchedCount > 0 && (
        <div className={styles.backtestStats}>
          <div className={styles.backtestStat}>
            <span className={styles.backtestStatLabel}>Matched avg return</span>
            <span className={matchedAvgReturn >= 0 ? styles.statUp : styles.statDown}>
              {matchedAvgReturn >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {fmtPct(matchedAvgReturn)}
            </span>
          </div>
          <div className={styles.backtestStat}>
            <span className={styles.backtestStatLabel}>All stocks avg</span>
            <span className={universeAvgReturn >= 0 ? styles.statUp : styles.statDown}>
              {fmtPct(universeAvgReturn)}
            </span>
          </div>
          <div className={styles.backtestStat}>
            <span className={styles.backtestStatLabel}>Filter edge (α)</span>
            <span className={alphaGood ? styles.statUp : styles.statDown}>
              {fmtPct(alpha)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
