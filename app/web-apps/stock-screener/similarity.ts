import type { MomentumProfile } from './weeklyMomentum';

/** Real weekly price-momentum factors only. */
export const SIMILARITY_KEYS = [
  'priceChange4w',
  'priceChange13w',
  'priceChange26w',
  'priceChange52w',
  'priceVs52wHigh',
  'priceVs52wLow',
] as const satisfies readonly (keyof MomentumProfile)[];

export type SimilarityKey = (typeof SIMILARITY_KEYS)[number];

const WEIGHTS: Record<SimilarityKey, number> = {
  priceChange4w: 0.85,
  priceChange13w: 1.1,
  priceChange26w: 1.05,
  priceChange52w: 1.15,
  priceVs52wHigh: 1.0,
  priceVs52wLow: 0.75,
};

export interface SimilarityMatch {
  ticker: string;
  score: number;
}

interface NormStats {
  min: number;
  max: number;
}

function buildNormStats(samples: MomentumProfile[]): Record<SimilarityKey, NormStats> {
  const stats = {} as Record<SimilarityKey, NormStats>;
  for (const key of SIMILARITY_KEYS) {
    const raw = samples.map(s => s[key]);
    stats[key] = { min: Math.min(...raw), max: Math.max(...raw) };
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

function scoreFromVectors(refVec: number[], candVec: number[]): number {
  let dist = 0;
  let weightSum = 0;
  for (let i = 0; i < SIMILARITY_KEYS.length; i++) {
    const key = SIMILARITY_KEYS[i]!;
    const w = WEIGHTS[key];
    const d = refVec[i]! - candVec[i]!;
    dist += w * d * d;
    weightSum += w;
  }
  const rms = Math.sqrt(dist / Math.max(weightSum, 1));
  return Math.round(Math.max(0, Math.min(100, (1 - rms * 1.35) * 100)) * 10) / 10;
}

/**
 * Compare past-date momentum (from weekly bars) to today's weekly-derived momentum.
 */
export function similarityScoresToday(
  references: MomentumProfile | MomentumProfile[],
  todayByTicker: Map<string, MomentumProfile>,
  excludeTickers: string | Iterable<string>,
): Map<string, number> {
  const refs = Array.isArray(references) ? references : [references];
  if (refs.length === 0) return new Map();

  const exclude = new Set(
    typeof excludeTickers === 'string' ? [excludeTickers] : excludeTickers,
  );

  const todayProfiles = [...todayByTicker.entries()]
    .filter(([t]) => !exclude.has(t))
    .map(([, m]) => m);

  if (todayProfiles.length === 0) return new Map();

  const stats = buildNormStats([...refs, ...todayProfiles]);
  const refVec = averageVectors(refs.map(r => vectorFromProfile(r, stats)));
  const out = new Map<string, number>();

  for (const [ticker, profile] of todayByTicker) {
    if (exclude.has(ticker)) continue;
    out.set(ticker, scoreFromVectors(refVec, vectorFromProfile(profile, stats)));
  }
  return out;
}

export function rankSimilarityToday(
  references: MomentumProfile | MomentumProfile[],
  todayByTicker: Map<string, MomentumProfile>,
  excludeTickers: string | Iterable<string>,
  limit = 25,
): SimilarityMatch[] {
  const scores = similarityScoresToday(references, todayByTicker, excludeTickers);
  return [...scores.entries()]
    .map(([ticker, score]) => ({ ticker, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
