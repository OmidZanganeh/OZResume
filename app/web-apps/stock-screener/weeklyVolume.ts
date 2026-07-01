import type { WeeklyBar } from './types';

const TRADING_DAYS_PER_WEEK = 5;
/** ~10 trading days — two full weekly bars ending at the screen date. */
const DEFAULT_LOOKBACK_WEEKS = 2;

function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/**
 * Avg daily share volume (millions/day) from Yahoo weekly bars ending at `barIdx`.
 * `barIdx` is newest-first (0 = latest week).
 */
export function avgDailyVolumeAtBarIndex(
  bars: WeeklyBar[],
  barIdx: number,
  lookbackWeeks = DEFAULT_LOOKBACK_WEEKS,
): number | null {
  if (barIdx < 0 || barIdx >= bars.length) return null;

  let shareSum = 0;
  let weeksWithVol = 0;
  for (let w = 0; w < lookbackWeeks; w++) {
    const i = barIdx + w;
    if (i >= bars.length) break;
    const v = bars[i]!.v;
    if (v != null && Number.isFinite(v) && v > 0) {
      shareSum += v;
      weeksWithVol += 1;
    }
  }

  if (weeksWithVol === 0) return null;

  const tradingDays = weeksWithVol * TRADING_DAYS_PER_WEEK;
  const avgDailyShares = shareSum / tradingDays;
  return round(avgDailyShares / 1_000_000, 1);
}

export function weeklyBarsHaveVolume(bars: WeeklyBar[]): boolean {
  return bars.some(b => b.v != null && b.v > 0);
}
