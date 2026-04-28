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

  // Track unique days per muscle
  const muscleTrainedDays = new Map<MuscleGroup, Set<string>>();

  for (const session of sessions) {
    const dateObj = new Date(session.date);
    if (dateObj.getTime() < cutoff) continue;

    // Use YYYY-MM-DD to identify the unique day
    const dayKey = dateObj.toISOString().split('T')[0];

    for (const entry of session.entries) {
      const ex = exerciseById.get(entry.exerciseId);
      if (!ex) continue;
      const groups =
        entry.trainedMuscleGroups && entry.trainedMuscleGroups.length > 0
          ? entry.trainedMuscleGroups
          : [ex.primaryGroup, ...(ex.secondaryGroups ?? [])];
      
      for (const g of groups) {
        if (!muscleTrainedDays.has(g)) {
          muscleTrainedDays.set(g, new Set());
        }
        muscleTrainedDays.get(g)!.add(dayKey);
      }
    }
  }

  // Final count is the number of unique days recorded for that muscle
  for (const [group, days] of muscleTrainedDays.entries()) {
    counts.set(group, days.size);
  }

  return counts;
}
