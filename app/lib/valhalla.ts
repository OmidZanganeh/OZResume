/** Public FOSSGIS Valhalla demo — browser calls use the visitor's IP (not Vercel's). */
export const VALHALLA_ISOCHRONE_URL = 'https://valhalla1.openstreetmap.de/isochrone';

function friendlyValhallaError(err: unknown): Error {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('abort') || msg.includes('timeout')) {
      return new Error('Valhalla took too long — try fewer time rings or a smaller area.');
    }
    if (msg.includes('failed to fetch') || msg.includes('network')) {
      return new Error('Could not reach Valhalla routing service. Check your connection and try again.');
    }
    return err;
  }
  return new Error('Failed to generate isochrone');
}

export interface ValhallaIsochroneRequest {
  locations: { lat: number; lon: number }[];
  costing: string;
  contours: { time: number }[];
  polygons: boolean;
}

export interface ValhallaIsochroneResponse {
  type?: string;
  features: Record<string, unknown>[];
  error?: string;
}

/** Call Valhalla from the browser first; fall back to our server proxy. */
export async function fetchIsochrone(
  body: ValhallaIsochroneRequest,
): Promise<ValhallaIsochroneResponse> {
  // 1) Browser → Valhalla (same path the official valhalla.openstreetmap.de app uses)
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 90_000);
    const res  = await fetch(VALHALLA_ISOCHRONE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    const text = await res.text();
    let data: ValhallaIsochroneResponse;
    try { data = JSON.parse(text); }
    catch { throw new Error(`Valhalla returned an invalid response (HTTP ${res.status}).`); }
    if (!res.ok || data.error) throw new Error(data.error ?? `Valhalla HTTP ${res.status}`);
    if (!Array.isArray(data.features) || data.features.length === 0) {
      throw new Error('No coverage returned for this location.');
    }
    return data;
  } catch (directErr) {
    // 2) Server proxy fallback (local dev / if CORS ever blocks direct calls)
    try {
      const res  = await fetch('/api/isochrone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data: ValhallaIsochroneResponse;
      try { data = JSON.parse(text); }
      catch { throw directErr; }
      if (!res.ok || data.error) throw new Error(data.error ?? `Server error ${res.status}`);
      if (!Array.isArray(data.features) || data.features.length === 0) {
        throw new Error('No coverage returned for this location.');
      }
      return data;
    } catch {
      throw friendlyValhallaError(directErr);
    }
  }
}
