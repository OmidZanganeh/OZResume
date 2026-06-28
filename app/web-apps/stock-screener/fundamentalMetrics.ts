import type { Stock, StockMetrics } from './types';
import type { FundamentalPeriod } from './fundamentalTypes';
import { barForDaysAgo } from './weeklyLookup';

/** Metrics rebuilt from fiscal statements + price at the timeline date (not live Finnhub). */
export const HISTORICAL_FUNDAMENTAL_IDS = [
  'peRatio',
  'pegRatio',
  'pbRatio',
  'psRatio',
  'marketCap',
  'epsGrowth',
  'revenueGrowth',
  'profitMargin',
  'grossMargin',
  'operatingMargin',
  'roe',
  'roa',
  'debtToEquity',
  'debtToAssets',
  'currentRatio',
  'freeCashFlowYield',
] as const satisfies readonly (keyof StockMetrics)[];

export type HistoricalFundamentalId = (typeof HISTORICAL_FUNDAMENTAL_IDS)[number];

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** Latest reported fiscal period on or before `targetUnix`. */
export function periodForDate(
  periods: FundamentalPeriod[],
  targetUnix: number,
): FundamentalPeriod | null {
  if (!periods.length) return null;
  for (const p of periods) {
    if (p.t <= targetUnix) return p;
  }
  return periods[periods.length - 1] ?? null;
}

function periodBefore(
  periods: FundamentalPeriod[],
  current: FundamentalPeriod,
): FundamentalPeriod | null {
  const idx = periods.findIndex(p => p.t === current.t);
  if (idx < 0 || idx + 1 >= periods.length) return null;
  return periods[idx + 1] ?? null;
}

/** Build screener metrics from statement period + price at that date. */
export function metricsFromFundamentalPeriod(
  period: FundamentalPeriod,
  price: number,
  prev: FundamentalPeriod | null,
  live: Stock,
): Partial<StockMetrics> {
  const out: Partial<StockMetrics> = {};
  const { rev, ni, gp, oi, eq, debt, ca, cl, fcf, sh, ta } = period;

  if (sh && sh > 0 && price > 0) {
    const mcapMillions = (price * sh) / 1_000_000;
    out.marketCap = round(mcapMillions, 0);
    out.price = price;

    if (ni && ni > 0) {
      const eps = ni / sh;
      out.peRatio = round(price / eps, 1);
    }
    if (eq && eq > 0) {
      out.pbRatio = round((price * sh) / eq, 1);
    }
    if (rev && rev > 0) {
      out.psRatio = round((price * sh) / rev, 1);
    }
    if (fcf && fcf > 0) {
      out.freeCashFlowYield = round((fcf / (price * sh)) * 100, 1);
    }
  }

  if (rev && rev > 0) {
    if (ni != null) out.profitMargin = round((ni / rev) * 100, 1);
    if (gp != null) out.grossMargin = round((gp / rev) * 100, 1);
    if (oi != null) out.operatingMargin = round((oi / rev) * 100, 1);
  }

  if (eq && eq > 0 && ni != null) out.roe = round((ni / eq) * 100, 1);
  if (ta && ta > 0 && ni != null) out.roa = round((ni / ta) * 100, 1);
  if (debt != null && eq && eq > 0) out.debtToEquity = round(debt / eq, 2);
  if (debt != null && ta && ta > 0) out.debtToAssets = round((debt / ta) * 100, 1);
  if (ca && cl && cl > 0) out.currentRatio = round(ca / cl, 1);

  if (prev?.rev && rev && prev.rev > 0) {
    out.revenueGrowth = round(((rev - prev.rev) / prev.rev) * 100, 1);
  }
  if (prev?.ni && ni && prev.sh && sh && prev.sh > 0 && sh > 0) {
    const epsPrev = prev.ni / prev.sh;
    const eps = ni / sh;
    if (epsPrev > 0) out.epsGrowth = round(((eps - epsPrev) / epsPrev) * 100, 1);
  }

  if (out.peRatio && out.epsGrowth && out.epsGrowth > 0) {
    out.pegRatio = round(out.peRatio / out.epsGrowth, 1);
  }

  // Chart/quote-only fields — keep live values when available.
  out.beta = live.beta;
  out.avgVolume = live.avgVolume;
  out.volatility30d = live.volatility30d;
  out.atrPercent = live.atrPercent;
  out.forwardPe = live.forwardPe;
  out.dividendYield = live.dividendYield;
  out.payoutRatio = live.payoutRatio;
  out.quickRatio = live.quickRatio;
  out.interestCoverage = live.interestCoverage;
  out.roic = live.roic;
  out.pcfRatio = live.pcfRatio;
  out.evToEbitda = live.evToEbitda;

  return out;
}

export function metricsFromFundamentalHistory(
  stock: Stock,
  daysAgo: number,
  priceThen: number,
): Partial<StockMetrics> | null {
  const periods = stock.fundamentalHistory;
  if (!periods?.length || priceThen <= 0) return null;

  const targetUnix =
    daysAgo <= 0
      ? Math.floor(Date.now() / 1000)
      : Math.floor((Date.now() - daysAgo * 86_400_000) / 1000);

  const period = periodForDate(periods, targetUnix);
  if (!period) return null;

  const prev = periodBefore(periods, period);
  return metricsFromFundamentalPeriod(period, priceThen, prev, stock);
}

/** Price at daysAgo for fundamental ratio math (weekly bar). */
export function historicalPriceForFundamentals(stock: Stock, daysAgo: number): number | null {
  if (daysAgo <= 0) return stock.price > 0 ? stock.price : null;
  const bars = stock.weeklyHistory;
  if (!bars?.length) return null;
  const hit = barForDaysAgo(bars, daysAgo);
  if (!hit) return null;
  const c = bars[hit.idx]!.c;
  return c > 0 ? c : null;
}
