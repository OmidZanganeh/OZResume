/**
 * Curated code filters — expressions use fields that exist in the screener.
 * Live-only presets work on every symbol; weekly presets need cached weekly history.
 */

export type PremadeFilterCategory =
  | 'volume'
  | 'breakout'
  | 'momentum'
  | 'compression'
  | 'technical'
  | 'value'
  | 'defensive';

export interface PremadeFilter {
  id: string;
  name: string;
  category: PremadeFilterCategory;
  description: string;
  expression: string;
  /** Needs weekly bars (momentum / RSI / MACD / stoch fields). */
  requiresWeekly?: boolean;
}

export const PREMADE_FILTER_CATEGORIES: {
  id: PremadeFilterCategory;
  label: string;
  hint: string;
}[] = [
  {
    id: 'volume',
    label: 'Volume & liquidity',
    hint: 'Tradeable size — avg daily volume and market cap',
  },
  {
    id: 'breakout',
    label: 'Breakouts',
    hint: 'Near 52-week highs with positive trend',
  },
  {
    id: 'momentum',
    label: 'Momentum',
    hint: 'Relative strength across 1m–52w windows',
  },
  {
    id: 'compression',
    label: 'Compression / squeeze',
    hint: 'Low volatility coiling before a potential move (weekly)',
  },
  {
    id: 'technical',
    label: 'RSI · MACD · Stochastic',
    hint: 'Classic indicators from weekly closes',
  },
  {
    id: 'value',
    label: 'Value & quality',
    hint: 'Fundamental screens',
  },
  {
    id: 'defensive',
    label: 'Defensive',
    hint: 'Lower beta and steadier volatility',
  },
];

export const PREMADE_FILTERS: PremadeFilter[] = [
  // Volume & liquidity
  {
    id: 'liq-large',
    name: 'Liquid large caps',
    category: 'volume',
    description: '≥ $10B cap, ≥ 2M shares/day average volume',
    expression: 'marketCap > 10000 & avgVolume > 2',
  },
  {
    id: 'liq-mid',
    name: 'Liquid mid caps',
    category: 'volume',
    description: '$2B–$50B with decent volume',
    expression: 'marketCap > 2000 & marketCap < 50000 & avgVolume > 0.5',
  },
  {
    id: 'vol-active',
    name: 'High volume movers',
    category: 'volume',
    description: '≥ 1M avg volume with recent 1-month strength',
    expression: 'avgVolume > 1 & priceChange1m > 5',
  },

  // Breakouts
  {
    id: 'bo-52w',
    name: '52-week breakout',
    category: 'breakout',
    description: 'Within 3% of 52w high, strong year trend',
    expression: 'priceVs52wHigh > -3 & priceChange52w > 15 & avgVolume > 0.5',
  },
  {
    id: 'bo-fresh',
    name: 'Fresh high momentum',
    category: 'breakout',
    description: 'Near highs with 3m and 6m confirmation',
    expression: 'priceVs52wHigh > -2 & priceChange3m > 5 & priceChange6m > 10',
  },
  {
    id: 'bo-weekly',
    name: 'Weekly breakout setup',
    category: 'breakout',
    description: '13-week push near range top (weekly history)',
    expression: 'priceChange13w > 8 & rangePosition26w > 70 & priceVs52wHigh > -5',
    requiresWeekly: true,
  },

  // Momentum
  {
    id: 'mom-dual',
    name: 'Dual momentum',
    category: 'momentum',
    description: 'Positive 6m and 52w — trend followers',
    expression: 'priceChange52w > 20 & priceChange6m > 10 & priceChange3m > 0',
  },
  {
    id: 'mom-leaders',
    name: 'Relative strength leaders',
    category: 'momentum',
    description: 'Top-tier 52w gainers still above 6m trend',
    expression: 'priceChange52w > 40 & priceChange6m > 15 & vs_high > -15',
  },
  {
    id: 'mom-pullback',
    name: 'Pullback in uptrend',
    category: 'momentum',
    description: 'Strong 52w, mild 1m dip — buy-the-dip candidates',
    expression: 'priceChange52w > 25 & priceChange1m > -8 & priceChange1m < 3 & vs_high > -15',
  },

  // Compression / squeeze
  {
    id: 'sq-vol',
    name: 'Volatility squeeze',
    category: 'compression',
    description: '13w vol below 26w vol, price mid-range (coiling)',
    expression: 'realizedVol13w < 12 & realizedVol26w < 20 & rangePosition26w > 35 & rangePosition26w < 65',
    requiresWeekly: true,
  },
  {
    id: 'sq-tight',
    name: 'Tight range + low ATR',
    category: 'compression',
    description: 'Compressed weekly range with low daily ATR',
    expression: 'realizedVol26w < 16 & atrPercent < 3.5 & priceVs52wHigh > -18 & ch13w > -6 & ch13w < 6',
    requiresWeekly: true,
  },
  {
    id: 'sq-base',
    name: 'Base building',
    category: 'compression',
    description: 'Flat 13w change, positive long trend, not at highs',
    expression: 'ch13w > -4 & ch13w < 6 & priceChange52w > 10 & priceVs52wHigh < -8 & priceVs52wHigh > -25',
    requiresWeekly: true,
  },

  // RSI · MACD · Stochastic (weekly)
  {
    id: 'tech-rsi-oversold',
    name: 'RSI oversold (14w)',
    category: 'technical',
    description: 'RSI 25–38 — potential bounce zone',
    expression: 'rsi14 >= 25 & rsi14 <= 38 & avgVolume > 0.3',
    requiresWeekly: true,
  },
  {
    id: 'tech-rsi-momentum',
    name: 'RSI momentum zone',
    category: 'technical',
    description: 'RSI 55–72 with positive MACD histogram',
    expression: 'rsi14 >= 55 & rsi14 <= 72 & macdHist > 0 & priceChange13w > 0',
    requiresWeekly: true,
  },
  {
    id: 'tech-macd-bull',
    name: 'MACD bullish cross',
    category: 'technical',
    description: 'MACD line above signal, histogram positive',
    expression: 'macdHist > 0 & rsi14 > 45 & rsi14 < 78 & priceChange13w > 0',
    requiresWeekly: true,
  },
  {
    id: 'tech-stoch-oversold',
    name: 'Stochastic oversold',
    category: 'technical',
    description: 'Stoch %K below 25, off 52w lows',
    expression: 'stochK >= 8 & stochK <= 25 & priceVs52wLow > 15',
    requiresWeekly: true,
  },
  {
    id: 'tech-stoch-bull',
    name: 'Stochastic rising',
    category: 'technical',
    description: '%K above %D in 40–75 zone (weekly close-based)',
    expression: 'stochK >= 45 & stochK <= 72 & stochD >= 28 & stochD <= 52 & macdHist >= 0',
    requiresWeekly: true,
  },

  // Value & quality
  {
    id: 'val-garp',
    name: 'GARP',
    category: 'value',
    description: 'Reasonable PE, growing EPS, solid ROE',
    expression: 'peRatio > 5 & peRatio < 25 & epsGrowth > 10 & roe > 12',
  },
  {
    id: 'val-quality',
    name: 'Quality compounders',
    category: 'value',
    description: 'High ROE, moderate debt, profitable',
    expression: 'roe > 18 & debtToEquity < 1.2 & profitMargin > 10 & marketCap > 2000',
  },
  {
    id: 'val-div',
    name: 'Dividend quality',
    category: 'value',
    description: 'Yield + payout discipline + balance sheet',
    expression: 'dividendYield > 2 & payoutRatio < 70 & debtToEquity < 1.5 & roe > 10',
  },

  // Defensive
  {
    id: 'def-low-beta',
    name: 'Low beta defensive',
    category: 'defensive',
    description: 'Beta < 0.85, lower 30d volatility',
    expression: 'beta < 0.85 & volatility30d < 28 & marketCap > 5000',
  },
  {
    id: 'def-div-beta',
    name: 'Defensive income',
    category: 'defensive',
    description: 'Dividend payers with beta below market',
    expression: 'beta < 1 & dividendYield > 1.5 & volatility30d < 32',
  },
];

export function premadeFiltersByCategory(category: PremadeFilterCategory): PremadeFilter[] {
  return PREMADE_FILTERS.filter(f => f.category === category);
}
