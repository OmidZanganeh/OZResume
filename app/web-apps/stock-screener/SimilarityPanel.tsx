'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, Copy, Crosshair, Sparkles } from 'lucide-react';
import type { StockSnapshot } from './types';
import type { PatternProfile, SimilarityMatch } from './similarity';
import {
  buildPatternFactorFilter,
  buildPatternSimilarityFilter,
} from './patternMatchFilter';
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
  candidatePatterns: PatternProfile[];
  topMatches: SimilarityMatch[];
  onClear: () => void;
}

function fmtReturn(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export default function SimilarityPanel({
  daysAgo,
  references,
  candidatePatterns,
  topMatches,
  onClear,
}: Props) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSim, setCopiedSim] = useState(false);

  const codeFilter = useMemo(
    () => buildPatternFactorFilter(
      references.map(r => r.pattern),
      { candidates: candidatePatterns, topMatches },
    ),
    [references, candidatePatterns, topMatches],
  );

  const similarityFilter = useMemo(
    () => buildPatternSimilarityFilter(topMatches),
    [topMatches],
  );

  const handleCopyCode = useCallback(async () => {
    if (!codeFilter) return;
    await copyText(codeFilter.expression);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  }, [codeFilter]);

  const handleCopySimilarity = useCallback(async () => {
    if (!similarityFilter) return;
    await copyText(similarityFilter.expression);
    setCopiedSim(true);
    window.setTimeout(() => setCopiedSim(false), 2000);
  }, [similarityFilter]);

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
          {codeFilter && (
            <button
              type="button"
              className={`${styles.similarityCopyFilter} ${copiedCode ? styles.similarityCopyFilterDone : ''}`}
              onClick={() => void handleCopyCode()}
              title="sim threshold + tight reference factor bands — edit or delete lines before Apply"
            >
              {copiedCode ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copiedCode ? 'Copied!' : 'Copy code filter'}
              <code className={styles.similarityCopyFilterCode}>{codeFilter.summary}</code>
            </button>
          )}
          {similarityFilter && (
            <button
              type="button"
              className={`${styles.similarityCopyFilterSecondary} ${copiedSim ? styles.similarityCopyFilterDone : ''}`}
              onClick={() => void handleCopySimilarity()}
              title={`${similarityFilter.expression} — quick match, not editable per factor`}
            >
              {copiedSim ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copiedSim ? 'Copied!' : similarityFilter.summary}
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
        <strong>Copy code filter</strong> starts with <code>sim ≥ N</code> (same ranking as this panel),
        then adds tight bands around the reference pattern — not min/max across all candidates.
        Widen or delete lines before Apply in Code mode.
        The secondary button copies <code>sim</code> only.
        {' '}Not investment advice — verify before trading.
      </p>
    </section>
  );
}
