import type { Exercise, MuscleGroup } from './exerciseTypes';

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
  /** Stored in cloud (`/api/gym-flow/data`) when signed in */
  userProfile?: UserProfile;
};

export const defaultGymData: PersistedGymData = {
  customExercises: [],
  stats: {},
  sessions: [],
  savedPlans: [],
};

/** In-memory default only; cloud hydrate fills data when signed in. */
export function loadPersistedGymData(): PersistedGymData {
  return defaultGymData;
}

export function savePersistedGymData(data: PersistedGymData): void {
  if (typeof window !== 'undefined') {
    import('../utils/cloudSync')
      .then((m) => m.scheduleCloudPush(data))
      .catch(() => {});
  }
}
