import type { StockMetrics } from './types';
import { formatMarketCap } from './metricFormat';

export type MetricTone = 'good' | 'warn' | 'bad' | 'neutral';

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

export function returnTone(v: number): MetricTone {
  if (v > 10) return 'good';
  if (v < 0) return 'bad';
  return 'neutral';
}

export const CARD_METRICS: {
  key: keyof StockMetrics;
  label: string;
  format: (v: number) => string;
  tone?: (v: number) => MetricTone;
}[] = [
  { key: 'peRatio', label: 'P/E', format: v => v.toFixed(1), tone: peTone },
  { key: 'epsGrowth', label: 'EPS', format: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, tone: epsTone },
  { key: 'roe', label: 'ROE', format: v => `${v.toFixed(0)}%` },
  { key: 'debtToEquity', label: 'D/E', format: v => v.toFixed(2), tone: debtTone },
  { key: 'price', label: 'Price', format: v => `$${v.toFixed(2)}` },
  { key: 'marketCap', label: 'Mkt Cap', format: v => formatMarketCap(v) },
  { key: 'priceChange52w', label: '52W', format: v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`, tone: returnTone },
];
