import { NextRequest, NextResponse } from 'next/server';
import { parseUniverseId } from '@/app/web-apps/stock-screener/universe';
import { runWeeklyBulkBatch, runWeeklyVolumeRepairBatch } from '../../weeklyBulk';

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

  const universeId = parseUniverseId(req.nextUrl.searchParams.get('universe'));
  const reset = req.nextUrl.searchParams.get('reset') === '1';
  const repairVolume = req.nextUrl.searchParams.get('repairVolume') === '1';
  const shouldContinue = req.nextUrl.searchParams.get('continue') === '1';

  try {
    const batch = repairVolume
      ? await runWeeklyVolumeRepairBatch(universeId)
      : await runWeeklyBulkBatch(reset, universeId);

    if (!batch.complete && shouldContinue) {
      const url = new URL(req.url);
      url.searchParams.set('continue', '1');
      url.searchParams.delete('reset');
      if (repairVolume) url.searchParams.set('repairVolume', '1');
      const secret = process.env.CRON_SECRET?.trim();
      const headers: Record<string, string> = {};
      const authHeader = req.headers.get('authorization');
      if (authHeader) headers.authorization = authHeader;
      else if (secret) url.searchParams.set('secret', secret);
      fetch(url.toString(), { headers, cache: 'no-store' }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      universe: universeId,
      complete: batch.complete,
      loaded: batch.fetched,
      total: batch.total,
      batchAdded: batch.batchAdded,
      cursor: batch.cursor,
      next: batch.complete
        ? null
        : `${req.nextUrl.pathname}?continue=1&universe=${universeId}${repairVolume ? '&repairVolume=1' : ''}${req.nextUrl.searchParams.get('secret') ? `&secret=${req.nextUrl.searchParams.get('secret')}` : ''}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Weekly bulk refresh failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
