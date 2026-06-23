export type Sector = 'Tech' | 'Healthcare' | 'Finance' | 'Energy' | 'Consumer';

export interface StockMetrics {
  peRatio: number;
  epsGrowth: number;
  debtToEquity: number;
  rsi: number;
  price: number;
  marketCap: number;
  dividendYield: number;
  roe: number;
  profitMargin: number;
  revenueGrowth: number;
  beta: number;
  pbRatio: number;
  currentRatio: number;
  avgVolume: number;
  priceChange52w: number;
}

/** Anchor snapshot — represents fundamentals & price today */
export interface Stock extends StockMetrics {
  ticker: string;
  companyName: string;
  sector: Sector;
  /** RSI(14) anchor — other periods derived from this */
  rsi14: number;
  /** Fictional annualized total return used to back-calculate historical prices */
  annualizedReturn: number;
}

export interface StockSnapshot extends StockMetrics {
  ticker: string;
  priceThen: number;
  priceToday: number;
  rsiPeriod: number;
  returnToTodayPct: number;
}

/** @deprecated use ScreenerState from filters.ts */
export interface ScreenerFilters {
  maxPe: number;
  minEpsGrowth: number;
  maxDebtEquity: number;
  maxRsi: number;
}

/** How far back the date slider goes */
export const HISTORY_DAYS = 730;

export interface BacktestSummary {
  matchedCount: number;
  matchedAvgReturn: number;
  universeAvgReturn: number;
  alpha: number;
}
