import type { Stock, StockMetrics, StockSnapshot, BacktestSummary } from './types';
import type { FilterId } from './filters';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function tickerSeed(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  return h;
}

/** Drift a metric backward in time with deterministic noise (fundamentals at past dates). */
function hist(
  base: number,
  years: number,
  s: number,
  returnBias: number,
  scale: number,
  min: number,
  max: number,
  decimals: number,
): number {
  const noise = ((s % 13) / 13 - 0.5) * scale;
  return round(clamp(base - years * (returnBias * scale + noise), min, max), decimals);
}

const METRIC_BOUNDS: Record<FilterId, { min: number; max: number; dec: number; scale: number }> = {
  peRatio: { min: 5, max: 100, dec: 1, scale: 12 },
  forwardPe: { min: 4, max: 90, dec: 1, scale: 10 },
  pegRatio: { min: 0.2, max: 5, dec: 1, scale: 0.8 },
  pbRatio: { min: 0.3, max: 20, dec: 1, scale: 1.5 },
  psRatio: { min: 0.3, max: 30, dec: 1, scale: 2 },
  pcfRatio: { min: 2, max: 50, dec: 1, scale: 4 },
  evToEbitda: { min: 3, max: 40, dec: 1, scale: 3 },
  epsGrowth: { min: -20, max: 100, dec: 1, scale: 35 },
  revenueGrowth: { min: -20, max: 80, dec: 1, scale: 25 },
  profitMargin: { min: -15, max: 50, dec: 1, scale: 8 },
  grossMargin: { min: 0, max: 90, dec: 1, scale: 10 },
  operatingMargin: { min: -20, max: 45, dec: 1, scale: 8 },
  roe: { min: -20, max: 60, dec: 1, scale: 15 },
  roa: { min: -15, max: 30, dec: 1, scale: 6 },
  roic: { min: -10, max: 40, dec: 1, scale: 8 },
  debtToEquity: { min: 0, max: 5, dec: 2, scale: 0.8 },
  debtToAssets: { min: 0, max: 90, dec: 1, scale: 12 },
  currentRatio: { min: 0, max: 5, dec: 1, scale: 0.6 },
  quickRatio: { min: 0, max: 4, dec: 1, scale: 0.5 },
  interestCoverage: { min: 0, max: 30, dec: 1, scale: 5 },
  dividendYield: { min: 0, max: 12, dec: 2, scale: 1.5 },
  payoutRatio: { min: 0, max: 120, dec: 0, scale: 20 },
  freeCashFlowYield: { min: -5, max: 20, dec: 1, scale: 4 },
  price: { min: 1, max: 5000, dec: 2, scale: 80 },
  marketCap: { min: 0, max: 500_000, dec: 0, scale: 15_000 },
  priceChange1m: { min: -40, max: 60, dec: 1, scale: 15 },
  priceChange3m: { min: -50, max: 80, dec: 1, scale: 20 },
  priceChange6m: { min: -55, max: 100, dec: 1, scale: 25 },
  priceChange52w: { min: -60, max: 150, dec: 1, scale: 45 },
  priceVs52wHigh: { min: -60, max: 0, dec: 1, scale: 12 },
  priceVs52wLow: { min: 0, max: 200, dec: 1, scale: 30 },
  avgVolume: { min: 0, max: 50, dec: 1, scale: 4 },
  volatility30d: { min: 5, max: 80, dec: 1, scale: 12 },
  atrPercent: { min: 0.5, max: 15, dec: 1, scale: 2 },
  beta: { min: 0, max: 3, dec: 2, scale: 0.4 },
};

function metricsAtDaysAgo(stock: Stock, daysAgo: number): StockMetrics {
  const keys = Object.keys(METRIC_BOUNDS) as FilterId[];
  if (daysAgo <= 0) {
    const out = {} as StockMetrics;
    for (const k of keys) out[k] = stock[k];
    return out;
  }

  const years = daysAgo / 365.25;
  const s = tickerSeed(stock.ticker);
  const returnBias = stock.priceChange52w / 100;
  const out = {} as StockMetrics;

  for (const k of keys) {
    const b = METRIC_BOUNDS[k];
    out[k] = hist(stock[k], years, s + k.length * 7, returnBias, b.scale, b.min, b.max, b.dec);
  }
  return out;
}

export function daysAgoToDate(daysAgo: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export function formatAsOfDate(daysAgo: number): string {
  if (daysAgo <= 0) return 'Today';
  return daysAgoToDate(daysAgo).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Interpolate Finnhub return windows (1m / 3m / 6m / 52w) — valid up to 365 days. */
function returnPctForDaysAgo(stock: Stock, daysAgo: number): number {
  const r1 = stock.priceChange1m;
  const r3 = stock.priceChange3m;
  const r6 = stock.priceChange6m;
  const r52 = stock.priceChange52w;

  if (daysAgo >= 300) return r52;
  if (daysAgo >= 150) {
    const t = (daysAgo - 180) / (365 - 180);
    return r6 + t * (r52 - r6);
  }
  if (daysAgo >= 60) {
    const t = (daysAgo - 90) / (180 - 90);
    return r3 + t * (r6 - r3);
  }
  if (daysAgo >= 20) {
    const t = (daysAgo - 30) / (90 - 30);
    return r1 + t * (r3 - r1);
  }
  return r1 * (daysAgo / 30);
}

export function priceReturnAtDaysAgo(stock: Stock, daysAgo: number): {
  priceThen: number;
  returnToTodayPct: number;
} {
  if (daysAgo <= 0) {
    return { priceThen: stock.price, returnToTodayPct: 0 };
  }

  const ret = returnPctForDaysAgo(stock, daysAgo);
  const priceThen = stock.price / (1 + ret / 100);
  return { priceThen: round(priceThen, 2), returnToTodayPct: round(ret, 1) };
}

export function buildSnapshot(stock: Stock, daysAgo: number): StockSnapshot {
  const metrics = metricsAtDaysAgo(stock, daysAgo);
  const { priceThen, returnToTodayPct } = priceReturnAtDaysAgo(stock, daysAgo);
  return {
    ticker: stock.ticker,
    ...metrics,
    priceThen,
    priceToday: stock.price,
    returnToTodayPct,
  };
}

export function buildAllSnapshots(
  stocks: Stock[],
  daysAgo: number,
): Map<string, StockSnapshot> {
  return new Map(stocks.map(s => [s.ticker, buildSnapshot(s, daysAgo)]));
}

export function computeBacktest(
  stocks: Stock[],
  snapshots: Map<string, StockSnapshot>,
  matchedTickers: Set<string>,
): BacktestSummary | null {
  if (stocks.length === 0) return null;

  const returns = stocks.map(s => snapshots.get(s.ticker)!.returnToTodayPct);
  const universeAvgReturn = round(
    returns.reduce((a, b) => a + b, 0) / returns.length,
    1,
  );

  const matched = stocks.filter(s => matchedTickers.has(s.ticker));
  if (matched.length === 0) {
    return {
      matchedCount: 0,
      matchedAvgReturn: 0,
      universeAvgReturn,
      alpha: round(-universeAvgReturn, 1),
    };
  }

  const matchedAvgReturn = round(
    matched.reduce((sum, s) => sum + snapshots.get(s.ticker)!.returnToTodayPct, 0) / matched.length,
    1,
  );

  return {
    matchedCount: matched.length,
    matchedAvgReturn,
    universeAvgReturn,
    alpha: round(matchedAvgReturn - universeAvgReturn, 1),
  };
}
