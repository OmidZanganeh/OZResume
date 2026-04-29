import { auth } from '@/auth';
import { isDatabaseConfigured } from '@/lib/db/database-url';
import { getGymFlowData, saveGymFlowData } from '@/lib/db/gym-flow';
import { isValidPersistedGymPayload } from '@/lib/gym-flow-payload';
import { sanitizeUserProfile } from '@/lib/gym-flow-user-profile';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawProfile = (body as { userProfile?: unknown }).userProfile;
  const userProfile = sanitizeUserProfile(rawProfile);
  if (!userProfile) {
    return NextResponse.json({ error: 'Invalid userProfile' }, { status: 400 });
  }

  try {
    const row = await getGymFlowData(session.user.id);
    const baseUnknown = row?.payload;

    const base =
      baseUnknown && isValidPersistedGymPayload(baseUnknown)
        ? { ...(baseUnknown as Record<string, unknown>) }
        : {
            customExercises: [],
            stats: {},
            sessions: [],
            savedPlans: [],
          };

    const baseObj = base as Record<string, unknown>;
    const prevProfile =
      baseObj.userProfile && typeof baseObj.userProfile === 'object' && !Array.isArray(baseObj.userProfile)
        ? (baseObj.userProfile as Record<string, unknown>)
        : {};

    const mergedPayload = {
      ...base,
      userProfile: { ...prevProfile, ...userProfile },
    };

    if (!isValidPersistedGymPayload(mergedPayload)) {
      return NextResponse.json({ error: 'Merge produced invalid payload' }, { status: 500 });
    }

    await saveGymFlowData(session.user.id, mergedPayload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[gym-flow/profile PATCH]', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
