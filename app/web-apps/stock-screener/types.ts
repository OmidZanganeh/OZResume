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
  // Technical — momentum
  rsi: number;
  priceChange1m: number;
  priceChange3m: number;
  priceChange6m: number;
  priceChange52w: number;
  priceVs52wHigh: number;
  priceVs52wLow: number;
  // Technical — volume & volatility
  avgVolume: number;
  relativeVolume: number;
  volatility30d: number;
  atrPercent: number;
  beta: number;
  // Technical — indicators
  sma50Distance: number;
  sma200Distance: number;
  macdSignal: number;
  stochastic: number;
  williamsR: number;
  adx: number;
}

export interface Stock extends StockMetrics {
  ticker: string;
  companyName: string;
  sector: Sector;
  rsi14: number;
  annualizedReturn: number;
}

export interface StockSnapshot extends StockMetrics {
  ticker: string;
  priceThen: number;
  priceToday: number;
  rsiPeriod: number;
  returnToTodayPct: number;
}

export const HISTORY_DAYS = 730;

export interface BacktestSummary {
  matchedCount: number;
  matchedAvgReturn: number;
  universeAvgReturn: number;
  alpha: number;
}
