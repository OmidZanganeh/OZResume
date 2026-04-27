import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';

type WorkoutEntry = { exerciseId: string };
type WorkoutSession = { date: string; entries: WorkoutEntry[] };

/**
 * Counts how many saved workout *entries* in the last `withinDays` days hit each muscle
 * (primary and secondary on the exercise). One session can add multiple counts per group.
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
      for (const g of [ex.primaryGroup, ...(ex.secondaryGroups ?? [])]) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
  }
  return counts;
}
