import { writeGymDataLocal, type PersistedGymData } from '../data/gymFlowStorage';

const SESSION = '/api/auth/session';
const DATA = '/api/gym-flow/data';

function isPersistedEmpty(d: PersistedGymData): boolean {
  return (
    d.sessions.length === 0 &&
    d.savedPlans.length === 0 &&
    d.customExercises.length === 0 &&
    Object.keys(d.stats).length === 0
  );
}

function isValidCloudPayload(x: unknown): x is PersistedGymData {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    Array.isArray(o.customExercises) &&
    o.stats !== null &&
    typeof o.stats === 'object' &&
    Array.isArray(o.sessions) &&
    Array.isArray(o.savedPlans)
  );
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

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleCloudPush(data: PersistedGymData): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushCloudPayload(data);
  }, 900);
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
 * On load: if signed in and server copy is newer, apply it; if server empty and local has data, seed server.
 */
export async function hydrateFromCloudIfSignedIn(
  getLocal: () => PersistedGymData,
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
  const local = getLocal();
  const localM = Number(localStorage.getItem('gf_last_mtime') || '0');
  const serverM = json.updatedAt ? new Date(json.updatedAt).getTime() : 0;

  const serverPayload = json.data;
  if (serverPayload != null && isValidCloudPayload(serverPayload)) {
    if (serverM > localM) {
      applyMerged(serverPayload);
      writeGymDataLocal(serverPayload, serverM);
    }
    return;
  }

  if (!isPersistedEmpty(local)) {
    await pushCloudPayload(local);
  }
}
