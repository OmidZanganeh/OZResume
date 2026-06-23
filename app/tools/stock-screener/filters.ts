import type { Sector, Stock, StockMetrics } from './types';

export type FilterId =
  | 'pe'
  | 'epsGrowth'
  | 'debtEquity'
  | 'rsi'
  | 'price'
  | 'marketCap'
  | 'dividendYield'
  | 'roe'
  | 'profitMargin'
  | 'revenueGrowth'
  | 'beta'
  | 'pbRatio'
  | 'currentRatio'
  | 'avgVolume'
  | 'priceChange52w';

export interface FilterRange {
  enabled: boolean;
  min: number;
  max: number;
}

export interface ScreenerState {
  rsiPeriod: number;
  filters: Record<FilterId, FilterRange>;
  sectorFilterEnabled: boolean;
  sectors: Sector[];
}

export interface FilterDef {
  id: FilterId;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  defaultMin: number;
  defaultMax: number;
  format: (v: number) => string;
  metricKey: keyof StockMetrics;
}

export const RSI_PERIODS = [7, 9, 14, 21, 28] as const;

export const ALL_SECTORS: Sector[] = ['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer'];

export const FILTER_DEFS: FilterDef[] = [
  {
    id: 'pe', label: 'P/E Ratio', hint: 'Price-to-earnings — lower often means value',
    min: 0, max: 100, step: 1, defaultMin: 0, defaultMax: 100,
    format: v => v.toFixed(0), metricKey: 'peRatio',
  },
  {
    id: 'epsGrowth', label: 'EPS Growth (%)', hint: 'Year-over-year earnings growth',
    min: -20, max: 100, step: 1, defaultMin: -20, defaultMax: 100,
    format: v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`, metricKey: 'epsGrowth',
  },
  {
    id: 'debtEquity', label: 'Debt / Equity', hint: 'Leverage ratio — lower is more conservative',
    min: 0, max: 5, step: 0.1, defaultMin: 0, defaultMax: 5,
    format: v => v.toFixed(1), metricKey: 'debtToEquity',
  },
  {
    id: 'rsi', label: 'RSI', hint: 'Relative strength — uses RSI period setting',
    min: 0, max: 100, step: 1, defaultMin: 0, defaultMax: 100,
    format: v => v.toFixed(0), metricKey: 'rsi',
  },
  {
    id: 'price', label: 'Share Price ($)', hint: 'Last traded price',
    min: 0, max: 500, step: 1, defaultMin: 0, defaultMax: 500,
    format: v => `$${v.toFixed(0)}`, metricKey: 'price',
  },
  {
    id: 'marketCap', label: 'Market Cap ($M)', hint: 'Market capitalization in millions',
    min: 0, max: 500_000, step: 100, defaultMin: 0, defaultMax: 500_000,
    format: v => v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v.toFixed(0)}M`,
    metricKey: 'marketCap',
  },
  {
    id: 'dividendYield', label: 'Dividend Yield (%)', hint: 'Annual dividend / share price',
    min: 0, max: 12, step: 0.1, defaultMin: 0, defaultMax: 12,
    format: v => `${v.toFixed(1)}%`, metricKey: 'dividendYield',
  },
  {
    id: 'roe', label: 'ROE (%)', hint: 'Return on equity',
    min: -20, max: 60, step: 1, defaultMin: -20, defaultMax: 60,
    format: v => `${v.toFixed(0)}%`, metricKey: 'roe',
  },
  {
    id: 'profitMargin', label: 'Profit Margin (%)', hint: 'Net income / revenue',
    min: -15, max: 50, step: 0.5, defaultMin: -15, defaultMax: 50,
    format: v => `${v.toFixed(1)}%`, metricKey: 'profitMargin',
  },
  {
    id: 'revenueGrowth', label: 'Revenue Growth (%)', hint: 'Year-over-year revenue change',
    min: -20, max: 80, step: 1, defaultMin: -20, defaultMax: 80,
    format: v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`, metricKey: 'revenueGrowth',
  },
  {
    id: 'beta', label: 'Beta', hint: 'Volatility vs market (1.0 = market)',
    min: 0, max: 3, step: 0.05, defaultMin: 0, defaultMax: 3,
    format: v => v.toFixed(2), metricKey: 'beta',
  },
  {
    id: 'pbRatio', label: 'P/B Ratio', hint: 'Price-to-book value',
    min: 0, max: 20, step: 0.1, defaultMin: 0, defaultMax: 20,
    format: v => v.toFixed(1), metricKey: 'pbRatio',
  },
  {
    id: 'currentRatio', label: 'Current Ratio', hint: 'Current assets / current liabilities',
    min: 0, max: 5, step: 0.1, defaultMin: 0, defaultMax: 5,
    format: v => v.toFixed(1), metricKey: 'currentRatio',
  },
  {
    id: 'avgVolume', label: 'Avg Volume (M)', hint: 'Average daily volume in millions of shares',
    min: 0, max: 50, step: 0.1, defaultMin: 0, defaultMax: 50,
    format: v => `${v.toFixed(1)}M`, metricKey: 'avgVolume',
  },
  {
    id: 'priceChange52w', label: '52-Week Change (%)', hint: 'Price change over the past year',
    min: -60, max: 150, step: 1, defaultMin: -60, defaultMax: 150,
    format: v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`, metricKey: 'priceChange52w',
  },
];

function buildDefaultFilters(): Record<FilterId, FilterRange> {
  const out = {} as Record<FilterId, FilterRange>;
  for (const def of FILTER_DEFS) {
    const enabled = ['pe', 'epsGrowth', 'debtEquity', 'rsi'].includes(def.id);
    out[def.id] = { enabled, min: def.defaultMin, max: def.defaultMax };
  }
  return out;
}

export const DEFAULT_SCREENER_STATE: ScreenerState = {
  rsiPeriod: 14,
  filters: buildDefaultFilters(),
  sectorFilterEnabled: false,
  sectors: [],
};

export function isDefaultState(state: ScreenerState): boolean {
  if (state.rsiPeriod !== 14) return false;
  if (state.sectorFilterEnabled) return false;
  if (state.sectors.length > 0) return false;
  return FILTER_DEFS.every(def => {
    const f = state.filters[def.id];
    return (
      f.enabled === ['pe', 'epsGrowth', 'debtEquity', 'rsi'].includes(def.id) &&
      f.min === def.defaultMin &&
      f.max === def.defaultMax
    );
  });
}

export function passesScreen(
  stock: Stock,
  metrics: StockMetrics,
  state: ScreenerState,
): boolean {
  if (state.sectorFilterEnabled && state.sectors.length > 0) {
    if (!state.sectors.includes(stock.sector)) return false;
  }

  for (const def of FILTER_DEFS) {
    const f = state.filters[def.id];
    if (!f.enabled) continue;
    const val = metrics[def.metricKey];
    if (val < f.min || val > f.max) return false;
  }

  return true;
}

export function enabledFilterCount(state: ScreenerState): number {
  let n = state.filters ? Object.values(state.filters).filter(f => f.enabled).length : 0;
  if (state.sectorFilterEnabled) n += 1;
  return n;
}
