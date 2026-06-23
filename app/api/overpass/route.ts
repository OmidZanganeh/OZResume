/**
 * Server-side proxy for the Overpass API (OpenStreetMap POI queries).
 * Tries multiple public endpoints in order so one congested server
 * doesn't block the user. Server-to-server is also significantly faster
 * than browser-to-Overpass, especially for dense cities.
 */
import { NextRequest, NextResponse } from 'next/server';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',       // primary (main DE server)
  'https://z.overpass-api.de/api/interpreter',     // load-balanced DE mirror
  'https://overpass.kumi.systems/api/interpreter', // community mirror (AT)
  'https://overpass.private.coffee/api/interpreter', // reliable community mirror
];

const PASS_DELAY_MS = 1200;

async function queryEndpoints(body: string): Promise<{ ok: true; data: unknown } | { ok: false; lastErr: string }> {
  let lastErr = '';
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(25_000),
      });

      if (!res.ok) {
        lastErr = `${endpoint} → HTTP ${res.status}`;
        continue;
      }

      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); }
      catch {
        lastErr = `${endpoint} → non-JSON response`;
        continue;
      }
      return { ok: true, data };
    } catch (err: unknown) {
      lastErr = `${endpoint} → ${err instanceof Error ? err.message : 'failed'}`;
    }
  }
  return { ok: false, lastErr };
}

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json() as { query: string });
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  if (!query?.trim())
    return NextResponse.json({ error: 'Empty query' }, { status: 400 });

  const body = `data=${encodeURIComponent(query)}`;

  // First pass through all endpoints; if all fail, wait and try once more.
  let result = await queryEndpoints(body);
  if (!result.ok) {
    await new Promise(r => setTimeout(r, PASS_DELAY_MS));
    result = await queryEndpoints(body);
  }

  if (result.ok) return NextResponse.json(result.data);

  return NextResponse.json(
    { error: `All Overpass endpoints failed. Last: ${result.lastErr}` },
    { status: 502 },
  );
}
