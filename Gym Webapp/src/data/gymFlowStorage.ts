import type { Exercise, MuscleGroup } from './exerciseTypes';
import { migrateV1ToV2, normalizeSavedPlansExerciseIds, STORAGE_V1, STORAGE_V2 } from './migrateStorage';

export type ExerciseStat = {
  timesCompleted: number;
  totalSets: number;
  lastPerformed: string | null;
};

export type WorkoutEntry = {
  exerciseId: string;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
  trainedMuscleGroups?: MuscleGroup[];
};

export type WorkoutSession = {
  id: string;
  date: string;
  groups: MuscleGroup[];
  entries: WorkoutEntry[];
};

export type SavedPlan = {
  id: string;
  name: string;
  createdAt: string;
  exerciseIds: string[];
  muscleGroups: MuscleGroup[];
  equipment: string[];
};

export type PersistedGymData = {
  customExercises: Exercise[];
  stats: Record<string, ExerciseStat>;
  sessions: WorkoutSession[];
  savedPlans: SavedPlan[];
};

export const defaultGymData: PersistedGymData = {
  customExercises: [],
  stats: {},
  sessions: [],
  savedPlans: [],
};

export function loadPersistedGymData(): PersistedGymData {
  const v2 = localStorage.getItem(STORAGE_V2);
  if (v2) {
    try {
      const parsed = JSON.parse(v2) as PersistedGymData;
      const customExercises = parsed.customExercises ?? [];
      const savedPlansRaw = parsed.savedPlans ?? [];
      const savedPlans = normalizeSavedPlansExerciseIds(savedPlansRaw, customExercises)
        .filter((plan) => !plan.id.startsWith('def-')); // Strip old injected defaults
      
      const merged: PersistedGymData = {
        customExercises,
        stats: parsed.stats ?? {},
        sessions: parsed.sessions ?? [],
        savedPlans,
      };
      if (JSON.stringify(savedPlans) !== JSON.stringify(savedPlansRaw)) {
        localStorage.setItem(STORAGE_V2, JSON.stringify(merged));
      }
      return merged;
    } catch {
      return defaultGymData;
    }
  }
  const v1 = localStorage.getItem(STORAGE_V1);
  if (v1) {
    try {
      const parsed = JSON.parse(v1) as PersistedGymData;
      const migrated = migrateV1ToV2({
        customExercises: parsed.customExercises ?? [],
        stats: parsed.stats ?? {},
        sessions: parsed.sessions ?? [],
        savedPlans: parsed.savedPlans ?? [],
      });
      localStorage.setItem(STORAGE_V2, JSON.stringify(migrated));
      return migrated;
    } catch {
      return defaultGymData;
    }
  }
  return defaultGymData;
}

export function savePersistedGymData(data: PersistedGymData) {
  localStorage.setItem(STORAGE_V2, JSON.stringify(data));
}
