import type { BodyState } from 'body-muscles';
import type { MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';

/**
 * Maps Gym Flow muscle groups to `body-muscles` (npm) muscle region IDs.
 * @see https://github.com/vulovix/body-muscles — Apache-2.0
 */
export const GROUP_TO_MUSCLE_IDS: Record<MuscleGroup, readonly string[] | null> = {
  Chest: [
    'chest-upper-left',
    'chest-lower-left',
    'chest-upper-right',
    'chest-lower-right',
  ],
  Back: [
    'traps-upper-left',
    'traps-mid-left',
    'traps-lower-left',
    'traps-upper-right',
    'traps-mid-right',
    'traps-lower-right',
    'lats-upper-left',
    'lats-mid-left',
    'lats-lower-left',
    'lats-upper-right',
    'lats-mid-right',
    'lats-lower-right',
    'spine',
    'lower-back-erectors-left',
    'lower-back-ql-left',
    'lower-back-erectors-right',
    'lower-back-ql-right',
  ],
  Shoulders: [
    'shoulder-front-left',
    'shoulder-front-right',
    'shoulder-side-left',
    'shoulder-side-right',
    'deltoid-rear-left',
    'deltoid-rear-right',
  ],
  Biceps: ['biceps-left', 'biceps-right'],
  Triceps: [
    'triceps-long-left',
    'triceps-lateral-left',
    'triceps-long-right',
    'triceps-lateral-right',
  ],
  Quads: ['quads-left', 'quads-right'],
  Hamstrings: [
    'hamstrings-medial-left',
    'hamstrings-lateral-left',
    'hamstrings-medial-right',
    'hamstrings-lateral-right',
  ],
  Glutes: [
    'gluteus-medius-left',
    'gluteus-maximus-left',
    'gluteus-medius-right',
    'gluteus-maximus-right',
  ],
  Calves: [
    'calves-gastroc-medial-left',
    'calves-gastroc-lateral-left',
    'calves-soleus-left',
    'calves-gastroc-medial-right',
    'calves-gastroc-lateral-right',
    'calves-soleus-right',
    'tibialis-anterior-left',
    'tibialis-anterior-right',
  ],
  Core: [
    'abs-upper-left',
    'abs-upper-right',
    'abs-lower-left',
    'abs-lower-right',
    'obliques-left',
    'obliques-right',
    'serratus-anterior-left',
    'serratus-anterior-right',
    'hip-flexor-left',
    'hip-flexor-right',
  ],
  Forearms: [
    'forearm-left',
    'forearm-right',
    'forearm-flexors-left',
    'forearm-flexors-right',
    'forearm-extensors-left',
    'forearm-extensors-right',
  ],
  Cardio: null,
  Mobility: null,
};

/** body-muscles `muscleId` → our single muscle group (for clicks). */
const MUSCLE_ID_TO_GROUP: Record<string, MuscleGroup> = (() => {
  const o: Record<string, MuscleGroup> = {};
  for (const g of MUSCLE_GROUPS) {
    const ids = GROUP_TO_MUSCLE_IDS[g];
    if (!ids) continue;
    for (const id of ids) o[id] = g;
  }
  return o;
})();

export function getGroupForBodyMuscleId(muscleId: string): MuscleGroup | null {
  return MUSCLE_ID_TO_GROUP[muscleId] ?? null;
}

/**
 * @param maxIntensityCap — library uses 0–10; we cap by count, e.g. `Math.min(10, count)`.
 */
export function buildBodyMusclesStateFromPractice(
  practiceCounts: Map<MuscleGroup, number>,
  selectedGroups: MuscleGroup[],
  maxIntensityCap = 10,
): BodyState {
  const state: BodyState = {};
  for (const g of MUSCLE_GROUPS) {
    const ids = GROUP_TO_MUSCLE_IDS[g];
    if (!ids) continue;
    const count = practiceCounts.get(g) ?? 0;
    const intensity = Math.min(maxIntensityCap, count);
    const selected = selectedGroups.includes(g);
    for (const id of ids) {
      state[id] = { intensity, selected };
    }
  }
  return state;
}

/**
 * Intensity slots for the N-day heatmap. Colors patched on `INTENSITY_COLORS` in BodyMapFigure.
 * (body-muscles reserves 0–10; 99 = rainbow inactive; 100+ = per-group rainbow.)
 */
export const HEAT_INTENSITY = {
  gap: 0,
  /** 1 session in window */
  x1: 5,
  x2: 2,
  x3: 3,
  x4: 4,
  /** 5 or more sessions */
  x5Plus: 6,
} as const;

/** Tier 0…5 for CSS (orphan pills / legend), aligned with {@link practiceCountToHeatIntensity} buckets. */
export function heatTierFromCount(count: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 4;
  return 5;
}

export function practiceCountToHeatIntensity(count: number): number {
  if (count <= 0) return HEAT_INTENSITY.gap;
  if (count === 1) return HEAT_INTENSITY.x1;
  if (count === 2) return HEAT_INTENSITY.x2;
  if (count === 3) return HEAT_INTENSITY.x3;
  if (count === 4) return HEAT_INTENSITY.x4;
  return HEAT_INTENSITY.x5Plus;
}

/**
 * @deprecated use {@link HEAT_INTENSITY.x2} — kept for any external imports
 */
export const MOTIVATION_GREEN_INTENSITY_SLOT = HEAT_INTENSITY.x2;

/**
 * Last N days: 0→gap, 1→once, 2…4→stepped “on track”, 5+→ strongest cue.
 */
export function buildBodyMusclesStateForTenDayGaps(
  practiceCounts: Map<MuscleGroup, number>,
  selectedGroups: MuscleGroup[],
): BodyState {
  const state: BodyState = {};
  for (const g of MUSCLE_GROUPS) {
    const ids = GROUP_TO_MUSCLE_IDS[g];
    if (!ids) continue;
    const count = practiceCounts.get(g) ?? 0;
    const intensity = practiceCountToHeatIntensity(count);
    const selected = selectedGroups.includes(g);
    for (const id of ids) {
      state[id] = { intensity, selected };
    }
  }
  return state;
}
