/**
 * Generic server-side proxy for ArcGIS REST APIs that don't support browser CORS.
 * Allowed origins: US Census TIGERweb, FEMA NFHL, USGS Water Data.
 */
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PREFIXES = [
  'https://tigerweb.geo.census.gov/',
  'https://hazards.fema.gov/',
  'https://api.waterdata.usgs.gov/',
];

export async function POST(req: NextRequest) {
  let url: string;
  try {
    ({ url } = await req.json() as { url: string });
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  if (!url || !ALLOWED_PREFIXES.some(p => url.startsWith(p))) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
