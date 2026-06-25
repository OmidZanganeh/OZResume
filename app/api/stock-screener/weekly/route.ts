import { NextRequest, NextResponse } from 'next/server';
import type { WeeklyBar } from '@/app/web-apps/stock-screener/types';
import { getFinnhubApiKey } from '../env';
import { fetchWeeklyHistory } from '../weeklyPrices';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function finnhubSymbol(symbol: string): string {
  return symbol.replace(/\./g, '-');
}

/** Lazy-load weekly closes for pattern matching (one or more tickers). */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim().toUpperCase();
  const symbolsParam = req.nextUrl.searchParams.get('symbols')?.trim();

  const tickers = symbol
    ? [symbol]
    : symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 25)
      : [];

  if (tickers.length === 0) {
    return NextResponse.json({ error: 'Provide symbol= or symbols=' }, { status: 400 });
  }

  const apiKey = getFinnhubApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'No Finnhub API key' }, { status: 503 });
  }

  const results: Record<string, WeeklyBar[]> = {};

  for (const ticker of tickers) {
    const sym = finnhubSymbol(ticker);
    const weeklyHistory = await fetchWeeklyHistory(sym, apiKey);
    if (weeklyHistory?.length) {
      results[ticker] = weeklyHistory;
    }
  }

  if (tickers.length === 1) {
    const only = tickers[0]!;
    const weeklyHistory = results[only];
    if (!weeklyHistory?.length) {
      return NextResponse.json(
        { error: `No weekly history for ${only}` },
        { status: 404 },
      );
    }
    return NextResponse.json({ symbol: only, weeklyHistory });
  }

  return NextResponse.json({ results });
}
