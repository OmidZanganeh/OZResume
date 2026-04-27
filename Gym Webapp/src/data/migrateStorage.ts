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

type SavedPlan = {
  id: string;
  name: string;
  createdAt: string;
  exerciseIds: string[];
  muscleGroups: MuscleGroup[];
  equipment: string[];
};

type PersistedIn = {
  customExercises: Exercise[];
  stats: Record<string, ExerciseStat>;
  sessions: WorkoutSession[];
  savedPlans?: SavedPlan[];
};

type Persisted = {
  customExercises: Exercise[];
  stats: Record<string, ExerciseStat>;
  sessions: WorkoutSession[];
  savedPlans: SavedPlan[];
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

function dedupePreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Map template exercise ids to the current catalog (wrkout ids + custom). Legacy v1 stock ids are
 * resolved by name; ids not in the catalog are dropped.
 */
export function resolvePlanExerciseIdsToCatalog(exerciseIds: string[], catalog: Exercise[]): string[] {
  const allowed = new Set(catalog.map((e) => e.id));
  return dedupePreserveOrder(
    exerciseIds
      .map((id) => (allowed.has(id) ? id : mapV1ExerciseIdToV2(id, catalog)))
      .filter((id) => allowed.has(id)),
  );
}

export function normalizeSavedPlansExerciseIds(plans: SavedPlan[], customExercises: Exercise[]): SavedPlan[] {
  const catalog = [...EXERCISE_LIBRARY, ...customExercises];
  return plans.map((plan) => ({
    ...plan,
    exerciseIds: resolvePlanExerciseIdsToCatalog(plan.exerciseIds, catalog),
  }));
}

/**
 * One-time in-browser migration: gym-flow-v1 (old stock ids) → gym-flow-v2 (wrkout ids) by name.
 */
export function migrateV1ToV2(raw: PersistedIn): Persisted {
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
    savedPlans: normalizeSavedPlansExerciseIds(raw.savedPlans ?? [], raw.customExercises ?? []),
  };
}

export const STORAGE_V1 = 'gym-flow-v1';
export const STORAGE_V2 = 'gym-flow-v2';
