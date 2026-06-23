import { NextRequest, NextResponse } from 'next/server';
import { getMarketStocks } from '../fetchMarketData';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Warms the stock screener cache (Redis + memory).
 * Call from Vercel Cron once daily, or manually with ?secret=CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const provided = req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');

  if (secret) {
    const authorized =
      provided === secret ||
      authHeader === `Bearer ${secret}`;
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await getMarketStocks({ force: true });
    return NextResponse.json({
      ok: true,
      source: result.source,
      count: result.stocks.length,
      cachedAt: result.cachedAt,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refresh failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
