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

/** Derive RSI for any lookback period from the RSI(14) anchor */
export function rsiForPeriod(stock: Stock, period: number, rsi14Value: number): number {
  const s = tickerSeed(stock.ticker);
  const periodDelta = 14 - period;
  const adjusted = rsi14Value + periodDelta * (1.8 + (s % 5) * 0.35) + ((s % 11) - 5) * 0.2;
  return round(clamp(adjusted, 0, 100), 0);
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

function metricsAtDaysAgoRaw(stock: Stock, daysAgo: number): Omit<StockMetrics, 'rsi'> & { rsi14: number } {
  if (daysAgo <= 0) {
    return {
      peRatio: stock.peRatio,
      epsGrowth: stock.epsGrowth,
      debtToEquity: stock.debtToEquity,
      rsi14: stock.rsi14,
      price: stock.price,
      marketCap: stock.marketCap,
      dividendYield: stock.dividendYield,
      roe: stock.roe,
      profitMargin: stock.profitMargin,
      revenueGrowth: stock.revenueGrowth,
      beta: stock.beta,
      pbRatio: stock.pbRatio,
      currentRatio: stock.currentRatio,
      avgVolume: stock.avgVolume,
      priceChange52w: stock.priceChange52w,
    };
  }

  const years = yearsAgoFromDays(daysAgo);
  const s = tickerSeed(stock.ticker);
  const drift = (s % 100) / 100;
  const returnBias = stock.annualizedReturn / 100;

  return {
    peRatio: round(clamp(
      stock.peRatio * (1 - years * (0.14 + drift * 0.18)) + years * ((s % 14) - 7),
      5, 100,
    ), 1),
    epsGrowth: round(clamp(
      stock.epsGrowth - years * (returnBias * 45 + (drift - 0.5) * 35),
      -20, 100,
    ), 1),
    debtToEquity: round(clamp(
      stock.debtToEquity + years * ((s % 9) / 10 - 0.35),
      0, 5,
    ), 2),
    rsi14: round(clamp(
      stock.rsi14 - years * (returnBias * 28 + (drift - 0.5) * 22),
      0, 100,
    ), 0),
    price: round(clamp(
      stock.price / Math.pow(1 + returnBias, years * 0.85),
      5, 500,
    ), 2),
    marketCap: round(clamp(
      stock.marketCap / Math.pow(1 + returnBias * 0.9, years),
      100, 500_000,
    ), 0),
    dividendYield: round(clamp(
      stock.dividendYield + years * ((s % 6) / 10 - 0.2),
      0, 12,
    ), 2),
    roe: round(clamp(
      stock.roe - years * (returnBias * 20 + (drift - 0.5) * 15),
      -20, 60,
    ), 1),
    profitMargin: round(clamp(
      stock.profitMargin - years * (returnBias * 12 + (drift - 0.5) * 8),
      -15, 50,
    ), 1),
    revenueGrowth: round(clamp(
      stock.revenueGrowth - years * (returnBias * 30 + (drift - 0.5) * 20),
      -20, 80,
    ), 1),
    beta: round(clamp(
      stock.beta + years * ((s % 7) / 20 - 0.15),
      0, 3,
    ), 2),
    pbRatio: round(clamp(
      stock.pbRatio * (1 - years * 0.08) + years * ((s % 5) - 2) * 0.1,
      0, 20,
    ), 1),
    currentRatio: round(clamp(
      stock.currentRatio + years * ((s % 8) / 10 - 0.3),
      0, 5,
    ), 1),
    avgVolume: round(clamp(
      stock.avgVolume * (1 + years * 0.05),
      0.1, 50,
    ), 1),
    priceChange52w: round(clamp(
      stock.priceChange52w - years * (returnBias * 80),
      -60, 150,
    ), 1),
  };
}

export function metricsAtDaysAgo(stock: Stock, daysAgo: number, rsiPeriod: number): StockMetrics {
  const raw = metricsAtDaysAgoRaw(stock, daysAgo);
  const rsi = rsiForPeriod(stock, rsiPeriod, raw.rsi14);
  return { ...raw, rsi };
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

export function buildSnapshot(stock: Stock, daysAgo: number, rsiPeriod: number): StockSnapshot {
  const metrics = metricsAtDaysAgo(stock, daysAgo, rsiPeriod);
  const { priceThen, returnToTodayPct } = priceReturnAtDaysAgo(stock, daysAgo);
  return {
    ticker: stock.ticker,
    ...metrics,
    priceThen,
    priceToday: stock.price,
    rsiPeriod,
    returnToTodayPct,
  };
}

export function buildAllSnapshots(
  stocks: Stock[],
  daysAgo: number,
  rsiPeriod: number,
): Map<string, StockSnapshot> {
  return new Map(stocks.map(s => [s.ticker, buildSnapshot(s, daysAgo, rsiPeriod)]));
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
