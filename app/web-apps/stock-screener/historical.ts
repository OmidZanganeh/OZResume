import type { Stock, StockMetrics, StockSnapshot, BacktestSummary } from './types';
import { daysAgoToDate, formatAsOfDate } from './timelineDate';
import { closestWeeklyBar } from './weeklyLookup';

export { daysAgoToDate, formatAsOfDate };

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** Live Finnhub metrics (today only). */
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
  priceThen: number | null;
  returnToTodayPct: number | null;
} {
  if (daysAgo <= 0) {
    return { priceThen: stock.price, returnToTodayPct: 0 };
  }
  return priceFromWeeklyHistory(stock, daysAgo) ?? { priceThen: null, returnToTodayPct: null };
}

export function buildSnapshot(stock: Stock, daysAgo: number): StockSnapshot {
  if (daysAgo <= 0) {
    const metrics = metricsFromStock(stock, stock.price);
    return {
      ticker: stock.ticker,
      ...metrics,
      priceThen: stock.price,
      priceToday: stock.price,
      returnToTodayPct: 0,
    };
  }

  const { priceThen, returnToTodayPct } = priceReturnAtDaysAgo(stock, daysAgo);

  return {
    ticker: stock.ticker,
    price: priceThen ?? 0,
    priceThen: priceThen ?? 0,
    priceToday: stock.price,
    returnToTodayPct: returnToTodayPct ?? NaN,
    peRatio: 0,
    forwardPe: 0,
    pegRatio: 0,
    pbRatio: 0,
    psRatio: 0,
    pcfRatio: 0,
    evToEbitda: 0,
    epsGrowth: 0,
    revenueGrowth: 0,
    profitMargin: 0,
    grossMargin: 0,
    operatingMargin: 0,
    roe: 0,
    roa: 0,
    roic: 0,
    debtToEquity: 0,
    debtToAssets: 0,
    currentRatio: 0,
    quickRatio: 0,
    interestCoverage: 0,
    dividendYield: 0,
    payoutRatio: 0,
    freeCashFlowYield: 0,
    marketCap: 0,
    priceChange1m: 0,
    priceChange3m: 0,
    priceChange6m: 0,
    priceChange52w: 0,
    priceVs52wHigh: 0,
    priceVs52wLow: 0,
    avgVolume: 0,
    volatility30d: 0,
    atrPercent: 0,
    beta: 0,
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

export function buildTodaySnapshots(stocks: Stock[]): Map<string, StockSnapshot> {
  return buildAllSnapshots(stocks, 0);
}

export function computeBacktest(
  stocks: Stock[],
  snapshots: Map<string, StockSnapshot>,
  matchedTickers: Set<string>,
): BacktestSummary | null {
  if (stocks.length === 0) return null;

  const validReturns = stocks
    .map(s => snapshots.get(s.ticker)!.returnToTodayPct)
    .filter(r => Number.isFinite(r));

  const universeAvgReturn = validReturns.length
    ? round(validReturns.reduce((a, b) => a + b, 0) / validReturns.length, 1)
    : 0;

  const matched = stocks.filter(s => matchedTickers.has(s.ticker));
  const matchedReturns = matched
    .map(s => snapshots.get(s.ticker)!.returnToTodayPct)
    .filter(r => Number.isFinite(r));

  if (matchedReturns.length === 0) {
    return {
      matchedCount: matched.length,
      matchedAvgReturn: 0,
      universeAvgReturn,
      alpha: round(-universeAvgReturn, 1),
    };
  }

  const matchedAvgReturn = round(
    matchedReturns.reduce((sum, r) => sum + r, 0) / matchedReturns.length,
    1,
  );

  return {
    matchedCount: matched.length,
    matchedAvgReturn,
    universeAvgReturn,
    alpha: round(matchedAvgReturn - universeAvgReturn, 1),
  };
}
