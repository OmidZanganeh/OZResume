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
 * Single-line code filter using the same % ranking as the similarity panel.
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
    summary: `sim >= ${threshold}%`,
  };
}

export interface PatternFactorFilterResult {
  expression: string;
  factorCount: number;
  momentumCount: number;
  fundamentalCount: number;
  simThreshold: number | null;
  factors: string[];
  summary: string;
}

const TOP_MOMENTUM = 3;
const TOP_FUNDAMENTAL = 2;
const CANDIDATE_CHECK = 5;

type FactorKey = SimilarityKey | FundamentalSimilarityKey;

const NON_NEGATIVE_KEYS = new Set([
  'peRatio', 'pegRatio', 'pbRatio', 'psRatio', 'marketCap', 'currentRatio',
]);

const SEMANTIC_CEIL: Partial<Record<string, number>> = {
  roe: 80,
  roa: 40,
  profitMargin: 60,
  grossMargin: 80,
  operatingMargin: 50,
  peRatio: 120,
  pbRatio: 25,
  psRatio: 40,
  pegRatio: 4,
  debtToEquity: 5,
};

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

function factorValuesFromProfiles(profiles: PatternProfile[], key: FactorKey): number[] {
  const isMomentum = (SIMILARITY_KEYS as readonly string[]).includes(key);
  return profiles
    .map(p => (isMomentum ? p.momentum[key as SimilarityKey] : p.fundamentals?.[key as FundamentalSimilarityKey]))
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

function refBandForFactor(key: string, ref: number): { min: number; max: number } | null {
  if (!Number.isFinite(ref)) return null;

  if (key === 'marketCap') {
    return {
      min: Math.max(0, round(ref * 0.5, 0)),
      max: round(ref * 1.8, 0),
    };
  }

  const ratioKeys = new Set([
    'peRatio', 'pegRatio', 'pbRatio', 'psRatio', 'debtToEquity', 'currentRatio',
  ]);
  if (ratioKeys.has(key)) {
    if (NON_NEGATIVE_KEYS.has(key) && ref < 0) return null;
    const margin = Math.max(0.5, Math.abs(ref) * 0.2);
    return {
      min: round(NON_NEGATIVE_KEYS.has(key) ? Math.max(0, ref - margin) : ref - margin),
      max: round(ref + margin),
    };
  }

  if (key.startsWith('trendSlope')) {
    const margin = Math.min(15, Math.max(4, Math.abs(ref) * 0.2));
    return { min: round(ref - margin), max: round(ref + margin) };
  }

  if (key.startsWith('priceChange') || key.startsWith('returnAccel') || key.startsWith('realizedVol')) {
    const margin = Math.min(12, Math.max(4, Math.abs(ref) * 0.15));
    return { min: round(ref - margin), max: round(ref + margin) };
  }

  const margin = Math.min(10, Math.max(3, Math.abs(ref) * 0.18));
  return { min: round(ref - margin), max: round(ref + margin) };
}

function clampBandSemantics(key: string, band: { min: number; max: number }): { min: number; max: number } {
  let { min, max } = band;
  if (NON_NEGATIVE_KEYS.has(key)) min = Math.max(0, min);
  const ceil = SEMANTIC_CEIL[key];
  if (ceil != null) max = Math.min(ceil, max);
  if (min > max) return { min: max, max: min };
  return { min: round(min), max: round(max) };
}

function bandIncludesAnyValue(band: { min: number; max: number }, values: number[]): boolean {
  return values.some(v => v >= band.min && v <= band.max);
}

function rangeClause(field: string, min: number, max: number): string {
  return `${field} >= ${formatNum(min)} & ${field} <= ${formatNum(max)}`;
}

function formatEditableExpression(clauses: string[]): string {
  return clauses.join(' &\n');
}

export interface BuildPatternFactorFilterOptions {
  /** Top panel matches ? used to skip factors that don't explain visible candidates. */
  candidates?: PatternProfile[];
  /** When set, prepends `sim >= N` (same ranking as the panel). */
  topMatches?: SimilarityMatch[];
}

/**
 * Editable code filter: `sim >= N` plus tight bands around the reference pattern.
 * Factor lines are omitted when a tight reference band wouldn't include any top candidate
 * (similarity blends many metrics ? raw min/max across matches produces nonsense ranges).
 */
export function buildPatternFactorFilter(
  references: PatternProfile[],
  options: BuildPatternFactorFilterOptions = {},
): PatternFactorFilterResult | null {
  if (references.length === 0) return null;

  const candidates = options.candidates ?? [];
  const simResult = options.topMatches?.length
    ? buildPatternSimilarityFilter(options.topMatches)
    : null;

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

  if (simResult) {
    clauses.push(`sim >= ${simResult.threshold}`);
    factors.push('sim');
  }

  const checkCandidates = candidates.slice(0, CANDIDATE_CHECK);

  for (const f of momentumFactors) {
    const raw = refBandForFactor(f.key, f.value);
    if (!raw) continue;
    const band = clampBandSemantics(f.key, raw);
    if (checkCandidates.length > 0) {
      const vals = factorValuesFromProfiles(checkCandidates, f.key);
      if (vals.length > 0 && !bandIncludesAnyValue(band, vals)) continue;
    }
    clauses.push(rangeClause(f.key, band.min, band.max));
    factors.push(f.key);
    momentumCount += 1;
  }

  for (const f of fundamentalFactors) {
    const raw = refBandForFactor(f.key, f.value);
    if (!raw) continue;
    const band = clampBandSemantics(f.key, raw);
    if (checkCandidates.length > 0) {
      const vals = factorValuesFromProfiles(checkCandidates, f.key);
      if (vals.length > 0 && !bandIncludesAnyValue(band, vals)) continue;
    }
    clauses.push(rangeClause(f.key, band.min, band.max));
    factors.push(f.key);
    fundamentalCount += 1;
  }

  if (clauses.length === 0) return null;

  const simThreshold = simResult?.threshold ?? null;
  const summaryParts: string[] = [];
  if (simThreshold != null) summaryParts.push(`sim >= ${simThreshold}%`);
  if (momentumCount + fundamentalCount > 0) {
    summaryParts.push(`${momentumCount}m + ${fundamentalCount}f`);
  }

  return {
    expression: formatEditableExpression(clauses),
    factorCount: clauses.length,
    momentumCount,
    fundamentalCount,
    simThreshold,
    factors,
    summary: summaryParts.join(' ? '),
  };
}

/** Detect sim-only pattern filters (no factor bands). */
export function isSimOnlyPatternExpression(expression: string): boolean {
  const trimmed = expression.trim();
  return /^sim\s*>=/i.test(trimmed) && !/\b(priceChange|trendSlope|peRatio|roe|profitMargin)\b/i.test(trimmed);
}
