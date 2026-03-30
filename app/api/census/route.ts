/**
 * Census Demographics API proxy — two-step lookup, no API key required:
 *
 * Step 1 — Census Geocoder: lat/lon → state FIPS + county FIPS + tract code
 * Step 2 — ACS 5-Year Estimates: FIPS codes → demographic variables
 *
 * ACS vintage used: 2023 (most recent 5-year release as of early 2026).
 */
import { NextRequest, NextResponse } from 'next/server';

const GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates';
const ACS_URL      = 'https://api.census.gov/data/2023/acs/acs5';

/** ACS variables we request — extend in future steps */
const ACS_VARS = [
  'NAME',
  'B01003_001E',   // Total population
  'B01002_001E',   // Median age
  'B19013_001E',   // Median household income
  'B25077_001E',   // Median home value
  'B25003_001E',   // Total occupied housing units (denominator for ownership rate)
  'B25003_002E',   // Owner-occupied housing units
  'B23025_003E',   // Civilian labor force (denominator for unemployment rate)
  'B23025_005E',   // Unemployed
  'B01003_001E',   // (duplicate, trimmed by Set below — kept for clarity)
].filter((v, i, a) => a.indexOf(v) === i);

interface GeocoderTract {
  STATE:  string;
  COUNTY: string;
  TRACT:  string;
  name:   string; // display name from Nominatim-style fields
}

interface ACSRow {
  NAME:           string;
  population:     number | null;
  medianAge:      number | null;
  medianIncome:   number | null;
  medianHomeValue:number | null;
  ownershipRate:  number | null;  // %
  unemploymentRate: number | null; // %
  tract:          GeocoderTract;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  /* ── Step 1: Geocoder → FIPS ── */
  let tract: GeocoderTract;
  try {
    const geoUrl =
      `${GEOCODER_URL}?x=${lon}&y=${lat}` +
      `&benchmark=Public_AR_Current&vintage=Current_Vintages` +
      `&layers=Census%20Tracts&format=json`;

    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(12_000) });
    if (!geoRes.ok) return NextResponse.json({ error: `Census Geocoder: HTTP ${geoRes.status}` }, { status: 502 });

    const geoData = await geoRes.json() as {
      result?: {
        geographies?: {
          'Census Tracts'?: Array<{
            STATE: string; COUNTY: string; TRACT: string;
            BASENAME: string; NAME: string;
          }>;
        };
      };
    };

    const tracts = geoData.result?.geographies?.['Census Tracts'];
    if (!tracts || tracts.length === 0) {
      return NextResponse.json({ error: 'No census tract found at this location. Try a point inside the US.' }, { status: 404 });
    }

    const t = tracts[0];
    tract = { STATE: t.STATE, COUNTY: t.COUNTY, TRACT: t.TRACT, name: t.NAME };
  } catch (e) {
    return NextResponse.json({ error: `Geocoder failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 });
  }

  /* ── Step 2: ACS 5-year ── */
  try {
    const acsUrl =
      `${ACS_URL}?get=${ACS_VARS.join(',')}` +
      `&for=tract:${tract.TRACT}` +
      `&in=state:${tract.STATE}%20county:${tract.COUNTY}`;

    const acsRes = await fetch(acsUrl, { signal: AbortSignal.timeout(12_000) });
    if (!acsRes.ok) return NextResponse.json({ error: `ACS API: HTTP ${acsRes.status}` }, { status: 502 });

    const acsData = await acsRes.json() as string[][];
    if (!Array.isArray(acsData) || acsData.length < 2) {
      return NextResponse.json({ error: 'No ACS data for this tract.' }, { status: 404 });
    }

    const headers = acsData[0];
    const row     = acsData[1];
    const get = (key: string) => {
      const idx = headers.indexOf(key);
      if (idx === -1) return null;
      const v = parseInt(row[idx], 10);
      return isNaN(v) || v < 0 ? null : v;
    };
    const getF = (key: string) => {
      const idx = headers.indexOf(key);
      if (idx === -1) return null;
      const v = parseFloat(row[idx]);
      return isNaN(v) || v < 0 ? null : v;
    };

    const laborForce    = get('B23025_003E');
    const unemployed    = get('B23025_005E');
    const totalHousing  = get('B25003_001E');
    const ownerOccupied = get('B25003_002E');

    const result: ACSRow = {
      NAME:             row[headers.indexOf('NAME')] ?? '',
      population:       get('B01003_001E'),
      medianAge:        getF('B01002_001E'),
      medianIncome:     get('B19013_001E'),
      medianHomeValue:  get('B25077_001E'),
      ownershipRate:    (totalHousing && ownerOccupied) ? Math.round((ownerOccupied / totalHousing) * 100) : null,
      unemploymentRate: (laborForce && unemployed)      ? Math.round((unemployed / laborForce) * 100 * 10) / 10 : null,
      tract,
    };

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: `ACS fetch failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 });
  }
}
