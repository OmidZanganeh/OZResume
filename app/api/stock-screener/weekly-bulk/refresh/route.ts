import { NextRequest, NextResponse } from 'next/server';
import { runWeeklyBulkBatch } from '../../weeklyBulk';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const provided = req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  return provided === secret || authHeader === `Bearer ${secret}`;
}

/** Incremental Yahoo weekly bulk download (~35 symbols per call). */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reset = req.nextUrl.searchParams.get('reset') === '1';
  const shouldContinue = req.nextUrl.searchParams.get('continue') === '1';

  try {
    const batch = await runWeeklyBulkBatch(reset);

    if (!batch.complete && shouldContinue) {
      const url = new URL(req.url);
      url.searchParams.set('continue', '1');
      url.searchParams.delete('reset');
      fetch(url.toString(), {
        headers: req.headers.get('authorization')
          ? { authorization: req.headers.get('authorization')! }
          : undefined,
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      complete: batch.complete,
      loaded: batch.fetched,
      total: batch.total,
      batchAdded: batch.batchAdded,
      cursor: batch.cursor,
      next: batch.complete
        ? null
        : `${req.nextUrl.pathname}?continue=1${req.nextUrl.searchParams.get('secret') ? `&secret=${req.nextUrl.searchParams.get('secret')}` : ''}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Weekly bulk refresh failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
