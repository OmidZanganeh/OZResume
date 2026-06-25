import type { Stock, StockMetrics, StockSnapshot, BacktestSummary } from './types';
import { daysAgoToDate, formatAsOfDate } from './timelineDate';
import { barForDaysAgo } from './weeklyLookup';
import { momentumAtDaysAgo, momentumFromBarIndex } from './weeklyMomentum';

export { daysAgoToDate, formatAsOfDate };

export type HistoricalPriceSource = 'weekly' | 'weekly-clamped' | 'finnhub' | 'none';

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

const EMPTY_METRICS: StockMetrics = {
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
  price: 0,
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

function priceFromWeeklyHistory(
  stock: Stock,
  daysAgo: number,
): { priceThen: number; returnToTodayPct: number; clamped: boolean } | null {
  const series = stock.weeklyHistory;
  if (!series?.length) return null;

  const hit = barForDaysAgo(series, daysAgo);
  const priceToday = stock.price;
  if (!hit || priceToday <= 0) return null;

  const bar = series[hit.idx]!;
  return {
    priceThen: round(bar.c, 2),
    returnToTodayPct: round(((priceToday - bar.c) / bar.c) * 100, 1),
    clamped: hit.clampedToOldest,
  };
}

/** Finnhub trailing return windows — approximate price at past dates when weekly bars missing. */
function returnPctFromFinnhubWindows(stock: Stock, daysAgo: number): number {
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

function priceFromFinnhubWindows(
  stock: Stock,
  daysAgo: number,
): { priceThen: number; returnToTodayPct: number } | null {
  if (stock.price <= 0) return null;
  const ret = returnPctFromFinnhubWindows(stock, daysAgo);
  if (!Number.isFinite(ret)) return null;
  return {
    priceThen: round(stock.price / (1 + ret / 100), 2),
    returnToTodayPct: round(ret, 1),
  };
}

/** Trailing momentum at past date derived from Finnhub return windows (price-only). */
function momentumFromFinnhubWindows(stock: Stock, daysAgo: number, returnToToday: number): StockMetrics {
  const subtract = (current: number, windowDays: number) =>
    round(current - returnToToday * Math.min(1, daysAgo / windowDays), 1);

  const priceThen = stock.price / (1 + returnToToday / 100);
  const priceRatio = priceThen / stock.price;
  const high52 =
    stock.priceVs52wHigh <= 0
      ? stock.price / (1 + stock.priceVs52wHigh / 100)
      : stock.price * 1.12;
  const low52 =
    stock.priceVs52wLow >= 0
      ? stock.price / (1 + stock.priceVs52wLow / 100)
      : stock.price * 0.88;
  const highT = high52 * Math.max(0.55, priceRatio);
  const lowT = low52 * Math.min(1.35, priceRatio * 1.05);

  return {
    ...EMPTY_METRICS,
    price: priceThen,
    priceChange1m: subtract(stock.priceChange1m, 30),
    priceChange3m: subtract(stock.priceChange3m, 90),
    priceChange6m: subtract(stock.priceChange6m, 180),
    priceChange52w: subtract(stock.priceChange52w, 365),
    priceVs52wHigh: highT > 0 ? round(((priceThen - highT) / highT) * 100, 1) : stock.priceVs52wHigh,
    priceVs52wLow: lowT > 0 ? round(((priceThen - lowT) / lowT) * 100, 1) : stock.priceVs52wLow,
    beta: stock.beta,
    avgVolume: stock.avgVolume,
    volatility30d: stock.volatility30d,
    atrPercent: stock.atrPercent,
  };
}

function momentumToMetrics(m: import('./weeklyMomentum').MomentumProfile, price: number): Partial<StockMetrics> {
  return {
    price,
    priceChange1m: m.priceChange4w,
    priceChange3m: m.priceChange13w,
    priceChange6m: m.priceChange26w,
    priceChange52w: m.priceChange52w,
    priceVs52wHigh: m.priceVs52wHigh,
    priceVs52wLow: m.priceVs52wLow,
  };
}

export function priceReturnAtDaysAgo(
  stock: Stock,
  daysAgo: number,
): { priceThen: number | null; returnToTodayPct: number | null; source: HistoricalPriceSource } {
  if (daysAgo <= 0) {
    return { priceThen: stock.price, returnToTodayPct: 0, source: 'weekly' };
  }

  const weekly = priceFromWeeklyHistory(stock, daysAgo);
  if (weekly) {
    return {
      priceThen: weekly.priceThen,
      returnToTodayPct: weekly.returnToTodayPct,
      source: weekly.clamped ? 'weekly-clamped' : 'weekly',
    };
  }

  const finnhub = priceFromFinnhubWindows(stock, daysAgo);
  if (finnhub) {
    return { ...finnhub, source: 'finnhub' };
  }

  return { priceThen: null, returnToTodayPct: null, source: 'none' };
}

/** Weekly close at `daysAgo` (0 = live price). */
export function priceAtDaysAgo(stock: Stock, daysAgo: number): number | null {
  if (daysAgo <= 0) return stock.price > 0 ? stock.price : null;
  const series = stock.weeklyHistory;
  if (!series?.length) return null;
  const hit = barForDaysAgo(series, daysAgo);
  if (hit == null) return null;
  const c = series[hit.idx]!.c;
  return c > 0 ? round(c, 2) : null;
}

/** Total return % from screen date (`fromDaysAgo`) to target date (`toDaysAgo`). */
export function returnBetweenDaysAgo(
  stock: Stock,
  fromDaysAgo: number,
  toDaysAgo: number,
): number | null {
  if (fromDaysAgo <= toDaysAgo) return 0;
  const priceFrom = priceAtDaysAgo(stock, fromDaysAgo);
  const priceTo = priceAtDaysAgo(stock, toDaysAgo);
  if (priceFrom == null || priceTo == null || priceFrom <= 0) return null;
  return round(((priceTo - priceFrom) / priceFrom) * 100, 1);
}

function historicalPriceMetrics(
  stock: Stock,
  daysAgo: number,
  priceThen: number,
  returnToToday: number,
  source: HistoricalPriceSource,
  weeklyBarIdx?: number | null,
): StockMetrics {
  const bars = stock.weeklyHistory;
  const weeklyMom =
    bars?.length && weeklyBarIdx != null
      ? momentumFromBarIndex(bars, weeklyBarIdx)
      : momentumAtDaysAgo(stock, daysAgo);
  if (weeklyMom) {
    return {
      ...EMPTY_METRICS,
      ...momentumToMetrics(weeklyMom, priceThen),
      beta: stock.beta,
      avgVolume: stock.avgVolume,
      volatility30d: stock.volatility30d,
      atrPercent: stock.atrPercent,
    };
  }

  if (source === 'finnhub') {
    return momentumFromFinnhubWindows(stock, daysAgo, returnToToday);
  }

  return { ...EMPTY_METRICS, price: priceThen };
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
      priceSource: 'weekly',
    };
  }

  const series = stock.weeklyHistory;
  let weeklyBarIdx: number | null = null;
  let clamped = false;
  if (series?.length) {
    const hit = barForDaysAgo(series, daysAgo);
    if (hit) {
      weeklyBarIdx = hit.idx;
      clamped = hit.clampedToOldest;
      const bar = series[hit.idx]!;
      const priceThen = round(bar.c, 2);
      const returnToTodayPct =
        stock.price > 0 ? round(((stock.price - bar.c) / bar.c) * 100, 1) : NaN;
      const priceMetrics = historicalPriceMetrics(
        stock,
        daysAgo,
        priceThen,
        returnToTodayPct,
        clamped ? 'weekly-clamped' : 'weekly',
        weeklyBarIdx,
      );
      return {
        ticker: stock.ticker,
        ...priceMetrics,
        price: priceThen,
        priceThen,
        priceToday: stock.price,
        returnToTodayPct,
        priceSource: clamped ? 'weekly-clamped' : 'weekly',
      };
    }
  }

  const { priceThen, returnToTodayPct, source } = priceReturnAtDaysAgo(stock, daysAgo);
  const priceMetrics =
    priceThen != null && returnToTodayPct != null
      ? historicalPriceMetrics(stock, daysAgo, priceThen, returnToTodayPct, source, weeklyBarIdx)
      : { ...EMPTY_METRICS };

  return {
    ticker: stock.ticker,
    ...priceMetrics,
    price: priceThen ?? 0,
    priceThen: priceThen ?? 0,
    priceToday: stock.price,
    returnToTodayPct: returnToTodayPct ?? NaN,
    priceSource: source,
  };
}

export function priceMomentumProfile(
  stock: Stock,
  daysAgo: number,
): import('./weeklyMomentum').MomentumProfile | null {
  return momentumAtDaysAgo(stock, daysAgo);
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
