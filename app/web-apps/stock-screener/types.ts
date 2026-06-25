export type Sector = 'Tech' | 'Healthcare' | 'Finance' | 'Energy' | 'Consumer';

export interface StockMetrics {
  // Valuation
  peRatio: number;
  forwardPe: number;
  pegRatio: number;
  pbRatio: number;
  psRatio: number;
  pcfRatio: number;
  evToEbitda: number;
  // Growth
  epsGrowth: number;
  revenueGrowth: number;
  // Profitability
  profitMargin: number;
  grossMargin: number;
  operatingMargin: number;
  roe: number;
  roa: number;
  roic: number;
  // Financial health
  debtToEquity: number;
  debtToAssets: number;
  currentRatio: number;
  quickRatio: number;
  interestCoverage: number;
  // Shareholder returns
  dividendYield: number;
  payoutRatio: number;
  freeCashFlowYield: number;
  // Size & price
  price: number;
  marketCap: number;
  // Momentum (Finnhub return windows)
  priceChange1m: number;
  priceChange3m: number;
  priceChange6m: number;
  priceChange52w: number;
  priceVs52wHigh: number;
  priceVs52wLow: number;
  // Volume & volatility
  avgVolume: number;
  volatility30d: number;
  atrPercent: number;
  beta: number;
}

export interface WeeklyBar {
  /** Unix seconds (week bar date). */
  t: number;
  c: number;
}

export interface Stock extends StockMetrics {
  ticker: string;
  companyName: string;
  sector: Sector;
  /** Weekly OHLC closes, newest first (~1 year). */
  weeklyHistory?: WeeklyBar[];
}

export interface StockSnapshot extends StockMetrics {
  ticker: string;
  priceThen: number;
  priceToday: number;
  returnToTodayPct: number;
  /** How historical price/return was derived. */
  priceSource?: 'weekly' | 'finnhub' | 'none';
}

/** Max lookback — ~1 year; prices from cached weekly closes when available. */
export const HISTORY_DAYS = 365;
/** Slider snaps to weekly steps — fewer updates, smoother interaction. */
export const HISTORY_STEP_DAYS = 7;

export interface BacktestSummary {
  matchedCount: number;
  matchedAvgReturn: number;
  universeAvgReturn: number;
  alpha: number;
}
