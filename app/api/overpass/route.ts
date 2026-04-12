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

  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY  = 2500; // ms between retries on 429

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(OVERPASS_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(query)}`,
        signal:  AbortSignal.timeout(45_000),
      });

      // Rate-limited — wait and retry
      if (res.status === 429 && attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }

      if (!res.ok)
        return NextResponse.json(
          { error: `Overpass returned ${res.status}` },
          { status: res.status },
        );

      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); }
      catch {
        return NextResponse.json(
          { error: `Overpass returned non-JSON: ${text.slice(0, 200)}` },
          { status: 502 },
        );
      }
      return NextResponse.json(data);
    } catch (err: unknown) {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        continue;
      }
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Overpass request failed' },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ error: 'Overpass rate-limited after retries' }, { status: 429 });
}
