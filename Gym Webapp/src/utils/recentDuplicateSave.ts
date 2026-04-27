import type { WorkoutSession } from '../data/gymFlowStorage';

const DEFAULT_WINDOW_MS = 3 * 60 * 1000;

/**
 * True when pending ids match the most recent session’s entries (same multiset) and that session
 * was saved very recently — usually a double-save from two tabs or a mistaken second click.
 */
export function isLikelyDuplicateWorkoutSave(
  sessions: WorkoutSession[],
  pendingIncludedExerciseIds: string[],
  withinMs = DEFAULT_WINDOW_MS,
): boolean {
  if (sessions.length === 0 || pendingIncludedExerciseIds.length === 0) return false;
  const last = sessions[0];
  const age = Date.now() - new Date(last.date).getTime();
  if (age > withinMs) return false;
  if (last.entries.length !== pendingIncludedExerciseIds.length) return false;
  const a = [...pendingIncludedExerciseIds].sort().join('|');
  const b = [...last.entries.map((e) => e.exerciseId)].sort().join('|');
  return a === b;
}
