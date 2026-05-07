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
  // Confidence & classification
  confidence: number | null;      // Nominatim importance 0–1 (higher = more certain)
  place_rank: number | null;       // 4=country … 16=city … 30=building
  addresstype: string | null;      // city, village, county, road, suburb …
  osm_type: string | null;         // node | way | relation
  osm_id: number | null;
  // Structured address breakdown
  road: string | null;
  suburb: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  // Extras
  population: number | null;
  website: string | null;
  wikidata: string | null;
  boundingbox: [string, string, string, string] | null; // [minLat, maxLat, minLon, maxLon]
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

    // Strip trailing US Census place-type labels when present as suffix
    // (e.g. "Darien city, IL" → "Darien, IL").
    const PLACE_TYPE_SUFFIX_RE = /\s+(city|town|village|cdp|borough|township|county)\s*$/i;

    type NomResult = Array<{
      lat: string; lon: string; display_name: string;
      importance: number; place_rank: number; addresstype: string;
      osm_type: string; osm_id: number;
      boundingbox: [string, string, string, string];
      address?: {
        road?: string; suburb?: string; city?: string; town?: string; village?: string;
        county?: string; state?: string; postcode?: string;
        country?: string; country_code?: string;
      };
      extratags?: {
        population?: string; website?: string; wikidata?: string;
      };
    }>;

    function stripTrailingPlaceTypeLabel(input: string): string {
      const m = input.match(/^(.+?),\s*([A-Z]{2})\s*$/i);
      if (!m) return input;
      const place = m[1].trim();
      const normalizedPlace = place.replace(PLACE_TYPE_SUFFIX_RE, '').trim();
      if (!normalizedPlace || normalizedPlace === place) return input;
      return `${normalizedPlace}, ${m[2].toUpperCase()}`;
    }

    // Parse "Name, ST" → { city, state } for structured query fallback
    function parseUSCityState(input: string): { city: string; state: string } | null {
      const m = input.match(/^(.+?),\s*([A-Z]{2})\s*$/);
      if (!m) return null;
      const city  = m[1].trim();
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

    function normalizePlaceName(input: string): string {
      return input
        .toLowerCase()
        .replace(PLACE_TYPE_SUFFIX_RE, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function pickBestHit(
      hits: NomResult,
      parsed: { city: string; state: string } | null,
    ): NomResult[0] | null {
      if (hits.length === 0) return null;
      if (!parsed) return hits[0];

      const targetCity = normalizePlaceName(parsed.city);
      const targetState = parsed.state.toLowerCase();
      const localityTypes = new Set(['city', 'town', 'village', 'hamlet', 'municipality', 'borough', 'township', 'administrative', 'county']);

      const ranked = hits
        .map((h) => {
          const a = h.address ?? {};
          const state = (a.state ?? '').toLowerCase();
          const locality = normalizePlaceName(a.city ?? a.town ?? a.village ?? '');
          const display = (h.display_name ?? '').toLowerCase();
          const type = (h.addresstype ?? '').toLowerCase();
          const stateMatch = state === targetState;
          const cityMatch = !!locality && locality === targetCity;

          let score = (h.importance ?? 0) * 10;
          if (a.country_code?.toLowerCase() === 'us') score += 4;
          if (stateMatch) score += 40;
          if (cityMatch) score += 36;
          if (!cityMatch && targetCity && display.startsWith(targetCity)) score += 10;
          if (localityTypes.has(type)) score += 8;
          if (type === 'road' || type === 'street' || type === 'residential') score -= 24;
          if (h.place_rank >= 12 && h.place_rank <= 21) score += 6;
          if (h.place_rank >= 27) score -= 6;

          return { h, score, stateMatch, cityMatch };
        })
        .sort((a, b) => b.score - a.score);

      // For city/state input, only trust a result from the expected state.
      const bestStateMatch = ranked.find((r) => r.stateMatch);
      if (bestStateMatch) return bestStateMatch.h;
      return null;
    }

    async function nominatimFetch(url: string): Promise<NomResult> {
      // Always request addressdetails + extratags so all enriched fields are available
      const enriched = url.includes('?')
        ? url + '&addressdetails=1&extratags=1'
        : url + '?addressdetails=1&extratags=1';
      const res = await fetch(enriched, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<NomResult>;
    }

    function rowFromHit(input: string, h: NomResult[0]): GeocodeRow {
      const a = h.address ?? {};
      return {
        input,
        lat: parseFloat(h.lat),
        lon: parseFloat(h.lon),
        display_name: h.display_name,
        confidence: Math.round(h.importance * 100) / 100,
        place_rank: h.place_rank,
        addresstype: h.addresstype,
        osm_type: h.osm_type,
        osm_id: h.osm_id,
        road: a.road ?? null,
        suburb: a.suburb ?? null,
        city: a.city ?? a.town ?? a.village ?? null,
        county: a.county ?? null,
        state: a.state ?? null,
        postcode: a.postcode ?? null,
        country: a.country ?? null,
        country_code: a.country_code?.toUpperCase() ?? null,
        population: h.extratags?.population ? parseInt(h.extratags.population, 10) : null,
        website: h.extratags?.website ?? null,
        wikidata: h.extratags?.wikidata ?? null,
        boundingbox: h.boundingbox ?? null,
      };
    }

    const results: GeocodeRow[] = [];
    for (const addr of addresses) {
      const trimmed = addr.trim();
      if (!trimmed) { results.push({ input: addr, lat: null, lon: null, display_name: null, confidence: null, place_rank: null, addresstype: null, osm_type: null, osm_id: null, road: null, suburb: null, city: null, county: null, state: null, postcode: null, country: null, country_code: null, population: null, website: null, wikidata: null, boundingbox: null, error: 'empty' }); continue; }
      try {
        const parsedOriginal = parseUSCityState(trimmed);
        let bestHit: NomResult[0] | null = null;

        // Pass 1: structured city + state query (exact place text first)
        if (parsedOriginal) {
          const data = await nominatimFetch(
            `${NOMINATIM}/search?city=${encodeURIComponent(parsedOriginal.city)}&state=${encodeURIComponent(parsedOriginal.state)}&format=json&limit=5&countrycodes=us`,
          );
          bestHit = pickBestHit(data, parsedOriginal);
          await new Promise(r => setTimeout(r, 1050));
        }

        // Pass 2: structured query after stripping trailing place-type suffix
        if (!bestHit) {
          const cleaned = stripTrailingPlaceTypeLabel(trimmed);
          if (cleaned !== trimmed) {
            const parsed = parseUSCityState(cleaned);
            if (parsed) {
              const data = await nominatimFetch(
                `${NOMINATIM}/search?city=${encodeURIComponent(parsed.city)}&state=${encodeURIComponent(parsed.state)}&format=json&limit=5&countrycodes=us`,
              );
              bestHit = pickBestHit(data, parsed);
              await new Promise(r => setTimeout(r, 1050));
            }
          }
        }

        // Pass 3: free-text search with original input
        if (!bestHit) {
          const data = await nominatimFetch(
            `${NOMINATIM}/search?q=${encodeURIComponent(trimmed)}&format=json&limit=5&countrycodes=us`,
          );
          bestHit = pickBestHit(data, parsedOriginal);
        }

        // Pass 4: if still no result, free-text with trailing place-type suffix stripped
        if (!bestHit) {
          const cleaned = stripTrailingPlaceTypeLabel(trimmed);
          if (cleaned !== trimmed) {
            const parsed = parseUSCityState(cleaned);
            const data = await nominatimFetch(
              `${NOMINATIM}/search?q=${encodeURIComponent(cleaned)}&format=json&limit=5&countrycodes=us`,
            );
            bestHit = pickBestHit(data, parsed ?? parsedOriginal);
            await new Promise(r => setTimeout(r, 1050));
          }
        }

        if (!bestHit && parsedOriginal) {
          // Final safety: try structured once more from original (helps transient ordering issues).
          const data = await nominatimFetch(
            `${NOMINATIM}/search?city=${encodeURIComponent(parsedOriginal.city)}&state=${encodeURIComponent(parsedOriginal.state)}&format=json&limit=5&countrycodes=us`,
          );
          bestHit = pickBestHit(data, parsedOriginal);
          await new Promise(r => setTimeout(r, 1050));
        }

        if (!bestHit) {
          const parsed = parseUSCityState(trimmed);
          if (parsed) {
            // Fallback: accept best available structured result even if state was not explicit on hit.
            const data = await nominatimFetch(
              `${NOMINATIM}/search?city=${encodeURIComponent(parsed.city)}&state=${encodeURIComponent(parsed.state)}&format=json&limit=5&countrycodes=us`,
            );
            bestHit = data[0] ?? null;
            await new Promise(r => setTimeout(r, 1050));
          }
        }

        if (!bestHit) {
          results.push({ input: addr, lat: null, lon: null, display_name: null,
            confidence: null, place_rank: null, addresstype: null, osm_type: null, osm_id: null,
            road: null, suburb: null, city: null, county: null, state: null, postcode: null,
            country: null, country_code: null, population: null, website: null, wikidata: null,
            boundingbox: null, error: 'not found' });
        } else {
          results.push(rowFromHit(addr, bestHit));
        }
      } catch (e) {
        results.push({ input: addr, lat: null, lon: null, display_name: null, confidence: null, place_rank: null, addresstype: null, osm_type: null, osm_id: null, road: null, suburb: null, city: null, county: null, state: null, postcode: null, country: null, country_code: null, population: null, website: null, wikidata: null, boundingbox: null, error: e instanceof Error ? e.message : 'unknown' });
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
