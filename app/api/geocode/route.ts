/**
 * Nominatim proxy – geocode (address → coords) and reverse-geocode (coords → address).
 * Nominatim's usage policy requires:
 *   - A meaningful User-Agent
 *   - No more than 1 req/sec (enforced by the client via staggered batching)
 */
import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const UA = 'omidzanganeh.com/geocoder-tool (contact@omidzanganeh.com)';

export interface GeocodeRow {
  input: string;
  lat: number | null;
  lon: number | null;
  display_name: string | null;
  error?: string;
}

export interface ReverseRow {
  input: string;         // "lat,lon"
  lat: number;
  lon: number;
  display_name: string | null;
  error?: string;
}

/* POST /api/geocode
 * Body: { mode: 'forward', addresses: string[] }
 *    or { mode: 'reverse', points: Array<{lat:number, lon:number}> }
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const { mode } = body as { mode: string };

  if (mode === 'forward') {
    const { addresses } = body as { addresses: string[] };
    if (!Array.isArray(addresses) || addresses.length === 0)
      return NextResponse.json({ error: 'No addresses' }, { status: 400 });
    if (addresses.length > 200)
      return NextResponse.json({ error: 'Max 200 rows per request' }, { status: 400 });

    // Strip US Census place-type labels (e.g. "Darien city, IL" → "Darien, IL")
    // These labels appear in Census TIGER data but Nominatim doesn't recognize them.
    const PLACE_TYPE_RE = /\s+(city|town|village|CDP|borough|township|county)\b/gi;

    type NomResult = Array<{ lat: string; lon: string; display_name: string }>;

    // Parse "Name [type], ST" → { city, state } for structured fallback
    function parseUSCityState(input: string): { city: string; state: string } | null {
      const m = input.match(/^(.+?),\s*([A-Z]{2})\s*$/);
      if (!m) return null;
      const city  = m[1].replace(PLACE_TYPE_RE, '').trim();
      const stMap: Record<string, string> = {
        AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
        CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
        HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',
        KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
        MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',
        NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',
        NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
        OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
        SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
        VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
        DC:'District of Columbia',
      };
      const state = stMap[m[2].toUpperCase()];
      if (!city || !state) return null;
      return { city, state };
    }

    async function nominatimFetch(url: string): Promise<NomResult> {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<NomResult>;
    }

    const results: GeocodeRow[] = [];
    for (const addr of addresses) {
      const trimmed = addr.trim();
      if (!trimmed) { results.push({ input: addr, lat: null, lon: null, display_name: null, error: 'empty' }); continue; }
      try {
        // Pass 1: free-text search with original input
        let data = await nominatimFetch(
          `${NOMINATIM}/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1&addressdetails=0&countrycodes=us`,
        );

        // Pass 2: if no result, try stripping place-type label and retry
        if (data.length === 0) {
          const cleaned = trimmed.replace(PLACE_TYPE_RE, '');
          if (cleaned !== trimmed) {
            data = await nominatimFetch(
              `${NOMINATIM}/search?q=${encodeURIComponent(cleaned)}&format=json&limit=1&addressdetails=0&countrycodes=us`,
            );
            await new Promise(r => setTimeout(r, 1050));
          }
        }

        // Pass 3: structured city + state query (handles CDPs, unincorporated places)
        if (data.length === 0) {
          const parsed = parseUSCityState(trimmed);
          if (parsed) {
            data = await nominatimFetch(
              `${NOMINATIM}/search?city=${encodeURIComponent(parsed.city)}&state=${encodeURIComponent(parsed.state)}&format=json&limit=1&addressdetails=0&countrycodes=us`,
            );
            await new Promise(r => setTimeout(r, 1050));
          }
        }

        if (data.length === 0) {
          results.push({ input: addr, lat: null, lon: null, display_name: null, error: 'not found' });
        } else {
          results.push({ input: addr, lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name });
        }
      } catch (e) {
        results.push({ input: addr, lat: null, lon: null, display_name: null, error: e instanceof Error ? e.message : 'unknown' });
      }
      // Nominatim rate-limit: 1 req/s
      await new Promise(r => setTimeout(r, 1050));
    }
    return NextResponse.json({ results });
  }

  if (mode === 'reverse') {
    const { points } = body as { points: Array<{ lat: number; lon: number }> };
    if (!Array.isArray(points) || points.length === 0)
      return NextResponse.json({ error: 'No points' }, { status: 400 });
    if (points.length > 200)
      return NextResponse.json({ error: 'Max 200 rows per request' }, { status: 400 });

    const results: ReverseRow[] = [];
    for (const pt of points) {
      const { lat, lon } = pt;
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        results.push({ input: `${lat},${lon}`, lat, lon, display_name: null, error: 'invalid coordinates' });
        continue;
      }
      try {
        const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=0`;
        const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
        if (!res.ok) { results.push({ input: `${lat},${lon}`, lat, lon, display_name: null, error: `HTTP ${res.status}` }); }
        else {
          const data = await res.json() as { display_name?: string; error?: string };
          if (data.error || !data.display_name)
            results.push({ input: `${lat},${lon}`, lat, lon, display_name: null, error: data.error ?? 'not found' });
          else
            results.push({ input: `${lat},${lon}`, lat, lon, display_name: data.display_name });
        }
      } catch (e) {
        results.push({ input: `${lat},${lon}`, lat, lon, display_name: null, error: e instanceof Error ? e.message : 'unknown' });
      }
      await new Promise(r => setTimeout(r, 1050));
    }
    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
}
