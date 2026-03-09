/**
 * Server-side proxy for the Overpass API (OpenStreetMap POI queries).
 * Avoids browser CORS restrictions while keeping client code simple.
 */
import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json() as { query: string });
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  if (!query?.trim())
    return NextResponse.json({ error: 'Empty query' }, { status: 400 });

  try {
    const res = await fetch(OVERPASS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(30_000),
    });

    if (!res.ok)
      return NextResponse.json(
        { error: `Overpass returned ${res.status}` },
        { status: res.status },
      );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Overpass request failed' },
      { status: 502 },
    );
  }
}
