import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { getEffectiveCategory } from './catalogSort';

export type ExerciseLogDraft = {
  completed: boolean;
  sets: number | string;
  reps: string;
  weight: string;
  notes: string;
  trainedMuscleGroups?: MuscleGroup[];
};

export function candidateMuscleGroupsForExercise(ex: Exercise): MuscleGroup[] {
  return [ex.primaryGroup, ...(ex.secondaryGroups ?? [])];
}

/** Keep only muscle groups that are valid targets for this exercise (catalog primary/secondary). */
export function trainedGroupsValidForExercise(ex: Exercise, groups: MuscleGroup[] | null | undefined): MuscleGroup[] {
  const allowed = new Set(candidateMuscleGroupsForExercise(ex));
  return (groups ?? []).filter((g) => allowed.has(g));
}

export function effectiveTrainedMuscles(draft: ExerciseLogDraft | undefined, ex: Exercise): MuscleGroup[] {
  return trainedGroupsValidForExercise(ex, draft?.trainedMuscleGroups);
}

export function nextTrainedMusclesAfterToggle(
  draft: ExerciseLogDraft | undefined,
  ex: Exercise,
  group: MuscleGroup,
): MuscleGroup[] {
  const cur = trainedGroupsValidForExercise(ex, draft?.trainedMuscleGroups);
  const on = cur.includes(group);
  return on ? cur.filter((g) => g !== group) : [...cur, group];
}

export function getDefaultDraft(): ExerciseLogDraft {
  return {
    completed: false,
    sets: 3,
    reps: '8-12',
    weight: '',
    notes: '',
  };
}

/**
 * Initial body-map muscle picks for logging: plan-saved targets when present,
 * otherwise empty for multi-muscle moves (user must choose) — never “all selected”.
 * Single-candidate moves still resolve to that one group.
 */
export function getInitialTrainedMuscleGroups(
  exercise: Exercise,
  planPick?: MuscleGroup[] | null,
): MuscleGroup[] {
  const c = candidateMuscleGroupsForExercise(exercise);
  if (c.length <= 1) return [...c];
  const filtered = (planPick ?? []).filter((g) => c.includes(g));
  if (filtered.length > 0) return filtered;
  return [];
}

export function getDefaultDraftForExercise(
  exercise: Exercise | undefined,
  planPick?: MuscleGroup[] | null,
): ExerciseLogDraft {
  if (!exercise) return getDefaultDraft();
  const initial = getInitialTrainedMuscleGroups(exercise, planPick);
  if (getEffectiveCategory(exercise) === 'cardio') {
    return { completed: false, sets: 1, reps: '20', weight: '', notes: '', trainedMuscleGroups: initial };
  }
  return { ...getDefaultDraft(), trainedMuscleGroups: initial };
}
