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
 * Heatmap slot patched to green in {@link BodyMapFigure} (library default at this index is yellow).
 * Intensity 5 stays the package orange for “once”.
 */
export const MOTIVATION_GREEN_INTENSITY_SLOT = 2;

/**
 * Last N days: 0 sessions → gray (0), 1 → orange (5), 2+ → green (patched slot {@link MOTIVATION_GREEN_INTENSITY_SLOT}).
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
    const intensity =
      count >= 2 ? MOTIVATION_GREEN_INTENSITY_SLOT : count === 1 ? 5 : 0;
    const selected = selectedGroups.includes(g);
    for (const id of ids) {
      state[id] = { intensity, selected };
    }
  }
  return state;
}
