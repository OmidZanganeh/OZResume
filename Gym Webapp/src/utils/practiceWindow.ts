import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';

type WorkoutEntry = { exerciseId: string; trainedMuscleGroups?: MuscleGroup[] };
type WorkoutSession = { date: string; entries: WorkoutEntry[] };

function recencyWeight(daysAgo: number): number {
  if (daysAgo <= 0) return 1.0;
  if (daysAgo <= 2) return 0.8;
  if (daysAgo <= 5) return 0.5;
  if (daysAgo <= 10) return 0.25;
  return 0.1;
}

/**
 * Recency-weighted muscle score in the last `withinDays` days.
 * - Uses `trainedMuscleGroups` on entry when present, else primary + secondary.
 * - Same-day duplicates count once per muscle (max weight for that day).
 * - Recent days are weighted higher than older days.
 */
export function getPracticeCountsInWindow(
  sessions: WorkoutSession[],
  exerciseById: Map<string, Exercise>,
  withinDays: number,
): Map<MuscleGroup, number> {
  const counts = new Map<MuscleGroup, number>();
  const now = Date.now();
  const cutoff = now - withinDays * 24 * 60 * 60 * 1000;

  // Track weighted unique days per muscle
  const muscleTrainedDays = new Map<MuscleGroup, Map<string, number>>();

  for (const session of sessions) {
    const dateObj = new Date(session.date);
    const ts = dateObj.getTime();
    if (ts < cutoff) continue;

    // Use YYYY-MM-DD to identify the unique day
    const dayKey = dateObj.toISOString().split('T')[0];
    const daysAgo = Math.max(0, Math.floor((now - ts) / 86400000));
    const dayWeight = recencyWeight(daysAgo);

    for (const entry of session.entries) {
      const ex = exerciseById.get(entry.exerciseId);
      if (!ex) continue;
      const groups =
        entry.trainedMuscleGroups && entry.trainedMuscleGroups.length > 0
          ? entry.trainedMuscleGroups
          : [ex.primaryGroup, ...(ex.secondaryGroups ?? [])];
      
      for (const g of groups) {
        if (!muscleTrainedDays.has(g)) {
          muscleTrainedDays.set(g, new Map<string, number>());
        }
        const dayMap = muscleTrainedDays.get(g)!;
        dayMap.set(dayKey, Math.max(dayMap.get(dayKey) ?? 0, dayWeight));
      }
    }
  }

  for (const [group, dayWeights] of muscleTrainedDays.entries()) {
    const weighted = [...dayWeights.values()].reduce((sum, w) => sum + w, 0);
    counts.set(group, Number(weighted.toFixed(2)));
  }

  return counts;
}
