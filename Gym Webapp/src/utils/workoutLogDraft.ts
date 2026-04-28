import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { getEffectiveCategory } from './catalogSort';

export type ExerciseLogDraft = {
  completed: boolean;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
  trainedMuscleGroups?: MuscleGroup[];
};

export function candidateMuscleGroupsForExercise(ex: Exercise): MuscleGroup[] {
  return [ex.primaryGroup, ...(ex.secondaryGroups ?? [])];
}

export function effectiveTrainedMuscles(draft: ExerciseLogDraft | undefined, ex: Exercise): MuscleGroup[] {
  const c = candidateMuscleGroupsForExercise(ex);
  return draft?.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
}

export function nextTrainedMusclesAfterToggle(
  draft: ExerciseLogDraft | undefined,
  ex: Exercise,
  group: MuscleGroup,
): MuscleGroup[] {
  const candidates = candidateMuscleGroupsForExercise(ex);
  const cur = draft?.trainedMuscleGroups?.filter((g) => candidates.includes(g)) ?? [];
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

export function getDefaultDraftForExercise(exercise: Exercise | undefined): ExerciseLogDraft {
  if (!exercise) return getDefaultDraft();
  const c = candidateMuscleGroupsForExercise(exercise);
  const initial = c.length === 1 ? [...c] : [];
  if (getEffectiveCategory(exercise) === 'cardio') {
    return { completed: false, sets: 1, reps: '20', weight: '', notes: '', trainedMuscleGroups: initial };
  }
  return { ...getDefaultDraft(), trainedMuscleGroups: initial };
}
