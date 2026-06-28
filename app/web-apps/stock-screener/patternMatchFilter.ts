import type { MomentumProfile } from './weeklyMomentum';
import {
  FUNDAMENTAL_SIMILARITY_KEYS,
  FUNDAMENTAL_WEIGHTS,
  MOMENTUM_WEIGHTS,
  SIMILARITY_KEYS,
  type FundamentalProfile,
  type FundamentalSimilarityKey,
  type PatternProfile,
  type SimilarityKey,
  type SimilarityMatch,
} from './similarity';

export interface PatternSimilarityFilterResult {
  expression: string;
  threshold: number;
  summary: string;
}

/**
 * Code filter that mirrors the similarity panel ? stocks must meet the same % match score.
 * Unlike factor bands, this uses the same ranking logic as the panel (relative distance, not raw ranges).
 */
export function buildPatternSimilarityFilter(
  topMatches: SimilarityMatch[],
  options?: { maxShown?: number; buffer?: number; floor?: number },
): PatternSimilarityFilterResult | null {
  const maxShown = options?.maxShown ?? 8;
  const buffer = options?.buffer ?? 3;
  const floor = options?.floor ?? 45;

  const scores = topMatches
    .slice(0, maxShown)
    .map(m => m.score)
    .filter((s): s is number => Number.isFinite(s));
  if (scores.length === 0) return null;

  const minShown = Math.min(...scores);
  const threshold = Math.max(floor, Math.floor(minShown - buffer));

  return {
    expression: `sim >= ${threshold}`,
    threshold,
    summary: `sim ? ${threshold}%`,
  };
}

export interface PatternFactorFilterResult {
  expression: string;
  factorCount: number;
  momentumCount: number;
  fundamentalCount: number;
  factors: string[];
  summary: string;
}

const TOP_MOMENTUM = 4;
const TOP_FUNDAMENTAL = 4;

function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function formatNum(v: number): string {
  const r = round(v, 1);
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function averageMomentum(references: PatternProfile[]): Partial<MomentumProfile> {
  const out: Partial<MomentumProfile> = {};
  for (const key of SIMILARITY_KEYS) {
    const vals = references
      .map(r => r.momentum[key])
      .filter((v): v is number => Number.isFinite(v));
    if (vals.length > 0) {
      out[key] = round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }
  return out;
}

function averageFundamentals(references: PatternProfile[]): FundamentalProfile {
  const out: FundamentalProfile = {};
  for (const key of FUNDAMENTAL_SIMILARITY_KEYS) {
    const vals = references
      .map(r => r.fundamentals?.[key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v !== 0);
    if (vals.length > 0) {
      out[key] = round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }
  return out;
}

function bandForFactor(key: string, ref: number): { min: number; max: number } | null {
  if (!Number.isFinite(ref)) return null;

  if (key === 'marketCap') {
    return {
      min: Math.max(0, round(ref * 0.35, 0)),
      max: round(ref * 2.5, 0),
    };
  }

  const ratioKeys = new Set([
    'peRatio', 'pegRatio', 'pbRatio', 'psRatio', 'debtToEquity', 'currentRatio',
  ]);
  if (ratioKeys.has(key)) {
    const margin = Math.max(0.8, Math.abs(ref) * 0.35);
    return {
      min: round(Math.max(0, ref - margin)),
      max: round(ref + margin),
    };
  }

  const margin = Math.max(4, Math.abs(ref) * 0.25);
  return { min: round(ref - margin), max: round(ref + margin) };
}

function rangeClause(field: string, min: number, max: number): string {
  return `${field} >= ${formatNum(min)} & ${field} <= ${formatNum(max)}`;
}

/**
 * Build a code filter from the reference pattern's weighted momentum + fundamental factors.
 * Bands are centered on the averaged reference values (same inputs as pattern similarity).
 */
export function buildPatternFactorFilter(
  references: PatternProfile[],
): PatternFactorFilterResult | null {
  if (references.length === 0) return null;

  const avgMomentum = averageMomentum(references);
  const avgFundamentals = averageFundamentals(references);

  const momentumFactors = SIMILARITY_KEYS
    .map(key => ({
      key,
      weight: MOMENTUM_WEIGHTS[key],
      value: avgMomentum[key],
    }))
    .filter((f): f is { key: SimilarityKey; weight: number; value: number } =>
      Number.isFinite(f.value),
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TOP_MOMENTUM);

  const fundamentalFactors = FUNDAMENTAL_SIMILARITY_KEYS
    .map(key => ({
      key,
      weight: FUNDAMENTAL_WEIGHTS[key],
      value: avgFundamentals[key],
    }))
    .filter((f): f is { key: FundamentalSimilarityKey; weight: number; value: number } =>
      Number.isFinite(f.value),
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TOP_FUNDAMENTAL);

  const clauses: string[] = [];
  const factors: string[] = [];
  let momentumCount = 0;
  let fundamentalCount = 0;

  for (const f of momentumFactors) {
    const band = bandForFactor(f.key, f.value);
    if (!band) continue;
    clauses.push(rangeClause(f.key, band.min, band.max));
    factors.push(f.key);
    momentumCount += 1;
  }

  for (const f of fundamentalFactors) {
    const band = bandForFactor(f.key, f.value);
    if (!band) continue;
    clauses.push(rangeClause(f.key, band.min, band.max));
    factors.push(f.key);
    fundamentalCount += 1;
  }

  if (clauses.length === 0) return null;

  return {
    expression: clauses.join(' & '),
    factorCount: clauses.length,
    momentumCount,
    fundamentalCount,
    factors,
    summary: `${momentumCount} momentum + ${fundamentalCount} fundamental factor bands`,
  };
}

/** Legacy / broken pattern filters from the old sim >= threshold approach. */
export function isLegacyPatternMatchExpression(expression: string): boolean {
  return /^sim\s*>=/i.test(expression.trim());
}
