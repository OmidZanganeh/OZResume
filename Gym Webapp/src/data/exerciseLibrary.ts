import type { Exercise } from './exerciseTypes';
import wrkoutExercises from './wrkoutExercises.json';

export { type Exercise, MUSCLE_GROUPS, type MuscleGroup } from './exerciseTypes';

/** Open dataset: https://github.com/wrkout/exercises.json (Unlicense) — muscle mapping + demo image URLs. */
const GROUP_PATTERNS: Array<{ group: Exercise['primaryGroup']; pattern: RegExp }> = [
  { group: 'Adductors', pattern: /\badductor\b|groin|inner thigh/i },
  { group: 'Abductors', pattern: /\babductor\b|outer thigh/i },
  { group: 'Hip Flexors', pattern: /hip[\s-]?flexor/i },
  { group: 'Obliques', pattern: /\boblique\b/i },
  { group: 'Tibialis', pattern: /\btibialis\b/i },
];

const NECK_SPECIFIC_PATTERN =
  /isometric neck|neck resistance|head harness|side neck stretch|neck-smr|lying face (down|up) plate neck/i;

function inferSpecificGroupFromName(name: string): Exercise['primaryGroup'] | null {
  for (const { group, pattern } of GROUP_PATTERNS) {
    if (pattern.test(name)) return group;
  }
  return null;
}

function remapExerciseGroups(exercise: Exercise): Exercise {
  const name = exercise.name ?? '';
  const explicitGroup = inferSpecificGroupFromName(name);
  const isNeckSpecific = exercise.primaryGroup === 'Mobility' && NECK_SPECIFIC_PATTERN.test(name);
  const resolvedPrimary = explicitGroup ?? (isNeckSpecific ? 'Neck' : exercise.primaryGroup);

  const secondarySet = new Set<Exercise['primaryGroup']>();
  for (const group of exercise.secondaryGroups ?? []) {
    secondarySet.add(group);
  }
  if (explicitGroup && explicitGroup !== resolvedPrimary) {
    secondarySet.add(explicitGroup);
  }
  if (isNeckSpecific && resolvedPrimary !== 'Neck') {
    secondarySet.add('Neck');
  }
  secondarySet.delete(resolvedPrimary);

  return {
    ...exercise,
    primaryGroup: resolvedPrimary,
    secondaryGroups: secondarySet.size > 0 ? Array.from(secondarySet) : undefined,
  };
}

const WRKOUT_LIBRARY: Exercise[] = (wrkoutExercises as unknown as Exercise[]).map(remapExerciseGroups);

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
