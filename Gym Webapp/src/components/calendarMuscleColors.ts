import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../data/exerciseLibrary';

/** Distinct, dark-theme-friendly colors for rainbow body map + calendar stripes (per muscle group). */
export const MUSCLE_GROUP_CALENDAR_COLOR: Record<MuscleGroup, string> = {
  Chest: '#fb7185',
  Back: '#38bdf8',
  Shoulders: '#a78bfa',
  Biceps: '#4ade80',
  Triceps: '#10b981',
  Quads: '#facc15',
  Hamstrings: '#e879f9',
  Glutes: '#f472b6',
  Calves: '#22d3ee',
  Core: '#a3e635',
  Forearms: '#94a3b8',
  Cardio: '#f87171',
  Mobility: '#818cf8',
};

export const PUSH_MUSCLES: MuscleGroup[] = ['Chest', 'Shoulders', 'Triceps'];
export const PULL_MUSCLES: MuscleGroup[] = ['Back', 'Biceps', 'Forearms'];
export const LEGS_MUSCLES: MuscleGroup[] = ['Quads', 'Hamstrings', 'Glutes', 'Calves'];
export const CORE_MUSCLES: MuscleGroup[] = ['Core'];

export function sortMuscleGroupsForDisplay(groups: Iterable<MuscleGroup>): MuscleGroup[] {
  const set = new Set(groups);
  return MUSCLE_GROUPS.filter((g) => set.has(g));
}

type SessionLike = {
  groups: MuscleGroup[];
  entries: { exerciseId: string; trainedMuscleGroups?: MuscleGroup[] }[];
};

/**
 * Muscle groups trained in a session: union of saved `groups` and each entry's picked muscles
 * (or primary + secondary when not stored).
 */
export function muscleGroupsForSession(session: SessionLike, exerciseById: Map<string, Exercise>): MuscleGroup[] {
  const out = new Set<MuscleGroup>();
  for (const g of session.groups ?? []) out.add(g);
  for (const e of session.entries ?? []) {
    const ex = exerciseById.get(e.exerciseId);
    if (!ex) continue;
    if (e.trainedMuscleGroups && e.trainedMuscleGroups.length > 0) {
      for (const g of e.trainedMuscleGroups) out.add(g);
    } else {
      out.add(ex.primaryGroup);
      for (const s of ex.secondaryGroups ?? []) out.add(s);
    }
  }
  return sortMuscleGroupsForDisplay(out);
}
