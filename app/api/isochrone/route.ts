import { NextRequest, NextResponse } from 'next/server';

// Multiple public Valhalla endpoints — tried in order, first success wins
const VALHALLA_ENDPOINTS = [
  'https://valhalla1.openstreetmap.de/isochrone',
  'https://valhalla.openstreetmap.de/isochrone',
];

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  let lastErr = 'No endpoints available';
  for (const endpoint of VALHALLA_ENDPOINTS) {
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      if (!upstream.ok) {
        const text = await upstream.text();
        // 4xx means bad request — no point retrying other endpoints
        if (upstream.status < 500) return NextResponse.json({ error: text }, { status: upstream.status });
        lastErr = `${endpoint}: HTTP ${upstream.status}`;
        continue;
      }
      const data = await upstream.json();
      return NextResponse.json(data);
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      // timeout or network error — try next endpoint
    }
  }

  return NextResponse.json({ error: `All Valhalla endpoints failed. Last error: ${lastErr}` }, { status: 502 });
}
