export type Sector = 'Tech' | 'Healthcare' | 'Finance' | 'Energy' | 'Consumer';

export interface StockMetrics {
  peRatio: number;
  epsGrowth: number;
  debtToEquity: number;
  rsi: number;
}

/** Anchor snapshot — represents fundamentals & price today */
export interface Stock extends StockMetrics {
  ticker: string;
  companyName: string;
  sector: Sector;
  /** Fictional share price today (USD) */
  price: number;
  /** Fictional annualized total return used to back-calculate historical prices */
  annualizedReturn: number;
}

export interface StockSnapshot extends StockMetrics {
  ticker: string;
  priceThen: number;
  priceToday: number;
  /** Total % price change from as-of date to today */
  returnToTodayPct: number;
}

export interface ScreenerFilters {
  maxPe: number;
  minEpsGrowth: number;
  maxDebtEquity: number;
  maxRsi: number;
}

export const DEFAULT_FILTERS: ScreenerFilters = {
  maxPe: 100,
  minEpsGrowth: -20,
  maxDebtEquity: 5,
  maxRsi: 100,
};

/** How far back the date slider goes */
export const HISTORY_DAYS = 730;

export interface BacktestSummary {
  matchedCount: number;
  matchedAvgReturn: number;
  universeAvgReturn: number;
  alpha: number;
}
