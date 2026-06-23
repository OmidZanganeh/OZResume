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

  // Race all mirrors in parallel — return first success
  const attempts = ENDPOINTS.map(async endpoint => {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`${endpoint} → HTTP ${res.status}`);
    const text = await res.text();
    try { return JSON.parse(text) as unknown; }
    catch { throw new Error(`${endpoint} → non-JSON`); }
  });

  try {
    const data = await Promise.any(attempts);
    return NextResponse.json(data);
  } catch {
    await new Promise(r => setTimeout(r, PASS_DELAY_MS));
    const retry = await queryEndpoints(body);
    if (retry.ok) return NextResponse.json(retry.data);
    return NextResponse.json(
      { error: `All Overpass endpoints failed. Last: ${retry.lastErr}` },
      { status: 502 },
    );
  }
}
