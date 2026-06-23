import type { StockMetrics } from './types';

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

export function rsiTone(rsi: number): MetricTone {
  if (rsi < 30) return 'good';
  if (rsi > 70) return 'bad';
  return 'neutral';
}

export function returnTone(v: number): MetricTone {
  if (v > 10) return 'good';
  if (v < 0) return 'bad';
  return 'neutral';
}

export function formatMarketCap(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
}

export const CARD_METRICS: {
  key: keyof StockMetrics;
  label: string;
  format: (v: number, rsiPeriod?: number) => string;
  tone?: (v: number) => MetricTone;
}[] = [
  { key: 'peRatio', label: 'P/E', format: v => v.toFixed(1), tone: peTone },
  { key: 'epsGrowth', label: 'EPS', format: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, tone: epsTone },
  { key: 'debtToEquity', label: 'D/E', format: v => v.toFixed(2), tone: debtTone },
  { key: 'rsi', label: 'RSI', format: (v, p) => p ? `${v.toFixed(0)} (${p})` : v.toFixed(0), tone: rsiTone },
  { key: 'price', label: 'Price', format: v => `$${v.toFixed(0)}` },
  { key: 'marketCap', label: 'Mkt Cap', format: v => formatMarketCap(v) },
  { key: 'roe', label: 'ROE', format: v => `${v.toFixed(0)}%` },
  { key: 'beta', label: 'Beta', format: v => v.toFixed(2) },
];
