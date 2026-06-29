import type { WeeklyBar } from './types';

/** Chart indicators from weekly closes (newest bar first in `weeklyHistory`). */
export const TECHNICAL_INDICATOR_KEYS = [
  'rsi14',
  'macdLine',
  'macdSignal',
  'macdHist',
  'stochK',
  'stochD',
] as const;

export type TechnicalIndicatorKey = (typeof TECHNICAL_INDICATOR_KEYS)[number];

export interface TechnicalIndicators {
  rsi14: number;
  macdLine: number;
  macdSignal: number;
  macdHist: number;
  stochK: number;
  stochD: number;
}

function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function closesChronological(bars: WeeklyBar[]): number[] {
  return [...bars].reverse().map(b => b.c);
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i]!;
  out.push(sum / period);
  for (let i = period; i < values.length; i++) {
    const prev = out[out.length - 1]!;
    out.push(values[i]! * k + prev * (1 - k));
  }
  return out;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return round(100 - 100 / (1 + rs));
}

function macd(closes: number[]): { line: number; signal: number; hist: number } | null {
  if (closes.length < 35) return null;
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  if (ema12.length === 0 || ema26.length === 0) return null;

  const offset = ema12.length - ema26.length;
  const macdLineSeries: number[] = [];
  for (let i = 0; i < ema26.length; i++) {
    macdLineSeries.push(ema12[i + offset]! - ema26[i]!);
  }
  if (macdLineSeries.length < 9) return null;

  const signalSeries = emaSeries(macdLineSeries, 9);
  const line = macdLineSeries[macdLineSeries.length - 1]!;
  const signal = signalSeries[signalSeries.length - 1]!;
  return {
    line: round(line, 3),
    signal: round(signal, 3),
    hist: round(line - signal, 3),
  };
}

/** Close-only stochastic (weekly bars lack high/low). */
function stochastic(closes: number[], period = 14, smooth = 3): { k: number; d: number } | null {
  if (closes.length < period + smooth) return null;
  const kSeries: number[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    const window = closes.slice(i - period + 1, i + 1);
    const low = Math.min(...window);
    const high = Math.max(...window);
    const c = closes[i]!;
    kSeries.push(high === low ? 50 : ((c - low) / (high - low)) * 100);
  }
  if (kSeries.length < smooth) return null;
  const recentK = kSeries.slice(-smooth);
  const k = recentK[recentK.length - 1]!;
  const d = recentK.reduce((a, b) => a + b, 0) / recentK.length;
  return { k: round(k), d: round(d) };
}

export function computeTechnicalIndicators(bars: WeeklyBar[]): TechnicalIndicators | null {
  if (!bars.length) return null;
  const closes = closesChronological(bars);
  const rsi14 = rsi(closes);
  const macdVal = macd(closes);
  const stoch = stochastic(closes);
  if (rsi14 == null || macdVal == null || stoch == null) return null;

  return {
    rsi14,
    macdLine: macdVal.line,
    macdSignal: macdVal.signal,
    macdHist: macdVal.hist,
    stochK: stoch.k,
    stochD: stoch.d,
  };
}
