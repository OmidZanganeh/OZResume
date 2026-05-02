import type { NutritionGoals, UserProfile } from '../data/gymFlowStorage';

function parseWeightKg(weight: string | undefined, unit: 'kg' | 'lbs' | undefined): number | null {
  if (!weight?.trim()) return null;
  const n = Number.parseFloat(weight.replace(/,/g, '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return unit === 'lbs' ? n * 0.453592 : n;
}

/** Height: cm as number string, or ft stored as `5'10` when unit is ft. */
function parseHeightCm(height: string | undefined, unit: 'cm' | 'ft' | undefined): number | null {
  if (!height?.trim()) return null;
  if (unit === 'ft') {
    const parts = height.split("'");
    const ft = Number.parseFloat(parts[0] ?? '');
    const inch = Number.parseFloat(parts[1] ?? '0');
    if (!Number.isFinite(ft) || ft < 0) return null;
    if (!Number.isFinite(inch) || inch < 0 || inch >= 12) return null;
    return ft * 30.48 + inch * 2.54;
  }
  const n = Number.parseFloat(height.replace(/,/g, '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Mifflin–St Jeor BMR × activity factor, then macro split suited to training.
 * Returns null if profile numbers are incomplete or implausible.
 */
export function computeSuggestedNutritionGoals(profile: UserProfile | undefined): NutritionGoals | null {
  if (!profile) return null;
  const weightKg = parseWeightKg(profile.weight, profile.weightUnit);
  const heightCm = parseHeightCm(profile.height, profile.heightUnit);
  const age = Number.parseInt(profile.age ?? '', 10);
  if (weightKg == null || heightCm == null || !Number.isFinite(age) || age < 16 || age > 90) {
    return null;
  }

  let bmr: number;
  if (profile.sex === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  if (!Number.isFinite(bmr) || bmr < 800) return null;

  const activity = 1.55;
  const calories = Math.round(bmr * activity);

  const protein = Math.round(Math.max(weightKg * 1.8, 70));
  const fat = Math.round((calories * 0.28) / 9);
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbKcal = Math.max(calories - proteinKcal - fatKcal, 0);
  const carbs = Math.round(carbKcal / 4);

  return {
    calories,
    protein,
    carbs: Math.max(carbs, 40),
    fat: Math.max(fat, 30),
  };
}

/** Last `n` calendar days ending today (local), oldest first. */
export function lastNDayKeys(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

/** Normalize any nutrition log `date` to local calendar key `YYYY-MM-DD`. */
export function nutritionLogDateKey(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
