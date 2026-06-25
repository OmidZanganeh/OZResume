import type { WeeklyBar } from './types';

/** Pick the weekly bar whose date is closest to targetTs (within ~10 days). */
export function closestWeeklyBar(bars: WeeklyBar[], targetTs: number): WeeklyBar | null {
  const MAX_DRIFT_SEC = 10 * 86400;
  if (bars.length === 0) return null;
  let best = bars[0]!;
  let bestDiff = Math.abs(best.t - targetTs);
  for (const bar of bars) {
    const diff = Math.abs(bar.t - targetTs);
    if (diff < bestDiff) {
      best = bar;
      bestDiff = diff;
    }
  }
  return bestDiff <= MAX_DRIFT_SEC ? best : null;
}
