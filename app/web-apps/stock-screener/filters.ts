import type { Sector, Stock, StockMetrics } from './types';
import { evaluateFilterAst, type CodeFilterContext } from './filterExpression';
import { getParsedExpression } from './filterExpressionCache';

export type { CodeFilterContext };

export type FilterCategory = 'fundamental' | 'technical';

export type FilterId = keyof StockMetrics;

export interface FilterRange {
  enabled: boolean;
  min: number;
  max: number;
}

export type FilterMode = 'visual' | 'code';

export interface ScreenerState {
  filters: Record<FilterId, FilterRange>;
  sectorFilterEnabled: boolean;
  sectors: Sector[];
  filterMode: FilterMode;
  /** Code filter, e.g. `PE > 10 & 52W > 55` — used when filterMode is `code`. */
  codeExpression: string;
}

export interface FilterDef {
  id: FilterId;
  category: FilterCategory;
  label: string;
  explanation: string;
  min: number;
  max: number;
  step: number;
  defaultMin: number;
  defaultMax: number;
  format: (v: number) => string;
  metricKey: FilterId;
}

export const ALL_SECTORS: Sector[] = ['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer'];

export const DEFAULT_ENABLED: FilterId[] = [];

export const FILTER_CATEGORIES: {
  id: FilterCategory;
  label: string;
  description: string;
}[] = [
  {
    id: 'fundamental',
    label: 'Fundamental',
    description: 'Company financials, valuation, and business quality — what the business earns, owes, and returns to shareholders.',
  },
  {
    id: 'technical',
    label: 'Technical',
    description: 'Price action, volume, and chart-derived indicators — how the stock is trading relative to history and trends.',
  },
];

const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`;
const dol = (v: number) => `$${v.toFixed(0)}`;
const mcap = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v.toFixed(0)}M`);

export const FILTER_DEFS: FilterDef[] = [
  // ── Fundamental: Valuation ──────────────────────────────────────────────
  {
    id: 'peRatio', category: 'fundamental', label: 'P/E Ratio (Trailing)',
    explanation: 'Share price divided by earnings per share over the last 12 months. Lower P/E can mean undervaluation or weak growth expectations; very high P/E often signals strong growth priced in.',
    min: 0, max: 100, step: 1, defaultMin: 0, defaultMax: 100, format: v => v.toFixed(0), metricKey: 'peRatio',
  },
  {
    id: 'forwardPe', category: 'fundamental', label: 'Forward P/E',
    explanation: 'Price divided by estimated earnings for the next 12 months. Compares to trailing P/E to see if analysts expect earnings to grow (forward lower) or shrink (forward higher).',
    min: 0, max: 80, step: 1, defaultMin: 0, defaultMax: 80, format: v => v.toFixed(0), metricKey: 'forwardPe',
  },
  {
    id: 'pegRatio', category: 'fundamental', label: 'PEG Ratio',
    explanation: 'P/E divided by EPS growth rate. Near 1.0 is often considered fair; below 1 may suggest growth at a reasonable price; above 2 can mean you are paying a premium for growth.',
    min: 0, max: 5, step: 0.1, defaultMin: 0, defaultMax: 5, format: v => v.toFixed(1), metricKey: 'pegRatio',
  },
  {
    id: 'pbRatio', category: 'fundamental', label: 'P/B Ratio',
    explanation: 'Market price divided by book value per share. Useful for banks and asset-heavy firms. Below 1 trades under accounting book value; very high P/B suits asset-light growth companies.',
    min: 0, max: 20, step: 0.1, defaultMin: 0, defaultMax: 20, format: v => v.toFixed(1), metricKey: 'pbRatio',
  },
  {
    id: 'psRatio', category: 'fundamental', label: 'P/S Ratio',
    explanation: 'Market cap divided by annual revenue. Helpful when earnings are negative or volatile. Lower values can indicate a cheaper sales multiple; tech leaders often trade at higher P/S.',
    min: 0, max: 30, step: 0.1, defaultMin: 0, defaultMax: 30, format: v => v.toFixed(1), metricKey: 'psRatio',
  },
  {
    id: 'pcfRatio', category: 'fundamental', label: 'P/CF Ratio',
    explanation: 'Price divided by cash flow per share. Cash flow is harder to manipulate than earnings, so this complements P/E when assessing whether cash generation supports the valuation.',
    min: 0, max: 50, step: 0.5, defaultMin: 0, defaultMax: 50, format: v => v.toFixed(1), metricKey: 'pcfRatio',
  },
  {
    id: 'evToEbitda', category: 'fundamental', label: 'EV / EBITDA',
    explanation: 'Enterprise value divided by EBITDA. A common M&A and leverage-aware valuation metric. Lower multiples may indicate relative cheapness; compare within the same industry.',
    min: 0, max: 40, step: 0.5, defaultMin: 0, defaultMax: 40, format: v => v.toFixed(1), metricKey: 'evToEbitda',
  },
  {
    id: 'marketCap', category: 'fundamental', label: 'Market Cap',
    explanation: 'Total market value of outstanding shares. Filter by company size: small cap (higher risk/reward), mid cap, or large cap (often more liquid and stable).',
    min: 0, max: 500_000, step: 100, defaultMin: 0, defaultMax: 500_000, format: mcap, metricKey: 'marketCap',
  },

  // ── Fundamental: Growth ───────────────────────────────────────────────────
  {
    id: 'epsGrowth', category: 'fundamental', label: 'EPS Growth (YoY)',
    explanation: 'Year-over-year change in earnings per share. Positive growth shows improving profitability; consistent double-digit growth is a hallmark of growth investing screens.',
    min: -20, max: 100, step: 1, defaultMin: -20, defaultMax: 100, format: pct, metricKey: 'epsGrowth',
  },
  {
    id: 'revenueGrowth', category: 'fundamental', label: 'Revenue Growth (YoY)',
    explanation: 'Year-over-year change in total sales. Revenue growth can lead earnings growth; screening for top-line expansion finds companies gaining market share before margins expand.',
    min: -20, max: 80, step: 1, defaultMin: -20, defaultMax: 80, format: pct, metricKey: 'revenueGrowth',
  },

  // ── Fundamental: Profitability ────────────────────────────────────────────
  {
    id: 'profitMargin', category: 'fundamental', label: 'Net Profit Margin',
    explanation: 'Net income as a percentage of revenue. Shows how much profit remains after all expenses. Higher margins often reflect pricing power, efficiency, or a scalable business model.',
    min: -15, max: 50, step: 0.5, defaultMin: -15, defaultMax: 50, format: v => `${v.toFixed(1)}%`, metricKey: 'profitMargin',
  },
  {
    id: 'grossMargin', category: 'fundamental', label: 'Gross Margin',
    explanation: 'Revenue minus cost of goods sold, as a percent of revenue. Measures core product economics before operating expenses. Software and luxury brands often show very high gross margins.',
    min: 0, max: 90, step: 0.5, defaultMin: 0, defaultMax: 90, format: v => `${v.toFixed(1)}%`, metricKey: 'grossMargin',
  },
  {
    id: 'operatingMargin', category: 'fundamental', label: 'Operating Margin',
    explanation: 'Operating income divided by revenue. Reflects profitability from core operations before interest and taxes — useful for comparing operational efficiency across competitors.',
    min: -20, max: 45, step: 0.5, defaultMin: -20, defaultMax: 45, format: v => `${v.toFixed(1)}%`, metricKey: 'operatingMargin',
  },
  {
    id: 'roe', category: 'fundamental', label: 'ROE (Return on Equity)',
    explanation: 'Net income divided by shareholder equity. Shows how effectively management uses equity capital. Consistently high ROE (15%+) is favored by quality investors; very high ROE can reflect high leverage.',
    min: -20, max: 60, step: 1, defaultMin: -20, defaultMax: 60, format: v => `${v.toFixed(0)}%`, metricKey: 'roe',
  },
  {
    id: 'roa', category: 'fundamental', label: 'ROA (Return on Assets)',
    explanation: 'Net income divided by total assets. Especially useful for capital-intensive industries. Higher ROA means more profit generated per dollar of assets on the balance sheet.',
    min: -15, max: 30, step: 0.5, defaultMin: -15, defaultMax: 30, format: v => `${v.toFixed(1)}%`, metricKey: 'roa',
  },
  {
    id: 'roic', category: 'fundamental', label: 'ROIC',
    explanation: 'Return on invested capital — measures return on debt + equity capital employed. Favored in quality screens; sustained ROIC above the cost of capital suggests value-creating growth.',
    min: -10, max: 40, step: 0.5, defaultMin: -10, defaultMax: 40, format: v => `${v.toFixed(1)}%`, metricKey: 'roic',
  },

  // ── Fundamental: Financial health ─────────────────────────────────────────
  {
    id: 'debtToEquity', category: 'fundamental', label: 'Debt / Equity',
    explanation: 'Total debt divided by shareholder equity. Measures financial leverage. Low D/E (<0.5) is conservative; high D/E increases risk in downturns but can amplify returns in good times.',
    min: 0, max: 5, step: 0.1, defaultMin: 0, defaultMax: 5, format: v => v.toFixed(1), metricKey: 'debtToEquity',
  },
  {
    id: 'debtToAssets', category: 'fundamental', label: 'Debt / Assets',
    explanation: 'Total debt as a percentage of total assets. Shows what portion of the asset base is financed by debt rather than equity — a balance-sheet view of leverage.',
    min: 0, max: 90, step: 1, defaultMin: 0, defaultMax: 90, format: v => `${v.toFixed(0)}%`, metricKey: 'debtToAssets',
  },
  {
    id: 'currentRatio', category: 'fundamental', label: 'Current Ratio',
    explanation: 'Current assets divided by current liabilities. Measures short-term liquidity. Above 1.0 means current assets cover near-term obligations; below 1 may signal liquidity stress.',
    min: 0, max: 5, step: 0.1, defaultMin: 0, defaultMax: 5, format: v => v.toFixed(1), metricKey: 'currentRatio',
  },
  {
    id: 'quickRatio', category: 'fundamental', label: 'Quick Ratio',
    explanation: 'Liquid assets (cash + receivables) divided by current liabilities. A stricter liquidity test than current ratio because it excludes inventory. Above 1.0 is generally healthy.',
    min: 0, max: 4, step: 0.1, defaultMin: 0, defaultMax: 4, format: v => v.toFixed(1), metricKey: 'quickRatio',
  },
  {
    id: 'interestCoverage', category: 'fundamental', label: 'Interest Coverage',
    explanation: 'EBIT divided by interest expense — how many times operating earnings cover interest payments. Below 1.5 is risky; above 5 suggests comfortable debt service capacity.',
    min: 0, max: 30, step: 0.5, defaultMin: 0, defaultMax: 30, format: v => `${v.toFixed(1)}×`, metricKey: 'interestCoverage',
  },

  // ── Fundamental: Shareholder returns ────────────────────────────────────
  {
    id: 'dividendYield', category: 'fundamental', label: 'Dividend Yield',
    explanation: 'Annual dividend per share divided by stock price. Income investors screen for yield; unusually high yield can mean a falling price or an unsustainable payout.',
    min: 0, max: 12, step: 0.1, defaultMin: 0, defaultMax: 12, format: v => `${v.toFixed(1)}%`, metricKey: 'dividendYield',
  },
  {
    id: 'payoutRatio', category: 'fundamental', label: 'Payout Ratio',
    explanation: 'Dividends paid as a percentage of earnings. Low payout leaves room to reinvest; very high payout (>80%) may be hard to sustain if earnings dip.',
    min: 0, max: 120, step: 1, defaultMin: 0, defaultMax: 120, format: v => `${v.toFixed(0)}%`, metricKey: 'payoutRatio',
  },
  {
    id: 'freeCashFlowYield', category: 'fundamental', label: 'FCF Yield',
    explanation: 'Free cash flow divided by market cap. Shows cash return available to shareholders relative to price. Higher FCF yield can indicate undervaluation or strong cash generation.',
    min: -5, max: 20, step: 0.1, defaultMin: -5, defaultMax: 20, format: v => `${v.toFixed(1)}%`, metricKey: 'freeCashFlowYield',
  },

  // ── Technical: Price & momentum ─────────────────────────────────────────
  {
    id: 'price', category: 'technical', label: 'Share Price',
    explanation: 'Last traded price per share. Filter by absolute price level — useful for avoiding penny stocks or focusing on a price band for position sizing.',
    min: 0, max: 500, step: 1, defaultMin: 0, defaultMax: 500, format: dol, metricKey: 'price',
  },
  {
    id: 'priceChange1m', category: 'technical', label: '1-Month Change',
    explanation: 'Percentage price change over the last month. Captures very recent momentum — positive values indicate short-term strength; large negatives may flag pullbacks or reversals.',
    min: -40, max: 60, step: 1, defaultMin: -40, defaultMax: 60, format: pct, metricKey: 'priceChange1m',
  },
  {
    id: 'priceChange3m', category: 'technical', label: '3-Month Change',
    explanation: 'Quarterly price performance. Bridges short-term noise and medium-term trend — popular for momentum screens that want sustained moves without 52-week lag.',
    min: -50, max: 80, step: 1, defaultMin: -50, defaultMax: 80, format: pct, metricKey: 'priceChange3m',
  },
  {
    id: 'priceChange6m', category: 'technical', label: '6-Month Change',
    explanation: 'Half-year price return. Often used in dual-momentum strategies alongside 12-month returns to confirm a trend is not just a recent spike.',
    min: -55, max: 100, step: 1, defaultMin: -55, defaultMax: 100, format: pct, metricKey: 'priceChange6m',
  },
  {
    id: 'priceChange52w', category: 'technical', label: '52-Week Change',
    explanation: 'Total price change over the past year. Classic momentum filter — buying winners (positive) vs contrarian approaches that hunt large declines.',
    min: -60, max: 150, step: 1, defaultMin: -60, defaultMax: 150, format: pct, metricKey: 'priceChange52w',
  },
  {
    id: 'priceVs52wHigh', category: 'technical', label: 'Distance from 52W High',
    explanation: 'How far below the 52-week high the stock trades (negative %). Near 0% means at highs; -20% or more is a meaningful pullback from peak — breakout traders often want proximity to highs.',
    min: -60, max: 0, step: 1, defaultMin: -60, defaultMax: 0, format: pct, metricKey: 'priceVs52wHigh',
  },
  {
    id: 'priceVs52wLow', category: 'technical', label: 'Distance from 52W Low',
    explanation: 'How far above the 52-week low the stock trades (positive %). Large values show recovery from lows; small values may indicate stocks still near troubled levels.',
    min: 0, max: 200, step: 1, defaultMin: 0, defaultMax: 200, format: pct, metricKey: 'priceVs52wLow',
  },
  // ── Technical: Volume & volatility ────────────────────────────────────────
  {
    id: 'avgVolume', category: 'technical', label: 'Avg Daily Volume',
    explanation: 'Average shares traded per day (millions). Live from Yahoo weekly volume; Finnhub 10-day avg when Yahoo is not loaded yet.',
    min: 0, max: 50, step: 0.1, defaultMin: 0, defaultMax: 50, format: v => `${v.toFixed(1)}M`, metricKey: 'avgVolume',
  },
  {
    id: 'volatility30d', category: 'technical', label: '30-Day Volatility',
    explanation: 'Annualized standard deviation of daily returns over 30 days. Higher volatility = larger price swings. Risk-averse screens cap this; options traders may seek higher vol.',
    min: 5, max: 80, step: 1, defaultMin: 5, defaultMax: 80, format: v => `${v.toFixed(0)}%`, metricKey: 'volatility30d',
  },
  {
    id: 'atrPercent', category: 'technical', label: 'ATR % of Price',
    explanation: 'Average True Range as a percentage of price — measures typical daily trading range. Useful for stop-loss placement and comparing volatility across different price levels.',
    min: 0.5, max: 15, step: 0.1, defaultMin: 0.5, defaultMax: 15, format: v => `${v.toFixed(1)}%`, metricKey: 'atrPercent',
  },
  {
    id: 'beta', category: 'technical', label: 'Beta',
    explanation: 'Sensitivity to market moves vs the S&P 500. Beta 1.0 moves with the market; >1 is more volatile; <1 is defensive. Low-beta screens reduce portfolio market risk.',
    min: 0, max: 3, step: 0.05, defaultMin: 0, defaultMax: 3, format: v => v.toFixed(2), metricKey: 'beta',
  },
];

function buildDefaultFilters(): Record<FilterId, FilterRange> {
  const out = {} as Record<FilterId, FilterRange>;
  for (const def of FILTER_DEFS) {
    out[def.id] = {
      enabled: DEFAULT_ENABLED.includes(def.id),
      min: def.defaultMin,
      max: def.defaultMax,
    };
  }
  return out;
}

export const DEFAULT_SCREENER_STATE: ScreenerState = {
  filters: buildDefaultFilters(),
  sectorFilterEnabled: false,
  sectors: [],
  filterMode: 'visual',
  codeExpression: '',
};

export function filtersByCategory(category: FilterCategory): FilterDef[] {
  return FILTER_DEFS.filter(d => d.category === category);
}

export function isDefaultState(state: ScreenerState): boolean {
  if (state.filterMode === 'code' && state.codeExpression.trim()) return false;
  if (state.sectorFilterEnabled) return false;
  if (state.sectors.length > 0) return false;
  return FILTER_DEFS.every(def => {
    const f = state.filters[def.id];
    return (
      f.enabled === DEFAULT_ENABLED.includes(def.id) &&
      f.min === def.defaultMin &&
      f.max === def.defaultMax
    );
  });
}

function passesVisualFilters(
  stock: Stock,
  metrics: StockMetrics,
  state: ScreenerState,
): boolean {
  if (state.sectorFilterEnabled && state.sectors.length > 0) {
    if (!state.sectors.includes(stock.sector)) return false;
  }

  for (const def of FILTER_DEFS) {
    const f = state.filters[def.id];
    if (!f?.enabled) continue;
    const val = metrics[def.metricKey];
    if (val < f.min || val > f.max) return false;
  }

  return true;
}

export function passesScreen(
  stock: Stock,
  metrics: StockMetrics,
  state: ScreenerState,
  ctx?: CodeFilterContext,
): boolean {
  if (state.filterMode === 'code') {
    const expr = state.codeExpression.trim();
    if (!expr) return true;
    const { ast, error } = getParsedExpression(expr);
    if (error || !ast) return true;
    return evaluateFilterAst(ast, stock, metrics, ctx);
  }

  return passesVisualFilters(stock, metrics, state);
}

export function codeFilterError(state: ScreenerState): string | null {
  if (state.filterMode !== 'code') return null;
  const expr = state.codeExpression.trim();
  if (!expr) return null;
  return getParsedExpression(expr).error;
}

export function isCodeFilterActive(state: ScreenerState): boolean {
  if (state.filterMode !== 'code') return false;
  const expr = state.codeExpression.trim();
  if (!expr) return false;
  const { ast, error } = getParsedExpression(expr);
  return !error && ast != null;
}

export function enabledFilterCount(state: ScreenerState): number {
  if (state.filterMode === 'code') {
    return isCodeFilterActive(state) ? 1 : 0;
  }
  let n = Object.values(state.filters).filter(f => f.enabled).length;
  if (state.sectorFilterEnabled) n += 1;
  return n;
}

export function getFilterDef(id: FilterId): FilterDef {
  const def = FILTER_DEFS.find(d => d.id === id);
  if (!def) throw new Error(`Unknown filter: ${id}`);
  return def;
}

export function activeMetricFilterIds(state: ScreenerState): FilterId[] {
  return FILTER_DEFS.filter(d => state.filters[d.id]?.enabled).map(d => d.id);
}

export function inactiveMetricFilterIds(state: ScreenerState): FilterId[] {
  return FILTER_DEFS.filter(d => !state.filters[d.id]?.enabled).map(d => d.id);
}

export function enableFilter(state: ScreenerState, id: FilterId): ScreenerState {
  const def = getFilterDef(id);
  return {
    ...state,
    filters: {
      ...state.filters,
      [id]: { enabled: true, min: def.defaultMin, max: def.defaultMax },
    },
  };
}

export function disableFilter(state: ScreenerState, id: FilterId): ScreenerState {
  const def = getFilterDef(id);
  return {
    ...state,
    filters: {
      ...state.filters,
      [id]: { enabled: false, min: def.defaultMin, max: def.defaultMax },
    },
  };
}
