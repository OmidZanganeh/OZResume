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
  /** Optional: improves estimated calorie / macro targets. */
  sex?: 'male' | 'female';
};

/** User-defined pantry item; macros per 100 g (same basis as Open Food Facts logs). */
export type CustomFood = {
  id: string;
  name: string;
  createdAt: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type NutritionGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionLog = {
  id: string;
  /** Calendar day `YYYY-MM-DD` or ISO; normalized when aggregating. */
  date: string;
  /** Open Food Facts code, or `custom:<CustomFood.id>` for saved foods. */
  code: string;
  name: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  createdAt: string;
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
  nutritionLogs?: NutritionLog[];
  nutritionGoals?: NutritionGoals;
  customFoods?: CustomFood[];
};

export const defaultGymData: PersistedGymData = {
  customExercises: [],
  stats: {},
  sessions: [],
  savedPlans: [],
  nutritionLogs: [],
  customFoods: [],
  nutritionGoals: {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70,
  },
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
