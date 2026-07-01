import { NextRequest, NextResponse } from 'next/server';
import { parseUniverseId } from '@/app/web-apps/stock-screener/universe';
import { runIncrementalBatch } from '../incrementalRefresh';
import { runVolumeRepairBatch } from '../volumeRepair';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const provided = req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  return provided === secret || authHeader === `Bearer ${secret}`;
}

/**
 * Incremental cache warm — one batch per call (~150 symbols).
 * Chain with ?continue=1 or cron; S&P 500 (~503) finishes in ~4 batches.
 */
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
      ? await runVolumeRepairBatch(universeId)
      : await runIncrementalBatch(reset, universeId);

    if (!batch.complete && shouldContinue) {
      const url = new URL(req.url);
      url.searchParams.set('continue', '1');
      url.searchParams.delete('reset');
      if (repairVolume) url.searchParams.set('repairVolume', '1');
      fetch(url.toString(), {
        headers: req.headers.get('authorization')
          ? { authorization: req.headers.get('authorization')! }
          : undefined,
      }).catch(() => {});
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
    const message = err instanceof Error ? err.message : 'Refresh failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
