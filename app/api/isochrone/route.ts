import { NextRequest, NextResponse } from 'next/server';
import { VALHALLA_ISOCHRONE_URL } from '@/app/lib/valhalla';

/** Server-side fallback proxy — primary path is browser → Valhalla direct. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const upstream = await fetch(VALHALLA_ISOCHRONE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Multi-ring isochrones can take 30–60 s; do not abort early.
      signal: AbortSignal.timeout(90_000),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json({ error: text || `Valhalla HTTP ${upstream.status}` }, { status: upstream.status });
    }
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
