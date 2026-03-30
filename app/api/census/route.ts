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

// Census API limit: 50 variables per request. Split into two batches.
const ACS_VARS_1 = [
  'NAME',
  // Core population & income
  'B01003_001E', 'B01002_001E', 'B19013_001E',
  // Housing (ownership, value)
  'B25077_001E', 'B25003_001E', 'B25003_002E',
  // Employment
  'B23025_003E', 'B23025_005E',
  // Poverty
  'B17001_001E', 'B17001_002E',
  // Rent
  'B25064_001E', 'B25071_001E',
  // SNAP
  'B22010_001E', 'B22010_002E',
  // Race/Ethnicity (B03002)
  'B03002_001E', 'B03002_003E', 'B03002_004E', 'B03002_005E',
  'B03002_006E', 'B03002_009E', 'B03002_012E',
  // Education — population 25+ (B15003)
  'B15003_001E', 'B15003_017E', 'B15003_018E', 'B15003_019E',
  'B15003_020E', 'B15003_021E', 'B15003_022E', 'B15003_023E',
  'B15003_024E', 'B15003_025E',
  // Commute mode (B08301) + aggregate time (B08136)
  'B08301_001E', 'B08301_003E', 'B08301_004E', 'B08301_010E',
  'B08301_018E', 'B08301_019E', 'B08301_021E', 'B08136_001E',
]; // 40 vars

const ACS_VARS_2 = [
  'NAME',
  // Housing vacancy
  'B25002_001E', 'B25002_003E',
  // Median year built
  'B25035_001E',
  // Units in structure (B25024)
  'B25024_002E', 'B25024_003E', 'B25024_004E', 'B25024_005E',
  'B25024_006E', 'B25024_007E', 'B25024_008E', 'B25024_009E', 'B25024_010E',
  // Internet / broadband
  'B28002_001E', 'B28002_004E',
  // Language spoken at home (C16001 — available at tract level)
  'C16001_001E', 'C16001_002E', 'C16001_003E',
]; // 18 vars

interface GeocoderTract {
  STATE:  string;
  COUNTY: string;
  TRACT:  string;
  name:   string;
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
      `&benchmark=Public_AR_Current&vintage=Census2020_Current&format=json`;

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

  /* ── Step 2: ACS 5-year (two parallel requests, each ≤ 50 vars) ── */
  try {
    const forClause = `&for=tract:${tract.TRACT}&in=state:${tract.STATE}%20county:${tract.COUNTY}`;
    const [acsRes1, acsRes2] = await Promise.all([
      fetch(`${ACS_URL}?get=${ACS_VARS_1.join(',')}${forClause}`, { signal: AbortSignal.timeout(12_000) }),
      fetch(`${ACS_URL}?get=${ACS_VARS_2.join(',')}${forClause}`, { signal: AbortSignal.timeout(12_000) }),
    ]);
    if (!acsRes1.ok) return NextResponse.json({ error: `ACS API: HTTP ${acsRes1.status}` }, { status: 502 });
    if (!acsRes2.ok) return NextResponse.json({ error: `ACS API (batch 2): HTTP ${acsRes2.status}` }, { status: 502 });

    const [acsData1, acsData2] = await Promise.all([
      acsRes1.json() as Promise<string[][]>,
      acsRes2.json() as Promise<string[][]>,
    ]);
    if (!Array.isArray(acsData1) || acsData1.length < 2) {
      return NextResponse.json({ error: 'No ACS data for this tract.' }, { status: 404 });
    }

    // Merge both responses into a single flat row (skip duplicate NAME/geo columns from batch 2)
    const geo2Skip = new Set(['NAME', 'state', 'county', 'tract']);
    const extraHeaders = (acsData2[0] ?? []).filter(h => !geo2Skip.has(h));
    const extraRow     = (acsData2[1] ?? []).filter((_, i) => !geo2Skip.has((acsData2[0] ?? [])[i]));
    const headers = [...acsData1[0], ...extraHeaders];
    const row     = [...acsData1[1], ...extraRow];
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

    const pct = (num: number | null, den: number | null, dec = 1): number | null => {
      if (num === null || den === null || den === 0) return null;
      return Math.round((num / den) * 100 * Math.pow(10, dec)) / Math.pow(10, dec);
    };
    const add2 = (a: number | null, b: number | null) =>
      a === null || b === null ? null : a + b;

    // Core
    const population      = get('B01003_001E');
    const medianAge       = getF('B01002_001E');
    const medianIncome    = get('B19013_001E');
    const medianHomeValue = get('B25077_001E');
    const totalHousing    = get('B25003_001E');
    const ownerOccupied   = get('B25003_002E');
    const laborForce      = get('B23025_003E');
    const unemployed      = get('B23025_005E');
    // Poverty
    const popPov    = get('B17001_001E');
    const belowPov  = get('B17001_002E');
    // Rent
    const medianRent  = get('B25064_001E');
    const rentBurden  = getF('B25071_001E');
    // SNAP
    const totalHH = get('B22010_001E');
    const snapHH  = get('B22010_002E');
    // Race
    const raceTotal    = get('B03002_001E');
    const raceWhite    = get('B03002_003E');
    const raceBlack    = get('B03002_004E');
    const raceAIAN     = get('B03002_005E');
    const raceAsian    = get('B03002_006E');
    const raceTwoPlus  = get('B03002_009E');
    const raceHispanic = get('B03002_012E');
    const raceOther = (raceTotal !== null && raceWhite !== null && raceBlack !== null &&
      raceAIAN !== null && raceAsian !== null && raceTwoPlus !== null && raceHispanic !== null)
      ? Math.max(0, raceTotal - raceWhite - raceBlack - raceAIAN - raceAsian - raceTwoPlus - raceHispanic)
      : null;
    // Education (25+)
    const edu25     = get('B15003_001E');
    const eduHSGED  = add2(get('B15003_017E'), get('B15003_018E'));
    const eduSomeC  = add2(add2(get('B15003_019E'), get('B15003_020E')), get('B15003_021E'));
    const eduBach   = get('B15003_022E');
    const eduGrad   = add2(add2(get('B15003_023E'), get('B15003_024E')), get('B15003_025E'));
    const eduLessHS = (edu25 !== null && eduHSGED !== null && eduSomeC !== null &&
      eduBach !== null && eduGrad !== null)
      ? Math.max(0, edu25 - eduHSGED - eduSomeC - eduBach - eduGrad) : null;
    // Commute
    const commTotal   = get('B08301_001E');
    const commDrive   = get('B08301_003E');
    const commCarpool = get('B08301_004E');
    const commTransit = get('B08301_010E');
    const commBike    = get('B08301_018E');
    const commWalk    = get('B08301_019E');
    const commWFH    = get('B08301_021E');
    const commAgg    = get('B08136_001E');
    const commuters  = (commTotal !== null && commWFH !== null) ? commTotal - commWFH : null;
    const avgCommute = (commAgg !== null && commuters !== null && commuters > 0)
      ? Math.round(commAgg / commuters) : null;
    // Housing units
    const totalUnits    = get('B25002_001E');
    const vacantUnits   = get('B25002_003E');
    const medYrBuilt    = get('B25035_001E');
    const singleFamily  = add2(get('B25024_002E'), get('B25024_003E'));
    const smallMulti    = add2(get('B25024_004E'), get('B25024_005E'));
    const largeMulti    = add2(add2(add2(get('B25024_006E'), get('B25024_007E')), get('B25024_008E')), get('B25024_009E'));
    const mobile        = get('B25024_010E');
    // Internet
    const hhInt       = get('B28002_001E');
    const hhBroadband = get('B28002_004E');
    // Language
    const langTotal   = get('C16001_001E');
    const langEnglish = get('C16001_002E');
    const langSpanish = get('C16001_003E');
    const langOther   = (langTotal !== null && langEnglish !== null && langSpanish !== null)
      ? Math.max(0, langTotal - langEnglish - langSpanish) : null;

    return NextResponse.json({
      NAME: row[headers.indexOf('NAME')] ?? '',
      tract,
      population,
      medianAge,
      medianIncome,
      medianHomeValue,
      ownershipRate:    pct(ownerOccupied, totalHousing, 0),
      unemploymentRate: pct(unemployed, laborForce),
      povertyRate:      pct(belowPov, popPov),
      medianRent,
      rentBurden,
      snapRate:         pct(snapHH, totalHH),
      race: raceTotal ? {
        total: raceTotal, white: raceWhite, black: raceBlack, asian: raceAsian,
        hispanic: raceHispanic, nativeAmerican: raceAIAN, twoOrMore: raceTwoPlus, other: raceOther,
      } : null,
      education: edu25 ? {
        total: edu25, lessThanHS: eduLessHS, hsOrGed: eduHSGED,
        someCollege: eduSomeC, bachelors: eduBach, graduate: eduGrad,
      } : null,
      commute: commTotal ? {
        total: commTotal, driveAlone: commDrive, carpool: commCarpool,
        transit: commTransit, bicycle: commBike, walk: commWalk,
        workFromHome: commWFH, avgMinutes: avgCommute,
      } : null,
      housing: {
        totalUnits, vacancyRate: pct(vacantUnits, totalUnits),
        medianYearBuilt: medYrBuilt, singleFamily, smallMulti, largeMulti, mobile,
      },
      broadbandRate: pct(hhBroadband, hhInt),
      language: langTotal ? {
        total: langTotal, englishOnly: langEnglish, spanish: langSpanish, other: langOther,
      } : null,
    });
  } catch (e) {
    return NextResponse.json({ error: `ACS fetch failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 });
  }
}
