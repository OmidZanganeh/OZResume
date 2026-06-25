'use client';

import { Crosshair, Sparkles } from 'lucide-react';
import type { StockSnapshot } from './types';
import type { SimilarityMatch } from './similarity';
import { formatAsOfDate } from './timelineDate';
import styles from './StockScreener.module.css';

export interface ReferenceEntry {
  stock: import('./types').Stock;
  profile: import('./weeklyMomentum').MomentumProfile;
  snapshot: StockSnapshot;
}

interface Props {
  daysAgo: number;
  references: ReferenceEntry[];
  topMatches: SimilarityMatch[];
  onClear: () => void;
}

function fmtReturn(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function SimilarityPanel({
  daysAgo,
  references,
  topMatches,
  onClear,
}: Props) {
  if (daysAgo <= 0 || references.length === 0 || topMatches.length === 0) return null;

  const multi = references.length > 1;

  return (
    <section className={styles.similarityPanel} aria-label="Pattern similarity">
      <div className={styles.similarityHead}>
        <Sparkles size={16} />
        <div>
          <h2 className={styles.similarityTitle}>Price momentum match — candidates today</h2>
          <p className={styles.similaritySub}>
            {multi ? (
              <>
                <strong>{references.length} references</strong> on {formatAsOfDate(daysAgo)}
                {' '}— blended weekly momentum from:
              </>
            ) : (
              <>
                Reference: <strong>{references[0]!.stock.ticker}</strong> on {formatAsOfDate(daysAgo)}
                {references[0]!.snapshot.priceThen > 0 && (
                  <>
                    {' '}(${references[0]!.snapshot.priceThen.toFixed(2)} → ${references[0]!.stock.price.toFixed(2)},
                    {' '}{fmtReturn(references[0]!.snapshot.returnToTodayPct)} since then)
                  </>
                )}
                .
              </>
            )}
            {' '}Stocks below have the <strong>closest weekly price momentum today</strong>
            {multi ? ' to that blended past pattern' : ' to that past pattern'}.
          </p>
        </div>
        <button type="button" className={styles.similarityClear} onClick={onClear}>
          Clear {multi ? 'patterns' : 'pattern'}
        </button>
      </div>

      {multi && (
        <div className={styles.referenceChips}>
          {references.map(({ stock, snapshot }) => (
            <span key={stock.ticker} className={styles.referenceChip}>
              <strong>{stock.ticker}</strong>
              <span>{fmtReturn(snapshot.returnToTodayPct)}</span>
            </span>
          ))}
        </div>
      )}

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
        Uses real weekly returns (4w / 13w / 26w / 52w) and distance from 52w high/low only.
        {' '}Not investment advice — verify before trading.
      </p>
    </section>
  );
}
