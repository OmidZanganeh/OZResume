import { NextResponse } from 'next/server';
import { getMarketStocks } from './fetchMarketData';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Cached market snapshot for the stock screener (Finnhub preferred, FMP fallback). */
export async function GET() {
  try {
    const result = await getMarketStocks();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load market data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
