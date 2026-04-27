import type { Exercise } from './exerciseTypes';
import wrkoutExercises from './wrkoutExercises.json';

export { type Exercise, MUSCLE_GROUPS, type MuscleGroup } from './exerciseTypes';

/** Open dataset: https://github.com/wrkout/exercises.json (Unlicense) — muscle mapping + demo image URLs. */
export const EXERCISE_LIBRARY: Exercise[] = wrkoutExercises as unknown as Exercise[];
