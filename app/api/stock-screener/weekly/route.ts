import { NextRequest, NextResponse } from 'next/server';
import { getFinnhubApiKey } from '../env';
import { barsForTicker, readWeeklyBulk } from '../weeklyBulk';
import { fetchWeeklyHistory } from '../weeklyPrices';
import { weeklyBarsHaveVolume } from '@/app/web-apps/stock-screener/weeklyVolume';
import { WEEKLY_DOWNLOAD_YEARS } from '../historyConstants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function finnhubSymbol(symbol: string): string {
  return symbol.replace(/\./g, '-');
}

/** Lazy-load weekly closes — bulk cache first, then live Yahoo/Finnhub. */
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

  const bulk = await readWeeklyBulk();
  const results: Record<string, import('@/app/web-apps/stock-screener/types').WeeklyBar[]> = {};

  const missing: string[] = [];
  for (const ticker of tickers) {
    const fromBulk = barsForTicker(bulk, ticker);
    if (fromBulk?.length && weeklyBarsHaveVolume(fromBulk)) {
      results[ticker] = fromBulk;
    } else {
      missing.push(ticker);
    }
  }

  const apiKey = getFinnhubApiKey();
  for (const ticker of missing) {
    if (!apiKey) continue;
    const weeklyHistory = await fetchWeeklyHistory(
      finnhubSymbol(ticker),
      apiKey,
      WEEKLY_DOWNLOAD_YEARS,
    );
    if (weeklyHistory?.length) results[ticker] = weeklyHistory;
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
