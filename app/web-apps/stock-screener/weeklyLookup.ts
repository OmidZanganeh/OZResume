import type { WeeklyBar } from './types';
import { daysAgoToDate } from './timelineDate';

const MAX_BAR_DRIFT_SEC = 21 * 86400;

export interface BarAtDaysAgo {
  idx: number;
  /** Screen date is before the first available weekly bar. */
  clampedToOldest: boolean;
}

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

/** Weekly bar for a past date; clamps to oldest bar when history starts later (IPOs/spinoffs). */
export function barForDaysAgo(bars: WeeklyBar[], daysAgo: number): BarAtDaysAgo | null {
  if (!bars.length) return null;
  const targetTs = Math.floor(daysAgoToDate(daysAgo).getTime() / 1000);
  const oldestIdx = bars.length - 1;
  const oldestTs = bars[oldestIdx]!.t;

  if (targetTs <= oldestTs - MAX_BAR_DRIFT_SEC) {
    return { idx: oldestIdx, clampedToOldest: true };
  }

  const idx = barIndexNearTs(bars, targetTs, true);
  if (idx != null) {
    return {
      idx,
      clampedToOldest: targetTs < oldestTs - MAX_BAR_DRIFT_SEC / 2,
    };
  }

  if (targetTs < oldestTs) {
    return { idx: oldestIdx, clampedToOldest: true };
  }

  return { idx: 0, clampedToOldest: false };
}

export function barIndexAtDaysAgo(bars: WeeklyBar[], daysAgo: number): number | null {
  return barForDaysAgo(bars, daysAgo)?.idx ?? null;
}

/** Calendar date of the oldest weekly bar (listing / spinoff floor). */
export function oldestBarDaysAgo(bars: WeeklyBar[]): number {
  if (!bars.length) return 0;
  const oldestTs = bars[bars.length - 1]!.t;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const barDate = new Date(oldestTs * 1000);
  barDate.setHours(12, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - barDate.getTime()) / 86_400_000));
}
