'use client';

import { Crosshair, Sparkles } from 'lucide-react';
import type { Stock, StockSnapshot } from './types';
import type { SimilarityMatch } from './similarity';
import { formatAsOfDate } from './historical';
import styles from './StockScreener.module.css';

interface Props {
  daysAgo: number;
  reference: Stock;
  referenceSnapshot: StockSnapshot;
  topMatches: SimilarityMatch[];
  onClear: () => void;
}

function fmtReturn(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function SimilarityPanel({
  daysAgo,
  reference,
  referenceSnapshot,
  topMatches,
  onClear,
}: Props) {
  if (daysAgo <= 0 || topMatches.length === 0) return null;

  return (
    <section className={styles.similarityPanel} aria-label="Pattern similarity">
      <div className={styles.similarityHead}>
        <Sparkles size={16} />
        <div>
          <h2 className={styles.similarityTitle}>Pattern match — buy candidates today</h2>
          <p className={styles.similaritySub}>
            Reference: <strong>{reference.ticker}</strong> on {formatAsOfDate(daysAgo)}
            {' '}(${referenceSnapshot.priceThen.toFixed(2)} → ${reference.price.toFixed(2)},
            {' '}{fmtReturn(referenceSnapshot.returnToTodayPct)} since then).
            Stocks below have the <strong>closest factor profile today</strong> to that past setup.
          </p>
        </div>
        <button type="button" className={styles.similarityClear} onClick={onClear}>
          Clear pattern
        </button>
      </div>

      <div className={styles.similarityGrid}>
        {topMatches.slice(0, 8).map((m, i) => (
          <div key={m.ticker} className={styles.similarityCard}>
            <span className={styles.similarityRank}>#{i + 1}</span>
            <span className={styles.similarityTicker}>{m.ticker}</span>
            <span className={styles.similarityScore}>{m.score.toFixed(0)}% match</span>
          </div>
        ))}
      </div>

      <p className={styles.similarityFoot}>
        <Crosshair size={12} />
        Similarity weights valuation, growth, momentum, volatility, and size. Not investment advice — verify before trading.
      </p>
    </section>
  );
}
