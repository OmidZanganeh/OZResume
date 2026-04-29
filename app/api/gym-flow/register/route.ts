import { registerEmailAccount } from '@/lib/db/gym-flow-credentials';
import { isDatabaseConfigured } from '@/lib/db/database-url';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const email = typeof o.email === 'string' ? o.email : '';
  const password = typeof o.password === 'string' ? o.password : '';

  const result = await registerEmailAccount(email, password);
  if (!result.ok) {
    const status =
      result.error.includes('already exists') ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
