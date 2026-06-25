import type { Stock, StockMetrics, StockSnapshot, BacktestSummary } from './types';
import { closestWeeklyBar } from './weeklyLookup';

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Metrics as-of today (live Finnhub snapshot). */
export function metricsFromStock(stock: Stock, displayPrice: number): StockMetrics {
  return {
    peRatio: stock.peRatio,
    forwardPe: stock.forwardPe,
    pegRatio: stock.pegRatio,
    pbRatio: stock.pbRatio,
    psRatio: stock.psRatio,
    pcfRatio: stock.pcfRatio,
    evToEbitda: stock.evToEbitda,
    epsGrowth: stock.epsGrowth,
    revenueGrowth: stock.revenueGrowth,
    profitMargin: stock.profitMargin,
    grossMargin: stock.grossMargin,
    operatingMargin: stock.operatingMargin,
    roe: stock.roe,
    roa: stock.roa,
    roic: stock.roic,
    debtToEquity: stock.debtToEquity,
    debtToAssets: stock.debtToAssets,
    currentRatio: stock.currentRatio,
    quickRatio: stock.quickRatio,
    interestCoverage: stock.interestCoverage,
    dividendYield: stock.dividendYield,
    payoutRatio: stock.payoutRatio,
    freeCashFlowYield: stock.freeCashFlowYield,
    price: displayPrice,
    marketCap: stock.marketCap,
    priceChange1m: stock.priceChange1m,
    priceChange3m: stock.priceChange3m,
    priceChange6m: stock.priceChange6m,
    priceChange52w: stock.priceChange52w,
    priceVs52wHigh: stock.priceVs52wHigh,
    priceVs52wLow: stock.priceVs52wLow,
    avgVolume: stock.avgVolume,
    volatility30d: stock.volatility30d,
    atrPercent: stock.atrPercent,
    beta: stock.beta,
  };
}

/**
 * Estimate full factor profile at a past date.
 * Price/momentum from Finnhub return windows; valuation scaled by price ratio;
 * fundamentals drifted modestly backward (labeled estimated in UI).
 */
function estimateMetricsAtDaysAgo(
  stock: Stock,
  daysAgo: number,
  priceThen: number,
  returnToTodayPct: number,
): StockMetrics {
  if (daysAgo <= 0) return metricsFromStock(stock, stock.price);

  const priceToday = Math.max(stock.price, 0.01);
  const priceRatio = priceThen / priceToday;
  const years = daysAgo / 365.25;
  const fundDrift = 1 - Math.min(0.3, years * 0.1);

  const peRatio = round(stock.peRatio * priceRatio, 1);
  const forwardPe = round(stock.forwardPe * priceRatio, 1);
  const pbRatio = round(stock.pbRatio * priceRatio, 1);
  const psRatio = round(stock.psRatio * priceRatio, 1);
  const pcfRatio = round(stock.pcfRatio * priceRatio, 1);
  const evToEbitda = round(stock.evToEbitda * (0.65 + 0.35 * priceRatio), 1);

  const epsGrowth = round(stock.epsGrowth * fundDrift, 1);
  const revenueGrowth = round(stock.revenueGrowth * fundDrift, 1);
  const pegRatio =
    epsGrowth > 1 && peRatio > 0 ? round(peRatio / epsGrowth, 1) : round(stock.pegRatio, 1);

  const subtractMomentum = (current: number, windowDays: number) =>
    round(current - returnToTodayPct * Math.min(1, daysAgo / windowDays), 1);

  const high52 =
    stock.priceVs52wHigh <= 0
      ? priceToday / (1 + stock.priceVs52wHigh / 100)
      : priceToday * 1.12;
  const low52 =
    stock.priceVs52wLow >= 0
      ? priceToday / (1 + stock.priceVs52wLow / 100)
      : priceToday * 0.88;
  const highT = high52 * Math.max(0.55, priceRatio);
  const lowT = low52 * Math.min(1.35, priceRatio * 1.05);
  const priceVs52wHigh = round(highT > 0 ? ((priceThen - highT) / highT) * 100 : stock.priceVs52wHigh, 1);
  const priceVs52wLow = round(lowT > 0 ? ((priceThen - lowT) / lowT) * 100 : stock.priceVs52wLow, 1);

  return {
    peRatio,
    forwardPe,
    pegRatio,
    pbRatio,
    psRatio,
    pcfRatio,
    evToEbitda,
    epsGrowth,
    revenueGrowth,
    profitMargin: round(stock.profitMargin * fundDrift, 1),
    grossMargin: round(stock.grossMargin * fundDrift, 1),
    operatingMargin: round(stock.operatingMargin * fundDrift, 1),
    roe: round(stock.roe * fundDrift, 1),
    roa: round(stock.roa * fundDrift, 1),
    roic: round(stock.roic * fundDrift, 1),
    debtToEquity: round(stock.debtToEquity * (1 + years * 0.04), 2),
    debtToAssets: round(clamp(stock.debtToAssets * (1 + years * 0.03), 0, 95), 1),
    currentRatio: round(stock.currentRatio, 1),
    quickRatio: round(stock.quickRatio, 1),
    interestCoverage: round(stock.interestCoverage, 1),
    dividendYield: round(stock.dividendYield / Math.max(priceRatio, 0.2), 2),
    payoutRatio: round(stock.payoutRatio, 0),
    freeCashFlowYield: round(stock.freeCashFlowYield / Math.max(priceRatio, 0.2), 1),
    price: priceThen,
    marketCap: Math.round(stock.marketCap * priceRatio),
    priceChange1m: subtractMomentum(stock.priceChange1m, 30),
    priceChange3m: subtractMomentum(stock.priceChange3m, 90),
    priceChange6m: subtractMomentum(stock.priceChange6m, 180),
    priceChange52w: subtractMomentum(stock.priceChange52w, 365),
    priceVs52wHigh,
    priceVs52wLow,
    avgVolume: round(stock.avgVolume, 1),
    volatility30d: round(stock.volatility30d, 1),
    atrPercent: round(stock.atrPercent, 1),
    beta: round(stock.beta, 2),
  };
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

/** Interpolate Finnhub return windows — fallback when weeklyCloses missing. */
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

function priceFromWeeklyHistory(
  stock: Stock,
  daysAgo: number,
): { priceThen: number; returnToTodayPct: number } | null {
  const series = stock.weeklyHistory;
  if (!series?.length) return null;

  const targetTs = Math.floor(daysAgoToDate(daysAgo).getTime() / 1000);
  const bar = closestWeeklyBar(series, targetTs);
  const priceToday = stock.price;
  if (!bar || priceToday <= 0) return null;

  return {
    priceThen: round(bar.c, 2),
    returnToTodayPct: round(((priceToday - bar.c) / bar.c) * 100, 1),
  };
}

export function priceReturnAtDaysAgo(stock: Stock, daysAgo: number): {
  priceThen: number;
  returnToTodayPct: number;
} {
  if (daysAgo <= 0) {
    return { priceThen: stock.price, returnToTodayPct: 0 };
  }

  const fromWeekly = priceFromWeeklyHistory(stock, daysAgo);
  if (fromWeekly) return fromWeekly;

  const ret = returnPctForDaysAgo(stock, daysAgo);
  const priceThen = stock.price / (1 + ret / 100);
  return { priceThen: round(priceThen, 2), returnToTodayPct: round(ret, 1) };
}

export function buildSnapshot(stock: Stock, daysAgo: number): StockSnapshot {
  const { priceThen, returnToTodayPct } = priceReturnAtDaysAgo(stock, daysAgo);
  const metrics =
    daysAgo <= 0
      ? metricsFromStock(stock, stock.price)
      : estimateMetricsAtDaysAgo(stock, daysAgo, priceThen, returnToTodayPct);

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
  const map = new Map<string, StockSnapshot>();
  for (const stock of stocks) {
    map.set(stock.ticker, buildSnapshot(stock, daysAgo));
  }
  return map;
}

/** Today's live profile for each ticker (similarity target universe). */
export function buildTodaySnapshots(stocks: Stock[]): Map<string, StockSnapshot> {
  return buildAllSnapshots(stocks, 0);
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
