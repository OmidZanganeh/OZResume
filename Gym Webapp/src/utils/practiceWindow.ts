import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';

type WorkoutEntry = { exerciseId: string; trainedMuscleGroups?: MuscleGroup[] };
type WorkoutSession = { date: string; entries: WorkoutEntry[] };

/**
 * Counts how many saved workout *entries* in the last `withinDays` days hit each muscle
 * (uses `trainedMuscleGroups` on the entry when present, else primary + secondary on the exercise).
 */
export type MuscleStats = {
  sessions: number;
  totalSets: number;
};

/**
 * Counts how many unique days and total sets were recorded for each muscle in the window.
 */
export function getPracticeCountsInWindow(
  sessions: WorkoutSession[],
  exerciseById: Map<string, Exercise>,
  withinDays: number,
): Map<MuscleGroup, MuscleStats> {
  const statsMap = new Map<MuscleGroup, MuscleStats>();
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;

  // Track unique days per muscle to ensure we count frequency correctly
  const muscleTrainedDays = new Map<MuscleGroup, Set<string>>();
  // Track total sets per muscle
  const muscleTotalSets = new Map<MuscleGroup, number>();

  for (const session of sessions) {
    const d = new Date(session.date);
    if (d.getTime() < cutoff) continue;

    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    for (const entry of session.entries) {
      const ex = exerciseById.get(entry.exerciseId);
      if (!ex) continue;
      
      const groups = entry.trainedMuscleGroups && entry.trainedMuscleGroups.length > 0
        ? entry.trainedMuscleGroups
        : [ex.primaryGroup, ...(ex.secondaryGroups ?? [])];
      
      const sets = Math.max(1, entry.sets);

      for (const g of groups) {
        // Frequency
        if (!muscleTrainedDays.has(g)) muscleTrainedDays.set(g, new Set());
        muscleTrainedDays.get(g)!.add(dayKey);

        // Volume
        muscleTotalSets.set(g, (muscleTotalSets.get(g) ?? 0) + sets);
      }
    }
  }

  // Combine into final stats
  for (const group of muscleTrainedDays.keys()) {
    statsMap.set(group, {
      sessions: muscleTrainedDays.get(group)!.size,
      totalSets: muscleTotalSets.get(group) ?? 0,
    });
  }

  return statsMap;
}
