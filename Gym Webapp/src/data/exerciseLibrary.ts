import type { Exercise } from './exerciseTypes';
import wrkoutExercises from './wrkoutExercises.json';

export { type Exercise, MUSCLE_GROUPS, type MuscleGroup } from './exerciseTypes';

/** Open dataset: https://github.com/wrkout/exercises.json (Unlicense) — muscle mapping + demo image URLs. */
const MOBILITY_REMAP_PATTERNS: Array<{ target: Exercise['primaryGroup']; pattern: RegExp; addSecondary?: Exercise['primaryGroup'][] }> = [
  { target: 'Quads', pattern: /\badductor\b|groin|inner thigh/i, addSecondary: ['Hamstrings', 'Glutes'] },
  { target: 'Glutes', pattern: /\babductor\b|outer thigh/i, addSecondary: ['Quads'] },
  { target: 'Quads', pattern: /hip[\s-]?flexor/i, addSecondary: ['Core'] },
  { target: 'Calves', pattern: /\btibialis\b/i },
  { target: 'Core', pattern: /\boblique\b/i },
  { target: 'Shoulders', pattern: /isometric neck|neck resistance|head harness|side neck stretch|neck-smr|lying face (down|up) plate neck/i },
];

function remapMobilityExerciseToExistingGroups(exercise: Exercise): Exercise {
  if (exercise.primaryGroup !== 'Mobility') return exercise;
  const name = exercise.name ?? '';
  for (const { target, pattern, addSecondary } of MOBILITY_REMAP_PATTERNS) {
    if (!pattern.test(name)) continue;
    const secondary = new Set<Exercise['primaryGroup']>(exercise.secondaryGroups ?? []);
    for (const g of addSecondary ?? []) {
      if (g !== target) secondary.add(g);
    }
    secondary.delete(target);
    return {
      ...exercise,
      primaryGroup: target,
      secondaryGroups: secondary.size > 0 ? Array.from(secondary) : undefined,
    };
  }
  return exercise;
}

const WRKOUT_LIBRARY: Exercise[] = (wrkoutExercises as unknown as Exercise[]).map(remapMobilityExerciseToExistingGroups);

/** Supplemental activities / Sports */
const SPORTS_LIBRARY: Exercise[] = [
  { id: 'sport-volleyball', name: 'Volleyball Session', primaryGroup: 'Mobility', wrkoutCategory: 'sport' },
  { id: 'sport-basketball', name: 'Basketball Session', primaryGroup: 'Mobility', wrkoutCategory: 'sport' },
  { id: 'sport-soccer', name: 'Soccer Match', primaryGroup: 'Mobility', wrkoutCategory: 'sport' },
  { id: 'sport-swimming', name: 'Swimming', primaryGroup: 'Cardio', wrkoutCategory: 'sport' },
  { id: 'sport-tennis', name: 'Tennis / Padel', primaryGroup: 'Mobility', wrkoutCategory: 'sport' },
  { id: 'sport-running', name: 'Running / Jogging', primaryGroup: 'Cardio', wrkoutCategory: 'sport' },
  { id: 'sport-yoga', name: 'Yoga Practice', primaryGroup: 'Mobility', wrkoutCategory: 'sport' },
  { id: 'sport-pilates', name: 'Pilates', primaryGroup: 'Mobility', wrkoutCategory: 'sport' },
  { id: 'sport-cycling', name: 'Cycling / Spin', primaryGroup: 'Cardio', wrkoutCategory: 'sport' },
  { id: 'sport-boxing', name: 'Boxing / MMA', primaryGroup: 'Cardio', wrkoutCategory: 'sport', secondaryGroups: ['Mobility'] },
  { id: 'sport-badminton', name: 'Badminton', primaryGroup: 'Mobility', wrkoutCategory: 'sport' },
];

export const EXERCISE_LIBRARY: Exercise[] = [...WRKOUT_LIBRARY, ...SPORTS_LIBRARY];
