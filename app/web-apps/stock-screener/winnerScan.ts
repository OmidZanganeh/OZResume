import { priceMomentumProfile } from './historical';
import { formatAsOfDate } from './timelineDate';
import {
  fundamentalProfileFromMetrics,
  rankSimilarityToday,
  type PatternProfile,
  type SimilarityMatch,
} from './similarity';
import type { Stock, StockSnapshot } from './types';

export interface WinnerScanConfig {
  lookbackDaysAgo: number;
  minReturnPct: number;
  maxWinners: number;
}

export interface HistoricalWinner {
  ticker: string;
  sector: string;
  companyName: string;
  returnToTodayPct: number;
  priceThen: number;
  pattern: PatternProfile;
}

export interface WinnerScanResult {
  lookbackDaysAgo: number;
  asOfLabel: string;
  minReturnPct: number;
  winners: HistoricalWinner[];
  todayMatches: SimilarityMatch[];
}

export const WINNER_LOOKBACK_OPTIONS = [
  { days: 365, label: '1y ago' },
  { days: 730, label: '2y ago' },
  { days: 1095, label: '3y ago' },
] as const;

export const WINNER_RETURN_THRESHOLDS = [50, 100, 150, 200] as const;

export function findHistoricalWinners(
  stocks: Stock[],
  snapshots: Map<string, StockSnapshot>,
  lookbackDaysAgo: number,
  minReturnPct: number,
  maxWinners: number,
): HistoricalWinner[] {
  const candidates: HistoricalWinner[] = [];

  for (const stock of stocks) {
    const snap = snapshots.get(stock.ticker);
    if (!snap || !Number.isFinite(snap.returnToTodayPct)) continue;
    if (snap.returnToTodayPct < minReturnPct) continue;

    const momentum = priceMomentumProfile(stock, lookbackDaysAgo);
    if (!momentum) continue;

    candidates.push({
      ticker: stock.ticker,
      sector: stock.sector,
      companyName: stock.companyName,
      returnToTodayPct: snap.returnToTodayPct,
      priceThen: snap.priceThen,
      pattern: {
        momentum,
        fundamentals: fundamentalProfileFromMetrics(snap),
      },
    });
  }

  candidates.sort((a, b) => b.returnToTodayPct - a.returnToTodayPct);
  return candidates.slice(0, maxWinners);
}

export function computeWinnerScan(
  stocks: Stock[],
  lookbackSnapshots: Map<string, StockSnapshot>,
  todayPatterns: Map<string, PatternProfile>,
  config: WinnerScanConfig,
): WinnerScanResult {
  const winners = findHistoricalWinners(
    stocks,
    lookbackSnapshots,
    config.lookbackDaysAgo,
    config.minReturnPct,
    config.maxWinners,
  );

  const referencePatterns = winners.map(w => w.pattern);
  const exclude = winners.map(w => w.ticker);
  const todayMatches = referencePatterns.length > 0
    ? rankSimilarityToday(referencePatterns, todayPatterns, exclude, 48)
    : [];

  return {
    lookbackDaysAgo: config.lookbackDaysAgo,
    asOfLabel: formatAsOfDate(config.lookbackDaysAgo),
    minReturnPct: config.minReturnPct,
    winners,
    todayMatches,
  };
}
