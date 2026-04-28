import type { Exercise } from './exerciseTypes';
import wrkoutExercises from './wrkoutExercises.json';

export { type Exercise, MUSCLE_GROUPS, type MuscleGroup } from './exerciseTypes';

/** Open dataset: https://github.com/wrkout/exercises.json (Unlicense) — muscle mapping + demo image URLs. */
const WRKOUT_LIBRARY: Exercise[] = wrkoutExercises as unknown as Exercise[];

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
