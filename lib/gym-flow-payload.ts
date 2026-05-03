import { isValidUserProfileField } from '@/lib/gym-flow-user-profile';

/** Full Gym Flow JSON blob stored in Neon (includes optional userProfile). */
export function isValidPersistedGymPayload(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (
    !Array.isArray(o.customExercises) ||
    o.stats === null ||
    typeof o.stats !== 'object' ||
    !Array.isArray(o.sessions) ||
    !Array.isArray(o.savedPlans)
  ) {
    return false;
  }
  if (o.userProfile !== undefined && !isValidUserProfileField(o.userProfile)) {
    return false;
  }
  if (o.nutritionLogs !== undefined && !Array.isArray(o.nutritionLogs)) {
    return false;
  }
  if (o.nutritionGoals !== undefined && (o.nutritionGoals === null || typeof o.nutritionGoals !== 'object')) {
    return false;
  }
  if (o.nutritionFavorites !== undefined) {
    if (!Array.isArray(o.nutritionFavorites)) return false;
    for (const row of o.nutritionFavorites) {
      if (!row || typeof row !== 'object') return false;
      const f = row as Record<string, unknown>;
      if (typeof f.code !== 'string' || typeof f.name !== 'string') return false;
    }
  }
  return true;
}
