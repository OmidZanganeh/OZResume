import type { Exercise, MuscleGroup } from './exerciseTypes';
import { migrateV1ToV2, normalizeSavedPlansExerciseIds, STORAGE_V1, STORAGE_V2 } from './migrateStorage';

export type ExerciseStat = {
  timesCompleted: number;
  totalSets: number;
  lastPerformed: string | null;
};

export type UserProfile = {
  name?: string;
  weight?: string;
  weightUnit?: 'kg' | 'lbs';
  height?: string;
  heightUnit?: 'cm' | 'ft';
  age?: string;
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
  /** Set when the workout is saved from this plan (routine run or Plan tab while editing it). */
  sourcePlanId?: string;
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
  /** Synced with cloud when signed in; also mirrored to local `gf-profile` for reports UI */
  userProfile?: UserProfile;
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
        userProfile: parsed.userProfile,
      };
      const withLegacyProfile: PersistedGymData = (() => {
        if (merged.userProfile && Object.keys(merged.userProfile).length > 0) return merged;
        try {
          const ls = JSON.parse(localStorage.getItem('gf-profile') || '{}') as UserProfile;
          if (ls && typeof ls === 'object' && (ls.name || ls.weight || ls.height || ls.age)) {
            return { ...merged, userProfile: { ...merged.userProfile, ...ls } };
          }
        } catch {
          /* ignore */
        }
        return merged;
      })();
      if (
        JSON.stringify(savedPlans) !== JSON.stringify(savedPlansRaw) ||
        JSON.stringify(withLegacyProfile.userProfile) !== JSON.stringify(merged.userProfile)
      ) {
        localStorage.setItem(STORAGE_V2, JSON.stringify(withLegacyProfile));
      }
      return withLegacyProfile;
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

export function writeGymDataLocal(data: PersistedGymData, mtimeMs?: number): void {
  localStorage.setItem(STORAGE_V2, JSON.stringify(data));
  if (data.userProfile && Object.keys(data.userProfile).length > 0) {
    localStorage.setItem('gf-profile', JSON.stringify(data.userProfile));
  }
  localStorage.setItem('gf_last_mtime', String(mtimeMs ?? Date.now()));
}

export function savePersistedGymData(data: PersistedGymData): void {
  writeGymDataLocal(data);
  if (typeof window !== 'undefined') {
    import('../utils/cloudSync')
      .then((m) => m.scheduleCloudPush(data))
      .catch(() => {});
  }
}
