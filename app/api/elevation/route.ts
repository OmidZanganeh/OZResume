/**
 * USGS 3DEP Elevation Point Query Service proxy with SSE streaming.
 * Mirrors profile_automation.py exactly:
 *   - Retries each point up to MAX_RETRIES times with exponential backoff
 *   - Genuine no-data (-1000000) is NOT retried — those points are simply skipped
 *   - NEVER interpolates
 */
import { NextRequest } from 'next/server';

const USGS_URL    = 'https://epqs.nationalmap.gov/v1/json';
const BATCH       = 5;    // concurrent requests per batch
const DELAY_MS    = 150;  // pause between batches (USGS recommendation)
const MAX_RETRIES = 3;    // retry transient errors (rate-limit, timeout, bad response)

interface Pt { lat: number; lon: number; }
interface Result {
  lat: number; lon: number;
  elevFt: number | null; elevM: number | null;
  noData: boolean;   // true = genuine USGS no-coverage (don't retry)
  failed: boolean;   // true = transient error exhausted all retries
}

interface QueryResult {
  elevFt: number | null;
  resM:   number | null;
  genuine: boolean; // true = we got a definitive answer (real value or -1000000 no-data)
}

async function queryOne(lat: number, lon: number): Promise<QueryResult> {
  try {
    const res = await fetch(`${USGS_URL}?x=${lon}&y=${lat}&units=Feet`, {
      signal: AbortSignal.timeout(12_000),
    });
    // Non-200 is a transient server error — caller should retry
    if (!res.ok) return { elevFt: null, resM: null, genuine: false };

    const data = await res.json() as { value?: unknown; resolution?: unknown };
    const val  = parseFloat(String(data.value ?? ''));
    const resM = data.resolution != null ? parseFloat(String(data.resolution)) : null;

    // Unparseable response — retry
    if (isNaN(val)) return { elevFt: null, resM: null, genuine: false };

    // USGS genuine no-data sentinel (water, outside coverage) — don't retry
    if (val < -999_000) return { elevFt: null, resM: null, genuine: true };

    return { elevFt: val, resM, genuine: true };
  } catch {
    // Network / timeout — transient, caller should retry
    return { elevFt: null, resM: null, genuine: false };
  }
}

async function queryWithRetry(lat: number, lon: number): Promise<QueryResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 0.5 s, 1 s, 2 s  (mirrors Python app)
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    }
    const result = await queryOne(lat, lon);
    // Stop if we have a definitive answer (real value OR genuine no-data)
    if (result.genuine) return result;
  }
  // All retries exhausted on a transient error
  return { elevFt: null, resM: null, genuine: false };
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
          const raw   = await Promise.all(batch.map(p => queryWithRetry(p.lat, p.lon)));

          for (let j = 0; j < raw.length; j++) {
            const r  = raw[j];
            const pt = batch[j];
            if (firstResM === null && r.resM !== null) firstResM = r.resM;
            results.push({
              lat:    pt.lat,
              lon:    pt.lon,
              elevFt: r.elevFt,
              elevM:  r.elevFt !== null ? r.elevFt * 0.3048 : null,
              noData: r.genuine && r.elevFt === null,   // genuine no-coverage
              failed: !r.genuine && r.elevFt === null,  // transient error exhausted
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
