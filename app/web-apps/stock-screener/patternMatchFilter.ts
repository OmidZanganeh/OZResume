import type { SimilarityMatch } from './similarity';

/** Number of candidates shown in the pattern match panel. */
export const PATTERN_MATCH_PANEL_SIZE = 8;

export interface PatternMatchFilterResult {
  expression: string;
  threshold: number;
  /** Stocks in the ranked list that meet the threshold. */
  matchCount: number;
}

function finiteScores(matches: SimilarityMatch[]): number[] {
  return matches
    .map(m => m.score)
    .filter((s): s is number => Number.isFinite(s));
}

/**
 * Build a code filter that keeps stocks similar to the active pattern reference(s).
 * Threshold is set just below the lowest score among the displayed top matches
 * so every candidate in the panel passes.
 */
export function buildPatternMatchFilter(
  topMatches: SimilarityMatch[],
  panelSize = PATTERN_MATCH_PANEL_SIZE,
): PatternMatchFilterResult | null {
  const withScores = topMatches.filter(m => Number.isFinite(m.score));
  const shown = withScores.slice(0, panelSize);
  if (shown.length === 0) return null;

  const minShown = Math.min(...shown.map(m => m.score));
  if (!Number.isFinite(minShown)) return null;

  // Integer threshold one point below the weakest shown match (scores are 0–100).
  let threshold = Math.floor(minShown) - 1;
  if (threshold < 0) threshold = 0;
  if (threshold > 99) threshold = 99;

  const matchCount = withScores.filter(m => m.score >= threshold).length;

  return {
    expression: `sim >= ${threshold}`,
    threshold,
    matchCount,
  };
}

/** True when a code expression looks like a broken pattern-match filter. */
export function isBrokenPatternMatchExpression(expression: string): boolean {
  return /sim\s*>=\s*NaN/i.test(expression.trim());
}
