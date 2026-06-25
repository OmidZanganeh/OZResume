import type { StockMetrics } from './types';

/** Factors used to match a past winner profile to today's candidates. */
export const SIMILARITY_KEYS = [
  'peRatio',
  'pegRatio',
  'epsGrowth',
  'revenueGrowth',
  'roe',
  'profitMargin',
  'debtToEquity',
  'priceChange52w',
  'priceChange6m',
  'priceVs52wHigh',
  'beta',
  'volatility30d',
  'marketCap',
] as const satisfies readonly (keyof StockMetrics)[];

export type SimilarityKey = (typeof SIMILARITY_KEYS)[number];

const WEIGHTS: Record<SimilarityKey, number> = {
  peRatio: 0.9,
  pegRatio: 1.0,
  epsGrowth: 1.2,
  revenueGrowth: 1.0,
  roe: 0.85,
  profitMargin: 0.8,
  debtToEquity: 0.75,
  priceChange52w: 1.15,
  priceChange6m: 1.05,
  priceVs52wHigh: 1.0,
  beta: 0.65,
  volatility30d: 0.7,
  marketCap: 0.55,
};

export interface SimilarityMatch {
  ticker: string;
  score: number;
}

interface NormStats {
  min: number;
  max: number;
  log: boolean;
}

function featureValue(metrics: StockMetrics, key: SimilarityKey): number {
  const v = metrics[key];
  if (!Number.isFinite(v)) return 0;
  return v;
}

function buildNormStats(samples: StockMetrics[]): Record<SimilarityKey, NormStats> {
  const stats = {} as Record<SimilarityKey, NormStats>;
  for (const key of SIMILARITY_KEYS) {
    const log = key === 'marketCap';
    const raw = samples.map(s => {
      const v = featureValue(s, key);
      return log ? Math.log10(Math.max(v, 0.1)) : v;
    });
    stats[key] = {
      min: Math.min(...raw),
      max: Math.max(...raw),
      log,
    };
  }
  return stats;
}

function normalize(v: number, stat: NormStats): number {
  const x = stat.log ? Math.log10(Math.max(v, 0.1)) : v;
  if (stat.max <= stat.min) return 0.5;
  return (x - stat.min) / (stat.max - stat.min);
}

function vectorFromMetrics(
  metrics: StockMetrics,
  stats: Record<SimilarityKey, NormStats>,
): number[] {
  return SIMILARITY_KEYS.map(key => normalize(featureValue(metrics, key), stats[key]));
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
 * Compare one or more past-date reference profiles to today's universe.
 * Multiple references are averaged into a composite factor profile (centroid).
 * Returns similarity scores 0–100 (higher = closer match).
 */
export function similarityScoresToday(
  references: StockMetrics | StockMetrics[],
  todayByTicker: Map<string, StockMetrics>,
  excludeTickers: string | Iterable<string>,
): Map<string, number> {
  const refs = Array.isArray(references) ? references : [references];
  if (refs.length === 0) return new Map();

  const exclude = new Set(
    typeof excludeTickers === 'string' ? [excludeTickers] : excludeTickers,
  );

  const todayMetrics = [...todayByTicker.entries()]
    .filter(([t]) => !exclude.has(t))
    .map(([, m]) => m);

  if (todayMetrics.length === 0) return new Map();

  const stats = buildNormStats([...refs, ...todayMetrics]);
  const refVec = averageVectors(refs.map(r => vectorFromMetrics(r, stats)));
  const out = new Map<string, number>();

  for (const [ticker, metrics] of todayByTicker) {
    if (exclude.has(ticker)) continue;
    const candVec = vectorFromMetrics(metrics, stats);
    out.set(ticker, scoreFromVectors(refVec, candVec));
  }
  return out;
}

export function rankSimilarityToday(
  references: StockMetrics | StockMetrics[],
  todayByTicker: Map<string, StockMetrics>,
  excludeTickers: string | Iterable<string>,
  limit = 25,
): SimilarityMatch[] {
  const scores = similarityScoresToday(references, todayByTicker, excludeTickers);
  return [...scores.entries()]
    .map(([ticker, score]) => ({ ticker, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
