export type GymFlowUserProfile = {
  name?: string;
  weight?: string;
  weightUnit?: 'kg' | 'lbs';
  height?: string;
  heightUnit?: 'cm' | 'ft';
  age?: string;
  sex?: 'male' | 'female';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
  bodyMapFreshDays?: number;
};

export function isValidUserProfileField(o: unknown): boolean {
  if (o === undefined || o === null) return true;
  if (typeof o !== 'object' || Array.isArray(o)) return false;
  const p = o as Record<string, unknown>;
  for (const k of ['name', 'weight', 'height', 'age']) {
    if (p[k] != null && typeof p[k] !== 'string') return false;
  }
  if (p.weightUnit != null && p.weightUnit !== 'kg' && p.weightUnit !== 'lbs') return false;
  if (p.heightUnit != null && p.heightUnit !== 'cm' && p.heightUnit !== 'ft') return false;
  if (p.sex != null && p.sex !== 'male' && p.sex !== 'female') return false;
  if (
    p.activityLevel != null &&
    p.activityLevel !== 'sedentary' &&
    p.activityLevel !== 'light' &&
    p.activityLevel !== 'moderate' &&
    p.activityLevel !== 'active' &&
    p.activityLevel !== 'veryActive'
  ) return false;
  if (
    p.bodyMapFreshDays != null &&
    (typeof p.bodyMapFreshDays !== 'number' ||
      !Number.isFinite(p.bodyMapFreshDays) ||
      p.bodyMapFreshDays < 1 ||
      p.bodyMapFreshDays > 7)
  ) return false;
  return true;
}

export function sanitizeUserProfile(body: unknown): GymFlowUserProfile | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const pick = (k: string) => (typeof o[k] === 'string' ? o[k].trim() : undefined);
  const weightUnit =
    o.weightUnit === 'lbs' || o.weightUnit === 'kg' ? o.weightUnit : undefined;
  const heightUnit =
    o.heightUnit === 'ft' || o.heightUnit === 'cm' ? o.heightUnit : undefined;
  const sex =
    o.sex === 'male' || o.sex === 'female' ? o.sex : undefined;
  const activityLevel =
    o.activityLevel === 'sedentary' ||
    o.activityLevel === 'light' ||
    o.activityLevel === 'moderate' ||
    o.activityLevel === 'active' ||
    o.activityLevel === 'veryActive'
      ? o.activityLevel
      : undefined;
  const bodyMapFreshDays =
    typeof o.bodyMapFreshDays === 'number' && Number.isFinite(o.bodyMapFreshDays)
      ? Math.max(1, Math.min(7, Math.round(o.bodyMapFreshDays)))
      : undefined;
  const profile: GymFlowUserProfile = {
    ...(pick('name') ? { name: pick('name') } : {}),
    ...(pick('weight') ? { weight: pick('weight') } : {}),
    ...(weightUnit ? { weightUnit } : {}),
    ...(pick('height') ? { height: pick('height') } : {}),
    ...(heightUnit ? { heightUnit } : {}),
    ...(pick('age') ? { age: pick('age') } : {}),
    ...(sex ? { sex } : {}),
    ...(activityLevel ? { activityLevel } : {}),
    ...(bodyMapFreshDays ? { bodyMapFreshDays } : {}),
  };
  if (!isValidUserProfileField(profile)) return null;
  return profile;
}
