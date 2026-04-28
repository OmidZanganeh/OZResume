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

/** Computes training streaks with a 3-day grace period (streak lost ONLY if 3 days missed in a row) */
export function computeStreak(sessions: WorkoutSession[]): { current: number; longest: number } {
  if (!sessions.length) return { current: 0, longest: 0 };

  const daySet = new Set(sessions.map(s => toDayKey(new Date(s.date))));
  const sortedDays = [...daySet].sort();
  
  let longest = 0;
  let streaks: number[] = [];
  let currentChain = 0;

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      currentChain = 1;
    } else {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      
      if (diff <= 3) {
        currentChain++;
      } else {
        streaks.push(currentChain);
        currentChain = 1;
      }
    }
  }
  streaks.push(currentChain);
  longest = Math.max(...streaks, 0);

  // Current streak
  const lastWorkoutDate = new Date(sortedDays[sortedDays.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastWorkoutDate.setHours(0, 0, 0, 0);
  
  const daysSinceLast = Math.round((today.getTime() - lastWorkoutDate.getTime()) / 86400000);
  
  // If we haven't missed 3 days in a row from the last workout
  const current = daysSinceLast < 3 ? currentChain : 0;

  return { current, longest };
}

/** Consistency score: % of days in the period that are part of an active streak (3-day rule) */
export function computeConsistency(sessions: WorkoutSession[], days: number): number {
  const daySet = new Set(sessions.map(s => toDayKey(new Date(s.date))));
  const now = new Date();
  now.setHours(0,0,0,0);
  
  let coveredCount = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    
    // Day is covered if it has a workout OR if a workout exists in the 2 days PRIOR to it
    // Wait, let's check the window properly.
    // If user works out on Day T, then T+1 and T+2 are "covered".
    // So for any day D, we check D, D-1, D-2.
    let covered = false;
    for (let j = 0; j < 3; j++) {
      const checkDate = new Date(d.getTime() - j * 86400000);
      if (daySet.has(toDayKey(checkDate))) {
        covered = true;
        break;
      }
    }
    if (covered) coveredCount++;
  }
  
  return Math.round((coveredCount / days) * 100);
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
