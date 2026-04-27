import type { WorkoutSession } from '../data/gymFlowStorage';

export type ExerciseLogHistoryRow = {
  dateIso: string;
  dateLabel: string;
  sets: number;
  reps: string;
  weight: string;
};

/** Most recent logs first (sessions are stored newest-first). */
export function getRecentLogsForExercise(
  sessions: WorkoutSession[],
  exerciseId: string,
  limit = 5,
): ExerciseLogHistoryRow[] {
  const rows: ExerciseLogHistoryRow[] = [];
  for (const s of sessions) {
    const e = s.entries.find((x) => x.exerciseId === exerciseId);
    if (!e) continue;
    rows.push({
      dateIso: s.date,
      dateLabel: new Date(s.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}
