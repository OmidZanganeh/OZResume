import type { Stock, WeeklyBar } from './types';

function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function weeklyPctReturns(bars: WeeklyBar[], startIdx: number, weekCount: number): number[] {
  const out: number[] = [];
  for (let w = 0; w < weekCount; w++) {
    const i = startIdx + w;
    const j = startIdx + w + 1;
    if (j >= bars.length) break;
    const newer = bars[i]!.c;
    const older = bars[j]!.c;
    if (older > 0) out.push(((newer - older) / older) * 100);
  }
  return out;
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Close-only ATR as % of price (weekly bars; proxy when daily OHLC is unavailable). */
export function closeOnlyAtrPercent(bars: WeeklyBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const closes = [...bars].reverse().map(b => b.c);
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.abs(closes[i]! - closes[i - 1]!));
  }
  const recent = trs.slice(-period);
  const atr = recent.reduce((a, b) => a + b, 0) / recent.length;
  const price = closes[closes.length - 1]!;
  if (price <= 0) return null;
  return round((atr / price) * 100, 1);
}

/** Annualized volatility % from trailing weekly returns (~5 weeks ≈ 30 calendar days). */
export function annualizedVolFromWeekly(bars: WeeklyBar[], weeks = 5): number | null {
  const returns = weeklyPctReturns(bars, 0, weeks);
  const vol = stdDev(returns);
  if (vol == null) return null;
  return round(vol * Math.sqrt(52), 1);
}

/** Fill volatility30d / atrPercent from weekly history when Finnhub left them at zero. */
export function enrichStockPriceVolatility(stock: Stock): Stock {
  const bars = stock.weeklyHistory;
  if (!bars?.length) return stock;

  let volatility30d = stock.volatility30d;
  let atrPercent = stock.atrPercent;

  if (!volatility30d) {
    const v = annualizedVolFromWeekly(bars);
    if (v != null && v > 0) volatility30d = v;
  }

  if (!atrPercent) {
    const a = closeOnlyAtrPercent(bars);
    if (a != null && a > 0) atrPercent = a;
  }

  if (volatility30d === stock.volatility30d && atrPercent === stock.atrPercent) return stock;
  return { ...stock, volatility30d, atrPercent };
}

export function enrichStocksPriceVolatility(stocks: Stock[]): Stock[] {
  return stocks.map(enrichStockPriceVolatility);
}
