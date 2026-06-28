'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, Copy, Crosshair, Sparkles } from 'lucide-react';
import type { StockSnapshot } from './types';
import type { PatternProfile, SimilarityMatch } from './similarity';
import { buildPatternFactorFilter } from './patternMatchFilter';
import { formatAsOfDate } from './timelineDate';
import { yahooQuoteUrl } from './yahooFinanceUrl';
import styles from './StockScreener.module.css';

export interface ReferenceEntry {
  stock: import('./types').Stock;
  pattern: PatternProfile;
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
  const [copied, setCopied] = useState(false);

  const patternFilter = useMemo(
    () => buildPatternFactorFilter(references.map(r => r.pattern)),
    [references],
  );

  const handleCopyFilter = useCallback(async () => {
    if (!patternFilter) return;
    try {
      await navigator.clipboard.writeText(patternFilter.expression);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers or denied permission
      const ta = document.createElement('textarea');
      ta.value = patternFilter.expression;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [patternFilter]);

  if (daysAgo <= 0 || references.length === 0 || topMatches.length === 0) return null;

  const multi = references.length > 1;

  return (
    <section className={styles.similarityPanel} aria-label="Pattern similarity">
      <div className={styles.similarityHead}>
        <Sparkles size={16} />
        <div>
          <h2 className={styles.similarityTitle}>Pattern match — candidates today</h2>
          <p className={styles.similaritySub}>
            {multi ? (
              <>
                <strong>{references.length} references</strong> on {formatAsOfDate(daysAgo)}
                {' '}— blended weekly momentum and fundamentals from:
              </>
            ) : (
              <>
                Reference:{' '}
                <a
                  href={yahooQuoteUrl(references[0]!.stock.ticker)}
                  className={styles.tickerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <strong>{references[0]!.stock.ticker}</strong>
                </a>{' '}
                on {formatAsOfDate(daysAgo)}
                {references[0]!.snapshot.priceThen > 0 && (
                  <>
                    {' '}(${references[0]!.snapshot.priceThen.toFixed(2)} → ${references[0]!.stock.price.toFixed(2)},
                    {' '}{fmtReturn(references[0]!.snapshot.returnToTodayPct)} since then)
                  </>
                )}
                .
              </>
            )}
            {' '}Stocks below have the <strong>closest weekly price momentum and fundamentals today</strong>
            {multi ? ' to that blended past pattern' : ' to that past pattern'}.
          </p>
        </div>
        <div className={styles.similarityActions}>
          {patternFilter && (
            <button
              type="button"
              className={`${styles.similarityCopyFilter} ${copied ? styles.similarityCopyFilterDone : ''}`}
              onClick={() => void handleCopyFilter()}
              title={patternFilter.expression}
            >
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copied ? 'Copied!' : 'Copy pattern filter'}
              <code className={styles.similarityCopyFilterCode}>{patternFilter.summary}</code>
            </button>
          )}
          <button type="button" className={styles.similarityClear} onClick={onClear}>
            Clear {multi ? 'patterns' : 'pattern'}
          </button>
        </div>
      </div>

      {multi && (
        <div className={styles.referenceChips}>
          {references.map(({ stock, snapshot }) => (
            <span key={stock.ticker} className={styles.referenceChip}>
              <a
                href={yahooQuoteUrl(stock.ticker)}
                className={styles.tickerLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{stock.ticker}</strong>
              </a>
              <span>{fmtReturn(snapshot.returnToTodayPct)}</span>
            </span>
          ))}
        </div>
      )}

      <div className={styles.similarityGrid}>
        {topMatches.slice(0, 8).map((m, i) => (
          <div key={m.ticker} className={styles.similarityCard}>
            <span className={styles.similarityRank}>#{i + 1}</span>
            <a
              href={yahooQuoteUrl(m.ticker)}
              className={`${styles.similarityTicker} ${styles.tickerLink}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {m.ticker}
            </a>
            <span className={styles.similarityScore}>
              {Number.isFinite(m.score) ? `${m.score.toFixed(0)}% match` : '—'}
            </span>
          </div>
        ))}
      </div>

      <p className={styles.similarityFoot}>
        <Crosshair size={12} />
        Compares weekly price action (returns, volatility, drawdown, trend) plus fundamentals
        (P/E, margins, ROE, growth, leverage, FCF yield) from the past pattern to today’s values.
        Copy pattern filter to paste into Code mode — it won’t auto-apply.
        {' '}Not investment advice — verify before trading.
      </p>
    </section>
  );
}
