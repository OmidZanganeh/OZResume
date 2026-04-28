import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import { getEffectiveCategory } from './catalogSort';

export type HistoryWorkoutEntry = {
  exerciseId: string;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
};

export type HistoryWorkoutSession = {
  id: string;
  date: string;
  groups: MuscleGroup[];
  entries: HistoryWorkoutEntry[];
};

export type ExerciseStat = {
  timesCompleted: number;
  totalSets: number;
  lastPerformed: string | null;
};

/** Bulk-generated spread (legacy). */
export const SEED_SESSION_ID_PREFIX = 'gymflow-seed-';
/** User-added session for a chosen calendar date. */
export const IMPORTED_HISTORY_PREFIX = 'hist-';

/**
 * Prefer exercises whose secondary muscles are all in `allowedGroups`, so e.g. Chest-only history
 * does not credit Core via a bench variation that lists abs as secondary.
 */
export function pickSeedExerciseForGroupInSelection(
  group: MuscleGroup,
  allowedGroups: ReadonlySet<MuscleGroup>,
  exercises: Exercise[],
): Exercise | null {
  const primary = exercises.filter((e) => e.primaryGroup === group);
  const respectSecondaries = (e: Exercise) => (e.secondaryGroups ?? []).every((s) => allowedGroups.has(s));
  const withRespect = primary.filter(respectSecondaries);
  const poolPrimary = withRespect.length > 0 ? withRespect : primary;
  const nonCardio = poolPrimary.filter((e) => getEffectiveCategory(e) !== 'cardio');
  const pool = nonCardio.length > 0 ? nonCardio : poolPrimary;
  return pool[0] ?? null;
}

/**
 * Ensures a YYYY-MM-DD input string is converted to an ISO string representing
 * noon on that day in local time. This prevents "one day shifts" when 
 * later parsed as UTC midnights in negative-offset timezones.
 */
export function createHistorySessionDate(dateYmd: string): string {
  const trimmed = dateYmd.trim();
  const sessionDate = new Date(`${trimmed}T12:00:00`);
  return sessionDate.toISOString();
}

/**
 * One session on the given local calendar day (YYYY-MM-DD), one entry per selected muscle group.
 */
export function buildHistoricalSessionForDate(
  selectedGroups: MuscleGroup[],
  dateYmd: string,
  exercises: Exercise[],
): { session: HistoryWorkoutSession | null; missingGroups: MuscleGroup[] } {
  const trimmed = dateYmd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { session: null, missingGroups: [] };
  }

  const allowed = new Set<MuscleGroup>(selectedGroups);
  const ordered = MUSCLE_GROUPS.filter((g) => allowed.has(g));
  if (ordered.length === 0) {
    return { session: null, missingGroups: [] };
  }

  const missing: MuscleGroup[] = [];
  const entries: HistoryWorkoutEntry[] = [];

  for (const g of ordered) {
    const ex = pickSeedExerciseForGroupInSelection(g, allowed, exercises);
    if (!ex) {
      missing.push(g);
      continue;
    }
    entries.push({
      exerciseId: ex.id,
      sets: 1,
      reps: '',
      weight: '',
      notes: '',
    });
  }

  if (entries.length === 0) {
    return { session: null, missingGroups: missing };
  }

  const sessionDateIso = createHistorySessionDate(trimmed);
  const groupSet = new Set<MuscleGroup>();
  for (const e of entries) {
    const ex = exercises.find((x) => x.id === e.exerciseId);
    if (ex) {
      groupSet.add(ex.primaryGroup);
      for (const sg of ex.secondaryGroups ?? []) groupSet.add(sg);
    }
  }

  const session: HistoryWorkoutSession = {
    id: `${IMPORTED_HISTORY_PREFIX}${Date.now()}`,
    date: sessionDateIso,
    groups: Array.from(groupSet),
    entries,
  };

  return { session, missingGroups: missing };
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

export function isLegacySampleSessionId(id: string): boolean {
  return id.startsWith(SEED_SESSION_ID_PREFIX);
}

export function isImportedHistorySessionId(id: string): boolean {
  return id.startsWith(IMPORTED_HISTORY_PREFIX);
}

/** Remove auto-generated / imported sessions; keep only normal saves and custom data. */
export function stripImportedSessions<T extends { id: string }>(sessions: T[]): T[] {
  return sessions.filter(
    (s) => !isLegacySampleSessionId(s.id) && !isImportedHistorySessionId(s.id),
  );
}
