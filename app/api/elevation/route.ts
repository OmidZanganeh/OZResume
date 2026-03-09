/**
 * USGS 3DEP Elevation Point Query Service (EPQS) proxy.
 * Mirrors the method used in profile_automation.py:
 *   - Endpoint: https://epqs.nationalmap.gov/v1/json
 *   - One request per point, returns value in Feet + resolution in metres
 *   - Returns -1000000 for no-data areas (ocean, outside US coverage)
 *
 * We fan out all points in parallel on the server to avoid browser CORS
 * issues and to keep latency reasonable.
 */
import { NextRequest, NextResponse } from 'next/server';

const USGS_URL = 'https://epqs.nationalmap.gov/v1/json';

interface InputPoint { lat: number; lon: number; }

async function queryOne(lat: number, lon: number): Promise<{ elevFt: number | null; resolutionM: number | null }> {
  try {
    const url = `${USGS_URL}?x=${lon}&y=${lat}&units=Feet`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { elevFt: null, resolutionM: null };

    const data = await res.json() as { value?: string | number; resolution?: string | number };

    const val = parseFloat(String(data.value ?? ''));
    const res_m = data.resolution != null ? parseFloat(String(data.resolution)) : null;

    /* USGS returns -1000000 for no-data (ocean / outside coverage) */
    if (isNaN(val) || val < -999000) return { elevFt: null, resolutionM: null };

    return { elevFt: val, resolutionM: res_m };
  } catch {
    return { elevFt: null, resolutionM: null };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { points } = await req.json() as { points: InputPoint[] };

    if (!Array.isArray(points) || points.length === 0)
      return NextResponse.json({ error: 'No points provided' }, { status: 400 });

    /* Fan out all points concurrently — server-side so CORS is not an issue.
       USGS handles the load fine at this scale (~100 points). */
    const raw = await Promise.all(points.map(p => queryOne(p.lat, p.lon)));

    /* Report the resolution from the first successful hit */
    const firstRes = raw.find(r => r.resolutionM != null)?.resolutionM ?? null;

    const results = raw.map((r, i) => ({
      lat:        points[i].lat,
      lon:        points[i].lon,
      elevFt:     r.elevFt,
      elevM:      r.elevFt != null ? r.elevFt * 0.3048 : null,
      noData:     r.elevFt == null,
    }));

    return NextResponse.json({ results, resolutionM: firstRes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
