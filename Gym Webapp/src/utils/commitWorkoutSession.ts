import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import type { PersistedGymData, WorkoutSession } from '../data/gymFlowStorage';
import { getEffectiveCategory } from './catalogSort';
import {
  candidateMuscleGroupsForExercise,
  effectiveTrainedMuscles,
  type ExerciseLogDraft,
} from './workoutLogDraft';

export function commitWorkoutSession(params: {
  data: PersistedGymData;
  exerciseOrderIds: string[];
  exerciseDrafts: Record<string, ExerciseLogDraft | undefined>;
  exerciseById: Map<string, Exercise>;
  sessionGroupSeed: MuscleGroup[];
}):
  | { ok: true; nextData: PersistedGymData; completedCount: number }
  | { ok: false; error: string } {
  const { data, exerciseOrderIds, exerciseDrafts, exerciseById, sessionGroupSeed } = params;

  const completedEntries = exerciseOrderIds
    .map((exerciseId) => ({ exerciseId, draft: exerciseDrafts[exerciseId] }))
    .filter((item) => item.draft?.completed)
    .map(({ exerciseId, draft }) => {
      const ex = exerciseById.get(exerciseId);
      const cardio = ex && getEffectiveCategory(ex) === 'cardio';
      return {
        exerciseId,
        sets: cardio ? 1 : Math.max(1, Number(draft?.sets ?? 1)),
        reps: draft?.reps.trim() ?? '',
        weight: draft?.weight.trim() ?? '',
        notes: draft?.notes.trim() ?? '',
        trainedMuscleGroups: ex ? effectiveTrainedMuscles(draft, ex) : undefined,
      };
    });

  if (completedEntries.length === 0) {
    return { ok: false, error: 'Pick and complete at least one planned move before saving.' };
  }

  const nowIso = new Date().toISOString();
  const autoGroups = new Set<MuscleGroup>(sessionGroupSeed);
  completedEntries.forEach((entry) => {
    const exercise = exerciseById.get(entry.exerciseId);
    if (!exercise) return;
    const hit = entry.trainedMuscleGroups?.length
      ? entry.trainedMuscleGroups
      : candidateMuscleGroupsForExercise(exercise);
    for (const g of hit) autoGroups.add(g);
  });

  const nextStats = { ...data.stats };
  completedEntries.forEach((entry) => {
    const previous = nextStats[entry.exerciseId] ?? {
      timesCompleted: 0,
      totalSets: 0,
      lastPerformed: null,
    };
    nextStats[entry.exerciseId] = {
      timesCompleted: previous.timesCompleted + 1,
      totalSets: previous.totalSets + entry.sets,
      lastPerformed: nowIso,
    };
  });

  const nextSession: WorkoutSession = {
    id: `session-${Date.now()}`,
    date: nowIso,
    groups: Array.from(autoGroups),
    entries: completedEntries,
  };

  const nextData: PersistedGymData = {
    ...data,
    stats: nextStats,
    sessions: [nextSession, ...data.sessions],
  };

  return { ok: true, nextData, completedCount: completedEntries.length };
}
