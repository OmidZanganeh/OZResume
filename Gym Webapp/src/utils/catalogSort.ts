import type { Exercise } from '../data/exerciseTypes';

export type CatalogSortMode = 'gym' | 'mostUsed' | 'leastUsed' | 'a-z' | 'z-a';

const CATEGORY_ORDER: Record<string, number> = {
  strength: 0,
  powerlifting: 1,
  'olympic weightlifting': 2,
  strongman: 3,
  plyometrics: 4,
  cardio: 5,
  stretching: 6,
};

/** Typical gym: bar/dumbbell/cable first, then machines & specialty. */
const EQUIPMENT_ORDER: Record<string, number> = {
  barbell: 0,
  dumbbell: 1,
  'e-z curl bar': 2,
  cable: 3,
  machine: 4,
  kettlebells: 5,
  'body only': 6,
  bands: 7,
  'exercise ball': 8,
  'medicine ball': 9,
  'foam roll': 10,
  other: 11,
};

const LEVEL_ORDER: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  expert: 2,
};

export function getEffectiveCategory(ex: Exercise): string {
  return ex.wrkoutCategory ?? 'strength';
}

export function getEffectiveEquipment(ex: Exercise): string {
  return ex.wrkoutEquipment ?? 'other';
}

function getEffectiveLevel(ex: Exercise): string {
  return ex.wrkoutLevel ?? 'intermediate';
}

/**
 * "Common first" using dataset heuristics: strength & simple equipment before stretching/cardio, etc.
 */
function compareGymHeuristic(a: Exercise, b: Exercise): number {
  const ca = CATEGORY_ORDER[getEffectiveCategory(a)] ?? 20;
  const cb = CATEGORY_ORDER[getEffectiveCategory(b)] ?? 20;
  if (ca !== cb) return ca - cb;
  const ea = EQUIPMENT_ORDER[getEffectiveEquipment(a)] ?? 30;
  const eb = EQUIPMENT_ORDER[getEffectiveEquipment(b)] ?? 30;
  if (ea !== eb) return ea - eb;
  const la = LEVEL_ORDER[getEffectiveLevel(a)] ?? 1;
  const lb = LEVEL_ORDER[getEffectiveLevel(b)] ?? 1;
  if (la !== lb) return la - lb;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export function compareCatalog(
  a: Exercise,
  b: Exercise,
  mode: CatalogSortMode,
  timesById: Record<string, number | undefined>,
): number {
  const sa = timesById[a.id] ?? 0;
  const sb = timesById[b.id] ?? 0;
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  switch (mode) {
    case 'gym':
      return compareGymHeuristic(a, b);
    case 'mostUsed':
      return sb - sa || byName;
    case 'leastUsed':
      return sa - sb || byName;
    case 'a-z':
      return byName;
    case 'z-a':
      return -byName;
  }
}

export function collectSortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

const FILTER_LABELS: Record<string, string> = {
  'e-z curl bar': 'E-Z curl bar',
  'olympic weightlifting': 'Olympic weightlifting',
  'body only': 'Body only',
  'foam roll': 'Foam roll',
  kettlebells: 'Kettlebells',
};

export function labelForFilterValue(s: string): string {
  return FILTER_LABELS[s] ?? s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Safe class suffix for `equipment-visual--${slug}`. */
export function equipmentToSlug(equip: string): string {
  const s = equip.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s.length > 0 ? s : 'other';
}
