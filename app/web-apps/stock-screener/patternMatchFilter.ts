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
 * Quick code filter ? same % ranking as the similarity panel (not editable factor bands).
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
  factors: string[];
  summary: string;
}

const TOP_MOMENTUM = 4;
const TOP_FUNDAMENTAL = 4;

type FactorKey = SimilarityKey | FundamentalSimilarityKey;

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

/** Bands that include panel candidates so the copied code filter matches visible matches. */
function inclusiveBandForFactor(
  key: FactorKey,
  ref: number,
  candidates: PatternProfile[],
): { min: number; max: number } | null {
  const refBand = refBandForFactor(key, ref);
  if (!refBand) return null;

  const vals = factorValuesFromProfiles(candidates, key);
  if (vals.length === 0) return refBand;

  const candMin = Math.min(...vals);
  const candMax = Math.max(...vals);
  const span = Math.max(candMax - candMin, 1);
  const pad = Math.max(3, span * 0.2, Math.abs(candMax) * 0.06);

  const refFarFromCandidates =
    ref < candMin - span * 1.5 || ref > candMax + span * 1.5;

  if (refFarFromCandidates) {
    return {
      min: round(candMin - pad),
      max: round(candMax + pad),
    };
  }

  return {
    min: round(Math.min(refBand.min, candMin - pad)),
    max: round(Math.max(refBand.max, candMax + pad)),
  };
}

function rangeClause(field: string, min: number, max: number): string {
  return `${field} >= ${formatNum(min)} & ${field} <= ${formatNum(max)}`;
}

function formatEditableExpression(clauses: string[]): string {
  return clauses.join(' &\n');
}

/**
 * Build an editable code filter from weighted momentum + fundamental factors.
 * When `candidates` (today's panel matches) are passed, bands expand to include them
 * so Apply in Code mode shows roughly the same stocks ? each line is one factor you can edit.
 */
export function buildPatternFactorFilter(
  references: PatternProfile[],
  candidates: PatternProfile[] = [],
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
    const band = candidates.length > 0
      ? inclusiveBandForFactor(f.key, f.value, candidates)
      : refBandForFactor(f.key, f.value);
    if (!band) continue;
    clauses.push(rangeClause(f.key, band.min, band.max));
    factors.push(f.key);
    momentumCount += 1;
  }

  for (const f of fundamentalFactors) {
    const band = candidates.length > 0
      ? inclusiveBandForFactor(f.key, f.value, candidates)
      : refBandForFactor(f.key, f.value);
    if (!band) continue;
    clauses.push(rangeClause(f.key, band.min, band.max));
    factors.push(f.key);
    fundamentalCount += 1;
  }

  if (clauses.length === 0) return null;

  return {
    expression: formatEditableExpression(clauses),
    factorCount: clauses.length,
    momentumCount,
    fundamentalCount,
    factors,
    summary: `${momentumCount} momentum + ${fundamentalCount} fundamentals`,
  };
}

/** Legacy / broken pattern filters from the old sim >= threshold approach. */
export function isLegacyPatternMatchExpression(expression: string): boolean {
  return /^sim\s*>=/i.test(expression.trim());
}
