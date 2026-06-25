import type { WeeklyBar } from '@/app/web-apps/stock-screener/types';
import { WEEKS_TO_STORE } from './historyConstants';
import { round, sleep } from './utils';

export { WEEKS_TO_STORE };
export { sleep };

const FINNHUB = 'https://finnhub.io/api/v1';

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
  yearsBack: number,
): Promise<WeeklyBar[] | null> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - Math.ceil(yearsBack * 365.25 * 86400);
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

function yahooSymbolCandidates(symbol: string): string[] {
  const dotted = symbol.replace(/-/g, '.');
  return symbol === dotted ? [symbol] : [symbol, dotted];
}

async function fetchYahooWeeklyChart(
  yahooSym: string,
  yearsBack: number,
): Promise<WeeklyBar[] | null> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - Math.ceil(yearsBack * 365.25 * 86400);
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

/** Yahoo weekly chart — primary source for bulk 10y+ history. */
export async function fetchYahooWeeklyBars(
  symbol: string,
  yearsBack: number,
): Promise<WeeklyBar[] | null> {
  for (const yahooSym of yahooSymbolCandidates(symbol)) {
    const bars = await fetchYahooWeeklyChart(yahooSym, yearsBack);
    if (bars?.length) return bars;
  }
  return null;
}

/** Single-symbol weekly bars (on-demand). Yahoo first for depth, Finnhub fallback. */
export async function fetchWeeklyHistory(
  symbol: string,
  finnhubApiKey: string,
  yearsBack = 12,
): Promise<WeeklyBar[] | null> {
  const yahoo = await fetchYahooWeeklyBars(symbol, yearsBack);
  if (yahoo) return yahoo;

  await sleep(120);
  return fetchFinnhubWeeklyBars(symbol, finnhubApiKey, yearsBack);
}
