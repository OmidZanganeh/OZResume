import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../data/exerciseLibrary';

/** Distinct colors for calendar muscle stripes (one per group). */
export const MUSCLE_GROUP_CALENDAR_COLOR: Record<MuscleGroup, string> = {
  Chest: '#ea580c',
  Back: '#2563eb',
  Shoulders: '#7c3aed',
  Biceps: '#16a34a',
  Triceps: '#0d9488',
  Quads: '#ca8a04',
  Hamstrings: '#db2777',
  Glutes: '#e11d48',
  Calves: '#0891b2',
  Core: '#65a30d',
  Forearms: '#475569',
  Cardio: '#dc2626',
  Mobility: '#6366f1',
};

export function sortMuscleGroupsForDisplay(groups: Iterable<MuscleGroup>): MuscleGroup[] {
  const set = new Set(groups);
  return MUSCLE_GROUPS.filter((g) => set.has(g));
}

type SessionLike = {
  groups: MuscleGroup[];
  entries: { exerciseId: string }[];
};

/**
 * Muscle groups trained in a session: union of saved `groups` and each entry's primary + secondary.
 */
export function muscleGroupsForSession(session: SessionLike, exerciseById: Map<string, Exercise>): MuscleGroup[] {
  const out = new Set<MuscleGroup>();
  for (const g of session.groups ?? []) out.add(g);
  for (const e of session.entries ?? []) {
    const ex = exerciseById.get(e.exerciseId);
    if (!ex) continue;
    out.add(ex.primaryGroup);
    for (const s of ex.secondaryGroups ?? []) out.add(s);
  }
  return sortMuscleGroupsForDisplay(out);
}
