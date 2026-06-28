import type { Sector } from '../types';

/** Shared palette for screener charts (dark dashboard). */
export const CHART = {
  bg: '#0a0e16',
  grid: 'rgba(255,255,255,0.06)',
  text: 'rgba(255,255,255,0.55)',
  textBright: '#e8edf5',
  up: '#3ecf8e',
  down: '#f87171',
  accent: '#6366f1',
  accent2: '#14b8a6',
  benchmark: 'rgba(255,255,255,0.35)',
  marker: '#fbbf24',
  crosshair: 'rgba(255,255,255,0.12)',
} as const;

export const SECTOR_COLORS: Record<Sector, string> = {
  Tech: '#6366f1',
  Healthcare: '#14b8a6',
  Finance: '#fbbf24',
  Energy: '#f97316',
  Consumer: '#ec4899',
};

export const COMPARE_PALETTE = [
  '#6366f1',
  '#14b8a6',
  '#fbbf24',
  '#ec4899',
  '#3ecf8e',
  CHART.benchmark,
] as const;

export function returnColor(v: number): string {
  if (v > 0.5) return CHART.up;
  if (v < -0.5) return CHART.down;
  return CHART.text;
}
