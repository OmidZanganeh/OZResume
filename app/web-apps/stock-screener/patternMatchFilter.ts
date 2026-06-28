import type { SimilarityMatch } from './similarity';

/** Number of candidates shown in the pattern match panel. */
export const PATTERN_MATCH_PANEL_SIZE = 8;

export interface PatternMatchFilterResult {
  expression: string;
  threshold: number;
  /** Stocks in the ranked list that meet the threshold. */
  matchCount: number;
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
  const shown = topMatches.slice(0, panelSize);
  if (shown.length === 0) return null;

  const minShown = Math.min(...shown.map(m => m.score));
  const threshold = Math.max(50, Math.min(99, Math.floor(minShown) - 1));
  const matchCount = topMatches.filter(m => m.score >= threshold).length;

  return {
    expression: `sim >= ${threshold}`,
    threshold,
    matchCount,
  };
}
