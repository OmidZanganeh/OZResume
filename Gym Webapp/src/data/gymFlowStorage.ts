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

/** User-defined pantry item; macros are stored per 100 g (same as Open Food Facts) for one consistent scale. */
export type CustomFood = {
  id: string;
  name: string;
  createdAt: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  /** Fiber per 100 g when known (optional for older saved foods). */
  fiberPer100g?: number;
  /** When set, “Amount (g)” defaults to this when you pick this food (your usual portion). */
  defaultServingGrams?: number;
};

export type NutritionGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Dietary fiber (g); targets and per-100g values match USDA / OFF where available. */
  fiber: number;
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
  fiber: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
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
    fiber: 28,
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
