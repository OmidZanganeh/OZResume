import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';

type WorkoutEntry = { exerciseId: string; trainedMuscleGroups?: MuscleGroup[] };
type WorkoutSession = { date: string; entries: WorkoutEntry[] };

export type MuscleSignalStatus = 'train_next' | 'recovering' | 'fresh' | 'undertrained' | 'balanced' | 'no_data';

export type MuscleMapSignal = {
  status: MuscleSignalStatus;
  /** Full days since the muscle was last trained; null means no history. */
  daysSinceLast: number | null;
  /** Unique training days inside the requested report/analysis window. */
  sessionsInWindow: number;
  sessionsLast7: number;
  sessionsLast14: number;
  recoveryTargetDays: number;
  lastHitDate: string | null;
  /** Higher score = stronger recommendation to train next. */
  nextScore: number;
};

const RECOVERY_TARGET_DAYS: Partial<Record<MuscleGroup, number>> = {
  Chest: 2,
  Back: 2,
  Shoulders: 2,
  Biceps: 1,
  Triceps: 1,
  Quads: 2,
  Hamstrings: 2,
  Glutes: 2,
  Calves: 1,
  Core: 1,
  Forearms: 1,
  Cardio: 1,
  Mobility: 0,
};

function startOfLocalDayMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function classifySignal(
  group: MuscleGroup,
  daysSinceLast: number | null,
  sessionsLast14: number,
): MuscleSignalStatus {
  const target = RECOVERY_TARGET_DAYS[group] ?? 2;
  const freshDays = 3;
  const recoveringUntil = Math.max(freshDays + 2, target + 2);

  if (daysSinceLast === null) return 'no_data';
  if (daysSinceLast <= freshDays) return 'fresh';
  if (daysSinceLast <= recoveringUntil) return 'recovering';
  if (
    group !== 'Cardio' &&
    group !== 'Mobility' &&
    sessionsLast14 === 0 &&
    daysSinceLast >= Math.max(30, target + 18)
  ) {
    return 'undertrained';
  }
  if (daysSinceLast >= Math.max(7, target + 4) && sessionsLast14 <= 2) return 'train_next';
  return 'balanced';
}

function scoreForNextTarget(
  status: MuscleSignalStatus,
  daysSinceLast: number | null,
  sessionsLast7: number,
  sessionsLast14: number,
): number {
  let score = 0;
  if (status === 'train_next') score += 60;
  if (status === 'undertrained') score += 70;
  if (status === 'balanced') score += 10;
  if (status === 'recovering') score -= 20;
  if (status === 'fresh') score -= 40;
  if (status === 'no_data') score += 20;
  score += daysSinceLast === null ? 14 : Math.min(daysSinceLast, 14);
  score += Math.max(0, 2 - sessionsLast14) * 8;
  score -= sessionsLast7 * 6;
  return score;
}

/**
 * Counts how many saved workout *entries* in the last `withinDays` days hit each muscle
 * (uses `trainedMuscleGroups` on the entry when present, else primary + secondary on the exercise).
 */
export function getPracticeCountsInWindow(
  sessions: WorkoutSession[],
  exerciseById: Map<string, Exercise>,
  withinDays: number,
): Map<MuscleGroup, number> {
  const counts = new Map<MuscleGroup, number>();
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;

  // Track unique days per muscle
  const muscleTrainedDays = new Map<MuscleGroup, Set<string>>();

  for (const session of sessions) {
    const dateObj = new Date(session.date);
    if (dateObj.getTime() < cutoff) continue;

    // Use YYYY-MM-DD to identify the unique day
    const dayKey = dateObj.toISOString().split('T')[0];

    for (const entry of session.entries) {
      const ex = exerciseById.get(entry.exerciseId);
      if (!ex) continue;
      const groups =
        entry.trainedMuscleGroups && entry.trainedMuscleGroups.length > 0
          ? entry.trainedMuscleGroups
          : [ex.primaryGroup, ...(ex.secondaryGroups ?? [])];
      
      for (const g of groups) {
        if (!muscleTrainedDays.has(g)) {
          muscleTrainedDays.set(g, new Set());
        }
        muscleTrainedDays.get(g)!.add(dayKey);
      }
    }
  }

  // Final count is the number of unique days recorded for that muscle
  for (const [group, days] of muscleTrainedDays.entries()) {
    counts.set(group, days.size);
  }

  return counts;
}

/**
 * Unified body-map signal model:
 * - recency (`daysSinceLast`)
 * - frequency in 7/14d windows
 * - recommendation status + score ("what to train next")
 */
export function getMuscleSignals(
  sessions: WorkoutSession[],
  exerciseById: Map<string, Exercise>,
  withinDays: number,
): Map<MuscleGroup, MuscleMapSignal> {
  const todayMs = startOfLocalDayMs(new Date());
  const daySetsWindow = new Map<MuscleGroup, Set<string>>();
  const daySets7 = new Map<MuscleGroup, Set<string>>();
  const daySets14 = new Map<MuscleGroup, Set<string>>();
  const lastHitByGroup = new Map<MuscleGroup, string>();

  for (const session of sessions) {
    const d = new Date(session.date);
    if (!Number.isFinite(d.getTime())) continue;
    const dayMs = startOfLocalDayMs(d);
    const daysAgo = Math.floor((todayMs - dayMs) / 86400000);
    const dayKey = toDayKey(d);

    for (const entry of session.entries ?? []) {
      const ex = exerciseById.get(entry.exerciseId);
      if (!ex) continue;
      const groups =
        entry.trainedMuscleGroups && entry.trainedMuscleGroups.length > 0
          ? entry.trainedMuscleGroups
          : [ex.primaryGroup, ...(ex.secondaryGroups ?? [])];

      for (const g of groups) {
        const prev = lastHitByGroup.get(g);
        if (!prev || dayKey > prev) lastHitByGroup.set(g, dayKey);

        if (daysAgo < withinDays) {
          if (!daySetsWindow.has(g)) daySetsWindow.set(g, new Set<string>());
          daySetsWindow.get(g)!.add(dayKey);
        }
        if (daysAgo < 7) {
          if (!daySets7.has(g)) daySets7.set(g, new Set<string>());
          daySets7.get(g)!.add(dayKey);
        }
        if (daysAgo < 14) {
          if (!daySets14.has(g)) daySets14.set(g, new Set<string>());
          daySets14.get(g)!.add(dayKey);
        }
      }
    }
  }

  const signals = new Map<MuscleGroup, MuscleMapSignal>();
  for (const group of MUSCLE_GROUPS) {
    const lastHitDate = lastHitByGroup.get(group) ?? null;
    const daysSinceLast = lastHitDate
      ? Math.max(0, Math.floor((todayMs - startOfLocalDayMs(new Date(`${lastHitDate}T12:00:00`))) / 86400000))
      : null;
    const sessionsInWindow = daySetsWindow.get(group)?.size ?? 0;
    const sessionsLast7 = daySets7.get(group)?.size ?? 0;
    const sessionsLast14 = daySets14.get(group)?.size ?? 0;
    const recoveryTargetDays = RECOVERY_TARGET_DAYS[group] ?? 2;
    const status = classifySignal(group, daysSinceLast, sessionsLast14);
    const nextScore = scoreForNextTarget(status, daysSinceLast, sessionsLast7, sessionsLast14);

    signals.set(group, {
      status,
      daysSinceLast,
      sessionsInWindow,
      sessionsLast7,
      sessionsLast14,
      recoveryTargetDays,
      lastHitDate,
      nextScore,
    });
  }
  return signals;
}

export function getNextToHitGroups(
  signals: Map<MuscleGroup, MuscleMapSignal>,
  limit = 3,
): MuscleGroup[] {
  return [...signals.entries()]
    .filter(([group]) => group !== 'Cardio' && group !== 'Mobility')
    .filter(([, signal]) => signal.status === 'train_next' || signal.status === 'undertrained' || signal.status === 'balanced')
    .sort((a, b) => b[1].nextScore - a[1].nextScore)
    .slice(0, limit)
    .map(([group]) => group);
}
