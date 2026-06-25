import type { Stock, StockMetrics, StockSnapshot, BacktestSummary } from './types';

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function metricsFromStock(stock: Stock, displayPrice: number): StockMetrics {
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
  const { priceThen, returnToTodayPct } = priceReturnAtDaysAgo(stock, daysAgo);
  return {
    ticker: stock.ticker,
    ...metricsFromStock(stock, daysAgo <= 0 ? stock.price : priceThen),
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
