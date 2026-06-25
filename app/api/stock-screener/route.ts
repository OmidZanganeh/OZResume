import { NextRequest, NextResponse } from 'next/server';
import { parseUniverseId } from '@/app/web-apps/stock-screener/universe';
import { getMarketStocks } from './fetchMarketData';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Cached market snapshot for the stock screener (Finnhub preferred, FMP fallback). */
export async function GET(req: NextRequest) {
  const universeId = parseUniverseId(req.nextUrl.searchParams.get('universe'));

  try {
    const result = await getMarketStocks(universeId);
    const cacheControl =
      result.refreshComplete === false
        ? 'no-store'
        : 'public, s-maxage=604800, stale-while-revalidate=86400';
    return NextResponse.json(result, {
      headers: { 'Cache-Control': cacheControl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load market data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
