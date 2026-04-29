import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';

function musclesFor(ex: Exercise): Set<MuscleGroup> {
  return new Set<MuscleGroup>([ex.primaryGroup, ...(ex.secondaryGroups ?? [])]);
}

/** Higher = better swap for same-muscle work. */
function alternativeScore(target: Exercise, cand: Exercise): number {
  const A = musclesFor(target);
  const B = musclesFor(cand);
  let overlap = 0;
  for (const m of A) {
    if (B.has(m)) overlap += 1;
  }
  if (overlap === 0) return 0;
  let score = overlap * 8;
  if (cand.primaryGroup === target.primaryGroup) score += 40;
  return score;
}

/**
 * Other catalog moves that share at least one muscle with `target` (primary or secondary).
 * Best matches first: same primary + more overlap wins.
 */
export function getAlternativeExercises(
  target: Exercise,
  catalog: Exercise[],
  opts?: { limit?: number },
): Exercise[] {
  const limit = opts?.limit ?? 10;
  return catalog
    .filter((c) => c.id !== target.id)
    .map((c) => ({ c, score: alternativeScore(target, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.c.name.localeCompare(b.c.name);
    })
    .slice(0, limit)
    .map((x) => x.c);
}
