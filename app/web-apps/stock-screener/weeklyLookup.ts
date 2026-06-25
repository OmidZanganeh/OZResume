import type { WeeklyBar } from './types';
import { daysAgoToDate } from './timelineDate';

const MAX_BAR_DRIFT_SEC = 21 * 86400;

/** Pick the weekly bar closest to targetTs (within ~3 weeks). */
export function closestWeeklyBar(bars: WeeklyBar[], targetTs: number): WeeklyBar | null {
  const idx = barIndexNearTs(bars, targetTs, true);
  return idx == null ? null : bars[idx]!;
}

function barIndexNearTs(bars: WeeklyBar[], targetTs: number, allowLoose = false): number | null {
  if (bars.length === 0) return null;
  let bestIdx = 0;
  let bestDiff = Math.abs(bars[0]!.t - targetTs);
  for (let i = 1; i < bars.length; i++) {
    const diff = Math.abs(bars[i]!.t - targetTs);
    if (diff < bestDiff) {
      bestIdx = i;
      bestDiff = diff;
    }
  }
  if (bestDiff <= MAX_BAR_DRIFT_SEC) return bestIdx;
  const looseDays = bars.length > 400 ? 14 : 35;
  if (allowLoose && bestDiff <= looseDays * 86400) return bestIdx;
  return null;
}

export function barIndexAtDaysAgo(bars: WeeklyBar[], daysAgo: number): number | null {
  const targetTs = Math.floor(daysAgoToDate(daysAgo).getTime() / 1000);
  return barIndexNearTs(bars, targetTs, true);
}
