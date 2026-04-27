import type { Exercise, MuscleGroup } from './exerciseTypes';
import { mapV1ExerciseIdToV2 } from './legacyV1Stock';
import { EXERCISE_LIBRARY } from './exerciseLibrary';

type ExerciseStat = {
  timesCompleted: number;
  totalSets: number;
  lastPerformed: string | null;
};

type WorkoutEntry = { exerciseId: string; sets: number; reps: string; weight: string; notes: string };
type WorkoutSession = { id: string; date: string; groups: MuscleGroup[]; entries: WorkoutEntry[] };

type Persisted = {
  customExercises: Exercise[];
  stats: Record<string, ExerciseStat>;
  sessions: WorkoutSession[];
};

function mergeStats(a: ExerciseStat, b: ExerciseStat): ExerciseStat {
  const aT = a.lastPerformed ? new Date(a.lastPerformed).getTime() : 0;
  const bT = b.lastPerformed ? new Date(b.lastPerformed).getTime() : 0;
  return {
    timesCompleted: a.timesCompleted + b.timesCompleted,
    totalSets: a.totalSets + b.totalSets,
    lastPerformed: aT >= bT ? a.lastPerformed : b.lastPerformed,
  };
}

/**
 * One-time in-browser migration: gym-flow-v1 (old stock ids) → gym-flow-v2 (wrkout ids) by name.
 */
export function migrateV1ToV2(raw: Persisted): Persisted {
  const lib = EXERCISE_LIBRARY;
  const mapId = (id: string) => mapV1ExerciseIdToV2(id, lib);

  const stats: Record<string, ExerciseStat> = {};
  for (const [k, v] of Object.entries(raw.stats ?? {})) {
    const nk = mapId(k);
    if (stats[nk]) {
      stats[nk] = mergeStats(stats[nk], v);
    } else {
      stats[nk] = v;
    }
  }

  const sessions = (raw.sessions ?? []).map((s) => ({
    ...s,
    entries: s.entries.map((e) => ({ ...e, exerciseId: mapId(e.exerciseId) })),
  }));

  return {
    customExercises: raw.customExercises ?? [],
    stats,
    sessions,
  };
}

export const STORAGE_V1 = 'gym-flow-v1';
export const STORAGE_V2 = 'gym-flow-v2';
