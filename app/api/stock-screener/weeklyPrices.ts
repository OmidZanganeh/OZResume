import type { WeeklyBar } from '@/app/web-apps/stock-screener/types';
import { round, sleep } from './utils';

const FINNHUB = 'https://finnhub.io/api/v1';
const WEEKS_TO_STORE = 54;

interface CandlePayload {
  s?: string;
  c?: number[];
  t?: number[];
  error?: string;
}

function newestFirstBars(timestamps: number[], closes: number[]): WeeklyBar[] {
  const pairs = timestamps
    .map((t, i) => ({ t, c: closes[i] }))
    .filter((p): p is WeeklyBar => p.c != null && Number.isFinite(p.c) && p.c > 0);
  pairs.sort((a, b) => b.t - a.t);
  return pairs.slice(0, WEEKS_TO_STORE).map(p => ({ t: p.t, c: round(p.c, 2) }));
}

async function fetchFinnhubWeeklyBars(
  symbol: string,
  apiKey: string,
): Promise<WeeklyBar[] | null> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 400 * 86400;
  const url =
    `${FINNHUB}/stock/candle?symbol=${encodeURIComponent(symbol)}` +
    `&resolution=W&from=${from}&to=${to}&token=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as CandlePayload;
    if (data.error || data.s !== 'ok' || !data.c?.length || !data.t?.length) return null;
    const bars = newestFirstBars(data.t, data.c);
    return bars.length >= 4 ? bars : null;
  } catch {
    return null;
  }
}

function yahooSymbol(symbol: string): string {
  return symbol.replace(/-/g, '.');
}

async function fetchYahooWeeklyBars(symbol: string): Promise<WeeklyBar[] | null> {
  const yahooSym = yahooSymbol(symbol);
  const to = Math.floor(Date.now() / 1000);
  const from = to - 400 * 86400;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}` +
    `?period1=${from}&period2=${to}&interval=1wk`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockScreener/1.0)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp ?? [];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
    if (timestamps.length === 0) return null;
    const bars = newestFirstBars(timestamps, closes as number[]);
    return bars.length >= 4 ? bars : null;
  } catch {
    return null;
  }
}

/** Real weekly bars — newest first. Finnhub if available, else Yahoo. */
export async function fetchWeeklyHistory(
  symbol: string,
  finnhubApiKey: string,
): Promise<WeeklyBar[] | null> {
  const finnhub = await fetchFinnhubWeeklyBars(symbol, finnhubApiKey);
  if (finnhub) return finnhub;

  await sleep(120);
  return fetchYahooWeeklyBars(symbol);
}
