import type { Stock, StockMetrics, StockSnapshot, BacktestSummary } from './types';

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

export function yearsAgoFromDays(daysAgo: number): number {
  return daysAgo / 365.25;
}

/** Reconstruct fundamentals as they would have looked N days ago */
export function metricsAtDaysAgo(stock: Stock, daysAgo: number): StockMetrics {
  if (daysAgo <= 0) {
    return {
      peRatio: stock.peRatio,
      epsGrowth: stock.epsGrowth,
      debtToEquity: stock.debtToEquity,
      rsi: stock.rsi,
    };
  }

  const years = yearsAgoFromDays(daysAgo);
  const s = tickerSeed(stock.ticker);
  const drift = (s % 100) / 100;
  const returnBias = stock.annualizedReturn / 100;

  const peRatio = round(clamp(
    stock.peRatio * (1 - years * (0.14 + drift * 0.18)) + years * ((s % 14) - 7),
    5, 100,
  ), 1);

  const epsGrowth = round(clamp(
    stock.epsGrowth - years * (returnBias * 45 + (drift - 0.5) * 35),
    -20, 100,
  ), 1);

  const debtToEquity = round(clamp(
    stock.debtToEquity + years * ((s % 9) / 10 - 0.35),
    0, 5,
  ), 2);

  const rsi = round(clamp(
    stock.rsi - years * (returnBias * 28 + (drift - 0.5) * 22),
    10, 90,
  ), 0);

  return { peRatio, epsGrowth, debtToEquity, rsi };
}

export function priceReturnAtDaysAgo(stock: Stock, daysAgo: number): {
  priceThen: number;
  returnToTodayPct: number;
} {
  if (daysAgo <= 0) {
    return { priceThen: stock.price, returnToTodayPct: 0 };
  }
  const years = yearsAgoFromDays(daysAgo);
  const priceThen = stock.price / Math.pow(1 + stock.annualizedReturn / 100, years);
  const returnToTodayPct = round(((stock.price - priceThen) / priceThen) * 100, 1);
  return { priceThen: round(priceThen, 2), returnToTodayPct };
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

export function buildAllSnapshots(stocks: Stock[], daysAgo: number): Map<string, StockSnapshot> {
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
