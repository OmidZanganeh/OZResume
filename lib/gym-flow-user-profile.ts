export type GymFlowUserProfile = {
  name?: string;
  weight?: string;
  weightUnit?: 'kg' | 'lbs';
  height?: string;
  heightUnit?: 'cm' | 'ft';
  age?: string;
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
  const profile: GymFlowUserProfile = {
    ...(pick('name') ? { name: pick('name') } : {}),
    ...(pick('weight') ? { weight: pick('weight') } : {}),
    ...(weightUnit ? { weightUnit } : {}),
    ...(pick('height') ? { height: pick('height') } : {}),
    ...(heightUnit ? { heightUnit } : {}),
    ...(pick('age') ? { age: pick('age') } : {}),
  };
  if (!isValidUserProfileField(profile)) return null;
  return profile;
}
