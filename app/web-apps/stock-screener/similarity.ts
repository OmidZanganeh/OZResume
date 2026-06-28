import type { StockMetrics } from './types';
import type { MomentumProfile } from './weeklyMomentum';
import { HISTORICAL_FUNDAMENTAL_IDS } from './fundamentalMetrics';

/** Weekly price factors — derivable from cached weekly closes at past + today dates. */
export const SIMILARITY_KEYS = [
  'priceChange4w',
  'priceChange8w',
  'priceChange13w',
  'priceChange20w',
  'priceChange26w',
  'priceChange52w',
  'priceVs52wHigh',
  'priceVs52wLow',
  'returnAccel4w',
  'realizedVol13w',
  'realizedVol26w',
  'maxDrawdown26w',
  'rangePosition26w',
  'positiveWeeksPct13w',
  'trendSlope13w',
  'trendSlope26w',
] as const satisfies readonly (keyof MomentumProfile)[];

export type SimilarityKey = (typeof SIMILARITY_KEYS)[number];

/** Fundamental factors available from fiscal history + price (past date) or live snapshot (today). */
export const FUNDAMENTAL_SIMILARITY_KEYS = HISTORICAL_FUNDAMENTAL_IDS;

export type FundamentalSimilarityKey = (typeof FUNDAMENTAL_SIMILARITY_KEYS)[number];

export type FundamentalProfile = Partial<Pick<StockMetrics, FundamentalSimilarityKey>>;

export interface PatternProfile {
  momentum: MomentumProfile;
  fundamentals: FundamentalProfile | null;
}

export const MOMENTUM_WEIGHTS: Record<SimilarityKey, number> = {
  priceChange4w: 0.85,
  priceChange8w: 0.9,
  priceChange13w: 1.1,
  priceChange20w: 1.0,
  priceChange26w: 1.05,
  priceChange52w: 1.15,
  priceVs52wHigh: 1.0,
  priceVs52wLow: 0.75,
  returnAccel4w: 0.95,
  realizedVol13w: 0.85,
  realizedVol26w: 0.8,
  maxDrawdown26w: 0.9,
  rangePosition26w: 0.95,
  positiveWeeksPct13w: 0.7,
  trendSlope13w: 1.0,
  trendSlope26w: 1.05,
};

export const FUNDAMENTAL_WEIGHTS: Record<FundamentalSimilarityKey, number> = {
  peRatio: 1.0,
  pegRatio: 0.85,
  pbRatio: 0.9,
  psRatio: 0.85,
  marketCap: 0.5,
  epsGrowth: 0.95,
  revenueGrowth: 0.95,
  profitMargin: 1.0,
  grossMargin: 0.85,
  operatingMargin: 0.95,
  roe: 1.0,
  roa: 0.85,
  debtToEquity: 0.9,
  debtToAssets: 0.8,
  currentRatio: 0.75,
  freeCashFlowYield: 0.9,
};

/** Blend when both momentum and fundamentals are available for reference + candidate. */
const FUNDAMENTAL_BLEND = 0.38;

export interface SimilarityMatch {
  ticker: string;
  score: number;
}

interface NormStats {
  min: number;
  max: number;
}

function isValidFundamentalValue(key: FundamentalSimilarityKey, v: number): boolean {
  if (!Number.isFinite(v) || v === 0) return false;
  if (key === 'marketCap' && v <= 0) return false;
  return true;
}

export function fundamentalProfileFromMetrics(metrics: StockMetrics): FundamentalProfile | null {
  const out: FundamentalProfile = {};
  let count = 0;
  for (const key of FUNDAMENTAL_SIMILARITY_KEYS) {
    const v = metrics[key];
    if (typeof v === 'number' && isValidFundamentalValue(key, v)) {
      out[key] = v;
      count++;
    }
  }
  return count >= 4 ? out : null;
}

function buildNormStats<T extends string>(
  keys: readonly T[],
  samples: Record<T, number>[],
): Record<T, NormStats> {
  const stats = {} as Record<T, NormStats>;
  for (const key of keys) {
    const raw = samples.map(s => s[key]).filter(v => Number.isFinite(v));
    if (raw.length === 0) {
      stats[key] = { min: 0, max: 1 };
    } else {
      stats[key] = { min: Math.min(...raw), max: Math.max(...raw) };
    }
  }
  return stats;
}

function normalize(v: number, stat: NormStats): number {
  if (stat.max <= stat.min) return 0.5;
  return (v - stat.min) / (stat.max - stat.min);
}

function vectorFromProfile(
  profile: MomentumProfile,
  stats: Record<SimilarityKey, NormStats>,
): number[] {
  return SIMILARITY_KEYS.map(key => normalize(profile[key], stats[key]));
}

function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const len = vectors[0]!.length;
  const out = new Array<number>(len).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < len; i++) out[i]! += vec[i]!;
  }
  for (let i = 0; i < len; i++) out[i]! /= vectors.length;
  return out;
}

function scoreFromWeightedDistance(
  refVec: number[],
  candVec: number[],
  weights: number[],
): number {
  let dist = 0;
  let weightSum = 0;
  for (let i = 0; i < refVec.length; i++) {
    const w = weights[i] ?? 1;
    const d = refVec[i]! - candVec[i]!;
    dist += w * d * d;
    weightSum += w;
  }
  const rms = Math.sqrt(dist / Math.max(weightSum, 1));
  return Math.round(Math.max(0, Math.min(100, (1 - rms * 1.35) * 100)) * 10) / 10;
}

function scoreMomentum(
  refProfiles: MomentumProfile[],
  candProfile: MomentumProfile,
  pool: MomentumProfile[],
): number {
  const stats = buildNormStats(SIMILARITY_KEYS, [...refProfiles, ...pool]);
  const refVec = averageVectors(refProfiles.map(r => vectorFromProfile(r, stats)));
  const weights = SIMILARITY_KEYS.map(k => MOMENTUM_WEIGHTS[k]);
  return scoreFromWeightedDistance(refVec, vectorFromProfile(candProfile, stats), weights);
}

function activeFundamentalKeys(
  refs: FundamentalProfile[],
  cand: FundamentalProfile,
): FundamentalSimilarityKey[] {
  const refKeys = new Set<FundamentalSimilarityKey>();
  for (const ref of refs) {
    for (const key of FUNDAMENTAL_SIMILARITY_KEYS) {
      const v = ref[key];
      if (typeof v === 'number' && isValidFundamentalValue(key, v)) refKeys.add(key);
    }
  }
  return FUNDAMENTAL_SIMILARITY_KEYS.filter(key => {
    if (!refKeys.has(key)) return false;
    const v = cand[key];
    return typeof v === 'number' && isValidFundamentalValue(key, v);
  });
}

function scoreFundamentals(
  refProfiles: FundamentalProfile[],
  candProfile: FundamentalProfile,
  pool: FundamentalProfile[],
): number | null {
  const keys = activeFundamentalKeys(refProfiles, candProfile);
  if (keys.length < 3) return null;

  const samples = [...refProfiles, ...pool].map(p =>
    Object.fromEntries(keys.map(k => [k, p[k] ?? 0])) as Record<
      FundamentalSimilarityKey,
      number
    >,
  );
  const stats = buildNormStats(keys, samples);

  const refVec = averageVectors(
    refProfiles.map(ref =>
      keys.map(k => normalize(ref[k]!, stats[k])),
    ),
  );
  const candVec = keys.map(k => normalize(candProfile[k]!, stats[k]));
  const weights = keys.map(k => FUNDAMENTAL_WEIGHTS[k]);

  return scoreFromWeightedDistance(refVec, candVec, weights);
}

function blendScores(momentum: number, fundamental: number | null): number {
  if (fundamental == null) return momentum;
  const blended = momentum * (1 - FUNDAMENTAL_BLEND) + fundamental * FUNDAMENTAL_BLEND;
  return Math.round(blended * 10) / 10;
}

/**
 * Compare past-date pattern (momentum + fundamentals) to today's profiles.
 */
export function similarityScoresToday(
  references: PatternProfile | PatternProfile[],
  todayByTicker: Map<string, PatternProfile>,
  excludeTickers: string | Iterable<string>,
): Map<string, number> {
  const refs = Array.isArray(references) ? references : [references];
  if (refs.length === 0) return new Map();

  const exclude = new Set(
    typeof excludeTickers === 'string' ? [excludeTickers] : excludeTickers,
  );

  const todayEntries = [...todayByTicker.entries()].filter(([t]) => !exclude.has(t));
  if (todayEntries.length === 0) return new Map();

  const refMomentum = refs.map(r => r.momentum);
  const refFundamentals = refs.map(r => r.fundamentals).filter((f): f is FundamentalProfile => f != null);
  const momentumPool = todayEntries.map(([, p]) => p.momentum);
  const fundamentalPool = todayEntries
    .map(([, p]) => p.fundamentals)
    .filter((f): f is FundamentalProfile => f != null);

  const out = new Map<string, number>();

  for (const [ticker, profile] of todayEntries) {
    const momentumScore = scoreMomentum(refMomentum, profile.momentum, momentumPool);
    const fundamentalScore =
      refFundamentals.length > 0 && profile.fundamentals
        ? scoreFundamentals(refFundamentals, profile.fundamentals, fundamentalPool)
        : null;
    out.set(ticker, blendScores(momentumScore, fundamentalScore));
  }

  return out;
}

export function rankSimilarityToday(
  references: PatternProfile | PatternProfile[],
  todayByTicker: Map<string, PatternProfile>,
  excludeTickers: string | Iterable<string>,
  limit = 25,
): SimilarityMatch[] {
  const scores = similarityScoresToday(references, todayByTicker, excludeTickers);
  return [...scores.entries()]
    .map(([ticker, score]) => ({ ticker, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Best match vs any single reference (not blended average).
 * Selective when references are diverse — e.g. many historical winners.
 */
export function similarityScoresTodayBestReference(
  references: PatternProfile | PatternProfile[],
  todayByTicker: Map<string, PatternProfile>,
  excludeTickers: string | Iterable<string>,
): Map<string, number> {
  const refs = Array.isArray(references) ? references : [references];
  if (refs.length === 0) return new Map();

  const merged = new Map<string, number>();
  for (const ref of refs) {
    const scores = similarityScoresToday(ref, todayByTicker, excludeTickers);
    for (const [ticker, score] of scores) {
      merged.set(ticker, Math.max(merged.get(ticker) ?? 0, score));
    }
  }
  return merged;
}

export function rankSimilarityTodayBestReference(
  references: PatternProfile | PatternProfile[],
  todayByTicker: Map<string, PatternProfile>,
  excludeTickers: string | Iterable<string>,
  limit = 25,
): SimilarityMatch[] {
  const scores = similarityScoresTodayBestReference(references, todayByTicker, excludeTickers);
  return [...scores.entries()]
    .map(([ticker, score]) => ({ ticker, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Drop weak tail — keep matches near the top score and above a floor. */
export function filterSimilarityMatches(
  matches: SimilarityMatch[],
  options?: { minAbsolute?: number; maxBelowTop?: number; maxResults?: number },
): { matches: SimilarityMatch[]; cutoff: number } {
  const minAbsolute = options?.minAbsolute ?? 58;
  const maxBelowTop = options?.maxBelowTop ?? 10;
  const maxResults = options?.maxResults ?? 20;

  if (matches.length === 0) return { matches: [], cutoff: minAbsolute };

  const sorted = [...matches].sort((a, b) => b.score - a.score);
  const top = sorted[0]!.score;
  const cutoff = Math.max(minAbsolute, top - maxBelowTop);
  return {
    cutoff,
    matches: sorted.filter(m => m.score >= cutoff).slice(0, maxResults),
  };
}
