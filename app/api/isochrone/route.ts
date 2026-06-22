import { NextRequest, NextResponse } from 'next/server';

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/isochrone';
const ORS_KEY = process.env.ORS_API_KEY ?? '';

interface IsoRequest {
  locations: { lat: number; lon: number }[];
  costing: string;
  contours: { time: number }[];
  polygons?: boolean;
}

function orsProfile(costing: string): string {
  if (costing === 'pedestrian') return 'foot-walking';
  if (costing === 'bicycle') return 'cycling-regular';
  return 'driving-car';
}

async function fetchValhalla(body: IsoRequest): Promise<Record<string, unknown>> {
  const res = await fetch(VALHALLA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // No timeout — matches the route that worked before today's changes.
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Valhalla HTTP ${res.status}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/** OpenRouteService — free key at https://openrouteservice.org/dev/#/signup */
async function fetchOrs(body: IsoRequest): Promise<Record<string, unknown>> {
  if (!ORS_KEY) throw new Error('ORS_API_KEY not set');
  const loc = body.locations[0];
  if (!loc) throw new Error('Missing origin location');

  const minutes = body.contours.map(c => c.time).sort((a, b) => a - b);
  const profile = orsProfile(body.costing);

  const res = await fetch(`https://api.openrouteservice.org/v2/isochrones/${profile}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ORS_KEY,
    },
    body: JSON.stringify({
      locations: [[loc.lon, loc.lat]],
      range: minutes.map(m => m * 60),
      range_type: 'time',
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `OpenRouteService HTTP ${res.status}`);
  }

  const data = await res.json() as {
    features: Array<{
      type: string;
      geometry: unknown;
      properties: Record<string, unknown> & { value?: number };
    }>;
  };

  const features = [...(data.features ?? [])]
    .sort((a, b) => (a.properties.value ?? 0) - (b.properties.value ?? 0))
    .map((f, i) => ({
      ...f,
      properties: {
        ...f.properties,
        contour: Math.round((f.properties.value ?? 0) / 60),
        _colorIdx: i,
        source: 'openrouteservice',
      },
    }));

  return { type: 'FeatureCollection', features };
}

export async function POST(req: NextRequest) {
  let body: IsoRequest;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  let valhallaErr = 'unknown';
  try {
    return NextResponse.json(await fetchValhalla(body));
  } catch (err) {
    valhallaErr = err instanceof Error ? err.message : String(err);
  }

  try {
    return NextResponse.json(await fetchOrs(body));
  } catch (orsErr) {
    const orsMsg = orsErr instanceof Error ? orsErr.message : String(orsErr);

    if (!ORS_KEY) {
      return NextResponse.json({
        error: 'SERVICE_UNAVAILABLE',
        message:
          'The public Valhalla server (valhalla1.openstreetmap.de) is temporarily offline. ' +
          'Add a free OpenRouteService API key as ORS_API_KEY in Vercel and .env.local to enable backup routing. ' +
          'Sign up at https://openrouteservice.org/dev/#/signup',
      }, { status: 503 });
    }

    return NextResponse.json({
      error: `Routing unavailable. Valhalla: ${valhallaErr}. OpenRouteService: ${orsMsg}`,
    }, { status: 502 });
  }
}
