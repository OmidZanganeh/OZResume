/**
 * USGS 3DEP Elevation Point Query Service proxy with SSE streaming.
 * Mirrors profile_automation.py: sequential batches with delay to avoid
 * rate-limiting, streams progress events back to the client.
 */
import { NextRequest } from 'next/server';

const USGS_URL  = 'https://epqs.nationalmap.gov/v1/json';
const BATCH     = 5;    // concurrent requests per batch
const DELAY_MS  = 150;  // pause between batches (USGS recommendation)

interface Pt { lat: number; lon: number; }
interface Result {
  lat: number; lon: number;
  elevFt: number | null; elevM: number | null;
  noData: boolean;
}

async function queryOne(lat: number, lon: number): Promise<{ elevFt: number | null; resM: number | null }> {
  try {
    const res = await fetch(`${USGS_URL}?x=${lon}&y=${lat}&units=Feet`, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return { elevFt: null, resM: null };
    const data = await res.json() as { value?: unknown; resolution?: unknown };
    const val  = parseFloat(String(data.value ?? ''));
    const resM = data.resolution != null ? parseFloat(String(data.resolution)) : null;
    if (isNaN(val) || val < -999_000) return { elevFt: null, resM: null };
    return { elevFt: val, resM };
  } catch {
    return { elevFt: null, resM: null };
  }
}

export async function POST(req: NextRequest) {
  let points: Pt[];
  try {
    ({ points } = await req.json() as { points: Pt[] });
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  if (!Array.isArray(points) || points.length === 0)
    return new Response('No points', { status: 400 });

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) =>
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`));

      try {
        const results: Result[] = [];
        let firstResM: number | null = null;

        for (let i = 0; i < points.length; i += BATCH) {
          if (i > 0) await new Promise(r => setTimeout(r, DELAY_MS));

          const batch = points.slice(i, i + BATCH);
          const raw   = await Promise.all(batch.map(p => queryOne(p.lat, p.lon)));

          for (let j = 0; j < raw.length; j++) {
            const r  = raw[j];
            const pt = batch[j];
            if (firstResM === null && r.resM !== null) firstResM = r.resM;
            results.push({
              lat: pt.lat, lon: pt.lon,
              elevFt: r.elevFt,
              elevM:  r.elevFt !== null ? r.elevFt * 0.3048 : null,
              noData: r.elevFt === null,
            });
          }

          send({ type: 'progress', current: results.length, total: points.length });
        }

        send({ type: 'done', results, resolutionM: firstResM });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
