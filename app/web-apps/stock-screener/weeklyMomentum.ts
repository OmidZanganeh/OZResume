import type { Stock } from './types';
import { barIndexAtDaysAgo } from './weeklyLookup';

export interface MomentumProfile {
  priceChange4w: number;
  priceChange8w: number;
  priceChange13w: number;
  priceChange20w: number;
  priceChange26w: number;
  priceChange52w: number;
  priceVs52wHigh: number;
  priceVs52wLow: number;
  /** 4W return minus the prior 4W window (%). */
  returnAccel4w: number;
  /** Std dev of weekly % returns over trailing window. */
  realizedVol13w: number;
  realizedVol26w: number;
  /** Worst peak-to-trough drop over trailing window (%). */
  maxDrawdown26w: number;
  /** Price position between 26W low and high (0–100). */
  rangePosition26w: number;
  /** Share of positive weeks in trailing 13W (0–100). */
  positiveWeeksPct13w: number;
  /** Annualized log-trend slope over trailing window (%). */
  trendSlope13w: number;
  trendSlope26w: number;
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function returnOverWeeks(
  bars: { c: number }[],
  startIdx: number,
  weeksBack: number,
): number | null {
  const endIdx = startIdx + weeksBack;
  if (endIdx >= bars.length) return null;
  const pNow = bars[startIdx]!.c;
  const pPast = bars[endIdx]!.c;
  if (pPast <= 0) return null;
  return round(((pNow - pPast) / pPast) * 100, 1);
}

function rangeExtremes(
  bars: { c: number }[],
  startIdx: number,
  weeks: number,
): { high: number; low: number } | null {
  const endIdx = Math.min(startIdx + weeks, bars.length - 1);
  if (endIdx <= startIdx) return null;
  let high = -Infinity;
  let low = Infinity;
  for (let i = startIdx; i <= endIdx; i++) {
    const c = bars[i]!.c;
    if (c > high) high = c;
    if (c < low) low = c;
  }
  if (!Number.isFinite(high) || !Number.isFinite(low) || low <= 0) return null;
  return { high, low };
}

function weeklyPctReturns(
  bars: { c: number }[],
  startIdx: number,
  weekCount: number,
): number[] {
  const out: number[] = [];
  for (let w = 0; w < weekCount; w++) {
    const i = startIdx + w;
    const j = startIdx + w + 1;
    if (j >= bars.length) break;
    const newer = bars[i]!.c;
    const older = bars[j]!.c;
    if (older > 0) out.push(((newer - older) / older) * 100);
  }
  return out;
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function maxDrawdownPct(
  bars: { c: number }[],
  idx: number,
  weeks: number,
): number | null {
  const endIdx = idx + weeks;
  if (endIdx >= bars.length) return null;

  let peak = bars[endIdx]!.c;
  let maxDd = 0;
  for (let i = endIdx; i >= idx; i--) {
    const p = bars[i]!.c;
    if (p > peak) peak = p;
    if (peak > 0) {
      const dd = ((peak - p) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return round(maxDd, 1);
}

function rangePosition(
  price: number,
  low: number,
  high: number,
): number {
  if (high <= low) return 50;
  return round(((price - low) / (high - low)) * 100, 1);
}

function positiveWeeksPct(returns: number[]): number | null {
  if (returns.length === 0) return null;
  const positive = returns.filter(r => r > 0).length;
  return round((positive / returns.length) * 100, 1);
}

/** Annualized % trend from log-linear fit over weekly closes (newest-first index). */
function trendSlopeAnnualizedPct(
  bars: { c: number }[],
  startIdx: number,
  weeks: number,
): number | null {
  const endIdx = startIdx + weeks;
  if (endIdx >= bars.length) return null;

  const n = weeks + 1;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let k = 0; k < n; k++) {
    const c = bars[startIdx + k]!.c;
    if (c <= 0) return null;
    const x = weeks - k;
    const y = Math.log(c);
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slopePerWeek = (n * sumXY - sumX * sumY) / denom;
  return round((Math.exp(slopePerWeek * 52) - 1) * 100, 1);
}

/** Momentum from a pre-resolved weekly bar index (avoids duplicate bar scans). */
export function momentumFromBarIndex(
  bars: { c: number }[],
  idx: number,
): MomentumProfile | null {
  const price = bars[idx]!.c;
  const extremes52 = rangeExtremes(bars, idx, 52);
  const extremes26 = rangeExtremes(bars, idx, 26);

  const c4 = returnOverWeeks(bars, idx, 4);
  const c8 = returnOverWeeks(bars, idx, 8);
  const c13 = returnOverWeeks(bars, idx, 13);
  const c20 = returnOverWeeks(bars, idx, 20);
  const c26 = returnOverWeeks(bars, idx, 26);
  const c52 = returnOverWeeks(bars, idx, 52);
  if (c13 == null && c26 == null) return null;

  const prior4 = returnOverWeeks(bars, idx + 4, 4);
  const returns13 = weeklyPctReturns(bars, idx, 13);
  const returns26 = weeklyPctReturns(bars, idx, 26);
  const vol13 = stdDev(returns13);
  const vol26 = stdDev(returns26);
  const dd26 = maxDrawdownPct(bars, idx, 26);
  const pos13 = positiveWeeksPct(returns13);
  const slope13 = trendSlopeAnnualizedPct(bars, idx, 13);
  const slope26 = trendSlopeAnnualizedPct(bars, idx, 26);

  const high52 = extremes52?.high ?? price;
  const low52 = extremes52?.low ?? price;
  const low26 = extremes26?.low ?? price;
  const high26 = extremes26?.high ?? price;

  return {
    priceChange4w: c4 ?? 0,
    priceChange8w: c8 ?? c4 ?? 0,
    priceChange13w: c13 ?? c26 ?? 0,
    priceChange20w: c20 ?? c13 ?? c26 ?? 0,
    priceChange26w: c26 ?? c13 ?? 0,
    priceChange52w: c52 ?? c26 ?? c13 ?? 0,
    priceVs52wHigh: high52 > 0 ? round(((price - high52) / high52) * 100, 1) : 0,
    priceVs52wLow: low52 > 0 ? round(((price - low52) / low52) * 100, 1) : 0,
    returnAccel4w: c4 != null && prior4 != null ? round(c4 - prior4, 1) : 0,
    realizedVol13w: vol13 != null ? round(vol13, 1) : 0,
    realizedVol26w: vol26 != null ? round(vol26, 1) : 0,
    maxDrawdown26w: dd26 ?? 0,
    rangePosition26w: rangePosition(price, low26, high26),
    positiveWeeksPct13w: pos13 ?? 0,
    trendSlope13w: slope13 ?? 0,
    trendSlope26w: slope26 ?? 0,
  };
}

/** Real price momentum from weekly bars at a given date (0 = today). */
export function momentumAtDaysAgo(stock: Stock, daysAgo: number): MomentumProfile | null {
  const bars = stock.weeklyHistory;
  if (!bars?.length) return null;

  const idx = barIndexAtDaysAgo(bars, daysAgo);
  if (idx == null) return null;

  return momentumFromBarIndex(bars, idx);
}
