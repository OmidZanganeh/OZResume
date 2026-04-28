import type { WorkoutSession } from '../data/gymFlowStorage';
import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { PUSH_MUSCLES, PULL_MUSCLES, LEGS_MUSCLES, CORE_MUSCLES } from '../components/calendarMuscleColors';

/** Returns YYYY-MM-DD string from a date */
function toDayKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Builds an array of weekly workout counts for the last N weeks */
export function getWeeklyWorkoutCounts(sessions: WorkoutSession[], weeks: number): { label: string; count: number; real: number }[] {
  const now = new Date();
  // Start from Monday of (weeks) weeks ago
  const result: { label: string; count: number; real: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - w * 7); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const workoutsThisWeek = sessions.filter(s => {
      const d = new Date(s.date);
      return d >= weekStart && d < weekEnd;
    });
    const realCount = workoutsThisWeek.filter(s => !s.id.startsWith('seed-')).length;

    const labelDate = new Date(weekStart);
    labelDate.setDate(labelDate.getDate() + 1); // Mon of that week
    const label = labelDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    result.push({ label, count: workoutsThisWeek.length, real: realCount });
  }
  return result;
}

/** Computes the current consecutive training streak (days) */
export function computeStreak(sessions: WorkoutSession[]): { current: number; longest: number } {
  if (!sessions.length) return { current: 0, longest: 0 };

  const daySet = new Set(sessions.map(s => toDayKey(new Date(s.date))));


  let current = 0;
  const d = new Date();
  // If today has a session, or yesterday did (grace period), count
  while (daySet.has(toDayKey(d)) || (current === 0 && daySet.has(toDayKey(new Date(d.getTime() - 86400000))))) {
    if (!daySet.has(toDayKey(d))) {
      d.setDate(d.getDate() - 1); // skip today if not trained
    }
    if (!daySet.has(toDayKey(d))) break;
    current++;
    d.setDate(d.getDate() - 1);
  }

  // Longest streak - iterate sorted unique days
  const sortedDays = [...daySet].sort();
  let longest = 0, streak = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    streak = 1;
    while (i + 1 < sortedDays.length) {
      const curr = new Date(sortedDays[i]);
      const next = new Date(sortedDays[i + 1]);
      const diff = (next.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) { streak++; i++; }
      else break;
    }
    if (streak > longest) longest = streak;
  }

  return { current, longest };
}

/** Consistency score: % of days with workout in the period */
export function computeConsistency(sessions: WorkoutSession[], days: number): number {
  const cutoff = Date.now() - days * 86400000;
  const sessionsInPeriod = sessions.filter(s => new Date(s.date).getTime() >= cutoff);
  const uniqueDays = new Set(sessionsInPeriod.map(s => toDayKey(new Date(s.date))));
  return Math.round((uniqueDays.size / days) * 100);
}

/** Push/Pull/Legs/Core/Other breakdown */
export function getPushPullLegsBalance(
  counts: Map<MuscleGroup, number>
): { push: number; pull: number; legs: number; core: number } {
  const sum = (groups: MuscleGroup[]) =>
    groups.reduce((acc, g) => acc + (counts.get(g) ?? 0), 0);
  return {
    push: sum(PUSH_MUSCLES),
    pull: sum(PULL_MUSCLES),
    legs: sum(LEGS_MUSCLES),
    core: sum(CORE_MUSCLES),
  };
}

/** Top N most trained exercises by timesCompleted */
export function getTopExercises(
  stats: Record<string, { timesCompleted: number; totalSets: number; lastPerformed: string | null }>,
  exerciseById: Map<string, Exercise>,
  n = 5
): { name: string; count: number; sets: number }[] {
  return Object.entries(stats)
    .filter(([_, s]) => s.timesCompleted > 0)
    .map(([id, s]) => ({
      name: exerciseById.get(id)?.name ?? id,
      count: s.timesCompleted,
      sets: s.totalSets,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** Muscles not trained in the last N days */
export function getNeglectedMuscles(
  counts: Map<MuscleGroup, number>,
  allGroups: readonly MuscleGroup[]
): MuscleGroup[] {
  return allGroups.filter(g => g !== 'Cardio' && g !== 'Mobility' && (counts.get(g) ?? 0) === 0);
}

/** Group muscle imbalances: push vs pull ratio */
export function getMuscleImbalanceWarnings(balance: ReturnType<typeof getPushPullLegsBalance>): string[] {
  const warnings: string[] = [];
  const total = balance.push + balance.pull + balance.legs + balance.core;
  if (total === 0) return [];
  if (balance.push > 0 && balance.pull === 0) warnings.push('All push, no pull training — risk of shoulder imbalance');
  if (balance.pull > 0 && balance.push === 0) warnings.push('All pull, no push training — address this for balance');
  if (balance.push > 0 && balance.pull > 0) {
    const ratio = balance.push / balance.pull;
    if (ratio > 2) warnings.push('Push-heavy: consider more pull work (rows, pull-ups)');
    else if (ratio < 0.5) warnings.push('Pull-heavy: consider more push work (presses, dips)');
  }
  if (balance.legs === 0 && total > 4) warnings.push('No leg training detected — incorporate squats or deadlifts');
  if (balance.core === 0 && total > 6) warnings.push('Core neglected — add planks or ab work for injury prevention');
  return warnings;
}
