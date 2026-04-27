import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import { getEffectiveCategory } from './catalogSort';

/** How many times each muscle was hit in the window (for map: 0 gray, 1 orange, 2+ green). */
export type SeedTier = 0 | 1 | 2;

export type SeedWorkoutEntry = {
  exerciseId: string;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
};

export type SeedWorkoutSession = {
  id: string;
  date: string;
  groups: MuscleGroup[];
  entries: SeedWorkoutEntry[];
};

export type ExerciseStat = {
  timesCompleted: number;
  totalSets: number;
  lastPerformed: string | null;
};

export function pickSeedExerciseForGroup(group: MuscleGroup, exercises: Exercise[]): Exercise | null {
  const primary = exercises.filter((e) => e.primaryGroup === group);
  const nonCardio = primary.filter((e) => getEffectiveCategory(e) !== 'cardio');
  const pool = nonCardio.length > 0 ? nonCardio : primary;
  return pool[0] ?? null;
}

/**
 * Build synthetic sessions spread across the last 10 calendar days (ids `gymflow-seed-*`).
 * Each tier value is how many log *entries* to create for that muscle (matches practice window counting).
 */
export function buildSeedSessionsFromTiers(
  tiers: Record<MuscleGroup, SeedTier>,
  exercises: Exercise[],
): { sessions: SeedWorkoutSession[]; missingGroups: MuscleGroup[] } {
  const missing: MuscleGroup[] = [];
  const queue: { exerciseId: string }[] = [];

  for (const g of MUSCLE_GROUPS) {
    const t = tiers[g] ?? 0;
    if (t === 0) continue;
    const ex = pickSeedExerciseForGroup(g, exercises);
    if (!ex) {
      missing.push(g);
      continue;
    }
    for (let i = 0; i < t; i++) {
      queue.push({ exerciseId: ex.id });
    }
  }

  if (queue.length === 0) {
    return { sessions: [], missingGroups: missing };
  }

  const byDay: SeedWorkoutEntry[][] = Array.from({ length: 10 }, () => []);
  queue.forEach((item, index) => {
    const dayIndex = index % 10;
    byDay[dayIndex].push({
      exerciseId: item.exerciseId,
      sets: 1,
      reps: '',
      weight: '',
      notes: '',
    });
  });

  const anchor = new Date();
  anchor.setHours(12, 0, 0, 0);
  const sessions: SeedWorkoutSession[] = [];
  const stamp = Date.now();

  for (let d = 0; d < 10; d++) {
    const entries = byDay[d];
    if (entries.length === 0) continue;

    const sessionDate = new Date(anchor);
    sessionDate.setDate(sessionDate.getDate() - (9 - d));

    const groupSet = new Set<MuscleGroup>();
    for (const e of entries) {
      const exercise = exercises.find((x) => x.id === e.exerciseId);
      if (exercise) {
        groupSet.add(exercise.primaryGroup);
        for (const sg of exercise.secondaryGroups ?? []) groupSet.add(sg);
      }
    }

    sessions.push({
      id: `gymflow-seed-${stamp}-${d}`,
      date: sessionDate.toISOString(),
      groups: Array.from(groupSet),
      entries,
    });
  }

  return { sessions, missingGroups: missing };
}

/** Derive per-exercise stats from sessions (chronological for lastPerformed). */
export function recomputeStatsFromSessions(
  sessions: { date: string; entries: { exerciseId: string; sets: number }[] }[],
): Record<string, ExerciseStat> {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const stats: Record<string, ExerciseStat> = {};
  for (const session of sorted) {
    for (const entry of session.entries) {
      const prev = stats[entry.exerciseId] ?? { timesCompleted: 0, totalSets: 0, lastPerformed: null };
      stats[entry.exerciseId] = {
        timesCompleted: prev.timesCompleted + 1,
        totalSets: prev.totalSets + Math.max(1, entry.sets),
        lastPerformed: session.date,
      };
    }
  }
  return stats;
}

export const SEED_SESSION_ID_PREFIX = 'gymflow-seed-';

export function stripSeedSessions<T extends { id: string }>(sessions: T[]): T[] {
  return sessions.filter((s) => !s.id.startsWith(SEED_SESSION_ID_PREFIX));
}
