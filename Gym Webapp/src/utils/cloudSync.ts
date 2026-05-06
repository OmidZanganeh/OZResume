import type { PersistedGymData } from '../data/gymFlowStorage';

const SESSION = '/api/auth/session';
const DATA = '/api/gym-flow/data';
const PROFILE = '/api/gym-flow/profile';

/** -1 = never applied server payload yet; then last `updatedAt` ms from API. */
let lastHydratedServerMtime = -1;

/** Call after sign-in so the next GET is applied even if timestamps matched a previous tab. */
export function resetCloudHydrationCursor(): void {
  lastHydratedServerMtime = -1;
}

function isPersistedEmpty(d: PersistedGymData): boolean {
  return (
    d.sessions.length === 0 &&
    d.savedPlans.length === 0 &&
    d.customExercises.length === 0 &&
    Object.keys(d.stats).length === 0 &&
    !(d.userProfile && Object.keys(d.userProfile).length > 0) &&
    (!d.nutritionLogs || d.nutritionLogs.length === 0) &&
    !(d.nutritionGoals && Object.keys(d.nutritionGoals).length > 0) &&
    (!d.customFoods || d.customFoods.length === 0) &&
    (!d.nutritionFavorites || d.nutritionFavorites.length === 0) &&
    (!d.nutritionMealTemplates || d.nutritionMealTemplates.length === 0)
  );
}

function isValidCloudPayload(x: unknown): x is PersistedGymData {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (
    !Array.isArray(o.customExercises) ||
    o.stats === null ||
    typeof o.stats !== 'object' ||
    !Array.isArray(o.sessions) ||
    !Array.isArray(o.savedPlans)
  ) {
    return false;
  }
  if (o.userProfile != null && (typeof o.userProfile !== 'object' || Array.isArray(o.userProfile))) {
    return false;
  }
  return true;
}

async function fetchSession(): Promise<{ user?: { id?: string } } | null> {
  try {
    const r = await fetch(SESSION, { credentials: 'include' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** Whether the user has a NextAuth session (same origin, cookies). */
export async function fetchAuthSession(): Promise<{ user?: { id?: string } } | null> {
  return fetchSession();
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleCloudPush(data: PersistedGymData): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushCloudPayload(data);
  }, 900);
}

export async function saveUserProfileCloud(userProfile: PersistedGymData['userProfile']): Promise<{ ok: boolean; error?: string }> {
  const session = await fetchSession();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in' };
  try {
    const r = await fetch(PROFILE, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile: userProfile ?? {} }),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: j.error ?? 'Could not save' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function pushCloudPayload(data: PersistedGymData): Promise<boolean> {
  const session = await fetchSession();
  if (!session?.user?.id) return false;
  try {
    const r = await fetch(DATA, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * If signed in: pull newer server JSON into the app, or seed the server from current in-memory state when empty.
 * `getSnapshot` must return current React state (e.g. via ref), not `loadPersistedGymData()`.
 */
export async function hydrateFromCloudIfSignedIn(
  getSnapshot: () => PersistedGymData,
  applyMerged: (data: PersistedGymData) => void,
): Promise<void> {
  const session = await fetchSession();
  if (!session?.user?.id) return;

  let res: Response;
  try {
    res = await fetch(DATA, { credentials: 'include' });
  } catch {
    return;
  }
  if (res.status === 401 || res.status === 503) return;
  if (!res.ok) return;

  const json = (await res.json()) as { data: unknown; updatedAt: string | null };
  const local = getSnapshot();
  const serverM = json.updatedAt ? new Date(json.updatedAt).getTime() : 0;

  const serverPayload = json.data;
  if (serverPayload != null && isValidCloudPayload(serverPayload)) {
    if (serverM > lastHydratedServerMtime) {
      applyMerged(serverPayload);
      lastHydratedServerMtime = serverM;
    }
    return;
  }

  if (!isPersistedEmpty(local)) {
    await pushCloudPayload(local);
  }
}
