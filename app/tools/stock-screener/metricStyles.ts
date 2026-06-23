import type { StockMetrics } from './types';
import type { ScreenerFilters } from './types';

export type MetricTone = 'good' | 'warn' | 'bad' | 'neutral';

export function passesFilters(metrics: StockMetrics, filters: ScreenerFilters): boolean {
  return (
    metrics.peRatio <= filters.maxPe &&
    metrics.epsGrowth >= filters.minEpsGrowth &&
    metrics.debtToEquity <= filters.maxDebtEquity &&
    metrics.rsi <= filters.maxRsi
  );
}

export function filterByMetrics<T extends StockMetrics>(
  items: T[],
  filters: ScreenerFilters,
  getMetrics: (item: T) => StockMetrics = (item) => item,
): T[] {
  return items.filter(item => passesFilters(getMetrics(item), filters));
}

export function peTone(pe: number): MetricTone {
  if (pe < 15) return 'good';
  if (pe > 40) return 'warn';
  return 'neutral';
}

export function epsTone(eps: number): MetricTone {
  if (eps >= 15) return 'good';
  if (eps < 0) return 'bad';
  return 'neutral';
}

export function debtTone(de: number): MetricTone {
  if (de < 0.5) return 'good';
  if (de > 2) return 'bad';
  return 'neutral';
}

export function rsiTone(rsi: number): MetricTone {
  if (rsi < 30) return 'good';
  if (rsi > 70) return 'bad';
  return 'neutral';
}
