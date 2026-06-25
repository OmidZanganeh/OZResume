import type { Stock } from './types';
import { barIndexAtDaysAgo } from './weeklyLookup';

export interface MomentumProfile {
  priceChange4w: number;
  priceChange13w: number;
  priceChange26w: number;
  priceChange52w: number;
  priceVs52wHigh: number;
  priceVs52wLow: number;
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

/** Momentum from a pre-resolved weekly bar index (avoids duplicate bar scans). */
export function momentumFromBarIndex(
  bars: { c: number }[],
  idx: number,
): MomentumProfile | null {
  const price = bars[idx]!.c;
  const extremes = rangeExtremes(bars, idx, 52);

  const c4 = returnOverWeeks(bars, idx, 4);
  const c13 = returnOverWeeks(bars, idx, 13);
  const c26 = returnOverWeeks(bars, idx, 26);
  const c52 = returnOverWeeks(bars, idx, 52);
  if (c13 == null && c26 == null) return null;

  const high = extremes?.high ?? price;
  const low = extremes?.low ?? price;

  return {
    priceChange4w: c4 ?? 0,
    priceChange13w: c13 ?? c26 ?? 0,
    priceChange26w: c26 ?? c13 ?? 0,
    priceChange52w: c52 ?? c26 ?? c13 ?? 0,
    priceVs52wHigh: high > 0 ? round(((price - high) / high) * 100, 1) : 0,
    priceVs52wLow: low > 0 ? round(((price - low) / low) * 100, 1) : 0,
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
