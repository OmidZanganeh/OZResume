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
  const t = draft?.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
  return t.length > 0 ? t : [...c];
}

export function nextTrainedMusclesAfterToggle(
  draft: ExerciseLogDraft | undefined,
  ex: Exercise,
  group: MuscleGroup,
): MuscleGroup[] {
  const candidates = candidateMuscleGroupsForExercise(ex);
  let cur = draft?.trainedMuscleGroups?.filter((g) => candidates.includes(g));
  if (!cur || cur.length === 0) cur = [...candidates];
  const on = cur.includes(group);
  const next = on ? cur.filter((g) => g !== group) : [...cur, group];
  return next.length === 0 ? cur : next;
}

export function getDefaultDraft(): ExerciseLogDraft {
  return {
    completed: true,
    sets: 3,
    reps: '8-12',
    weight: '',
    notes: '',
  };
}

export function getDefaultDraftForExercise(exercise: Exercise | undefined): ExerciseLogDraft {
  if (!exercise) return getDefaultDraft();
  const muscles = [...candidateMuscleGroupsForExercise(exercise)];
  if (getEffectiveCategory(exercise) === 'cardio') {
    return { completed: true, sets: 1, reps: '20', weight: '', notes: '', trainedMuscleGroups: muscles };
  }
  return { ...getDefaultDraft(), trainedMuscleGroups: muscles };
}
