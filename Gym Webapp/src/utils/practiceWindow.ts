import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';

type WorkoutEntry = { exerciseId: string; trainedMuscleGroups?: MuscleGroup[] };
type WorkoutSession = { date: string; entries: WorkoutEntry[] };

/**
 * Counts how many saved workout *entries* in the last `withinDays` days hit each muscle
 * (uses `trainedMuscleGroups` on the entry when present, else primary + secondary on the exercise).
 */
export function getPracticeCountsInWindow(
  sessions: WorkoutSession[],
  exerciseById: Map<string, Exercise>,
  withinDays: number,
): Map<MuscleGroup, number> {
  const counts = new Map<MuscleGroup, number>();
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  for (const session of sessions) {
    if (new Date(session.date).getTime() < cutoff) continue;
    for (const entry of session.entries) {
      const ex = exerciseById.get(entry.exerciseId);
      if (!ex) continue;
      const groups =
        entry.trainedMuscleGroups && entry.trainedMuscleGroups.length > 0
          ? entry.trainedMuscleGroups
          : [ex.primaryGroup, ...(ex.secondaryGroups ?? [])];
      for (const g of groups) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
  }
  return counts;
}
