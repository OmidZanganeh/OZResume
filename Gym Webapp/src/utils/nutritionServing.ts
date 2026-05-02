import type { NutritionGoals } from '../data/gymFlowStorage';

/** Round for display/storage consistency with the rest of the app. */
export function roundNutrient(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * User enters macros for a real portion (e.g. one bowl weighed 320 g) — convert to per-100g
 * so storage stays aligned with Open Food Facts.
 */
export function portionMacrosToPer100g(
  portionGrams: number,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
): NutritionGoals | null {
  if (!(portionGrams > 0) || !Number.isFinite(portionGrams)) return null;
  const k = 100 / portionGrams;
  return {
    calories: roundNutrient(calories * k),
    protein: roundNutrient(protein * k),
    carbs: roundNutrient(carbs * k),
    fat: roundNutrient(fat * k),
  };
}
