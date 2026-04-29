import { auth } from '@/auth';
import { isDatabaseConfigured } from '@/lib/db/database-url';
import { getGymFlowData, saveGymFlowData } from '@/lib/db/gym-flow';
import { NextResponse } from 'next/server';

function isValidPersistedPayload(x: unknown): boolean {
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

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const row = await getGymFlowData(session.user.id);
    if (!row) {
      return NextResponse.json({ data: null, updatedAt: null });
    }
    return NextResponse.json({
      data: row.payload,
      updatedAt: row.updated_at,
    });
  } catch (e) {
    console.error('[gym-flow/data GET]', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
  if (!isValidPersistedPayload(body)) {
    return NextResponse.json({ error: 'Invalid gym data shape' }, { status: 400 });
  }
  try {
    await saveGymFlowData(session.user.id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[gym-flow/data PUT]', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
