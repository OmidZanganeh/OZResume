import { MOCK_STOCKS } from '@/app/web-apps/stock-screener/mockStocks';
import { getFinnhubApiKey } from './env';
import { readRedisSnapshot, type MarketDataResult } from './cache';
import { loadMarketFromStore, runIncrementalBatch } from './incrementalRefresh';
import { HISTORY_YEARS } from './historyConstants';
import {
  mergeBulkWeeklyIntoStocks,
  readWeeklyBulk,
  weeklyBulkCoverage,
} from './weeklyBulk';

export type { MarketDataResult };

const MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let memoryCache: { result: MarketDataResult; expiresAt: number } | null = null;
let refreshKickStarted = false;
let weeklyBulkKickStarted = false;

function apiBase(): string {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://omidzanganeh.com';
}

function kickRefreshChain() {
  if (refreshKickStarted || !getFinnhubApiKey()) return;
  refreshKickStarted = true;

  const q = new URLSearchParams({ reset: '1', continue: '1' });
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) q.set('secret', secret);

  fetch(`${apiBase()}/api/stock-screener/refresh?${q}`, { cache: 'no-store' }).catch(() => {});
}

function kickWeeklyBulkChain() {
  if (weeklyBulkKickStarted) return;
  weeklyBulkKickStarted = true;

  const q = new URLSearchParams({ reset: '1', continue: '1' });
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) q.set('secret', secret);

  fetch(`${apiBase()}/api/stock-screener/weekly-bulk/refresh?${q}`, {
    cache: 'no-store',
  }).catch(() => {});
}

function remember(result: MarketDataResult) {
  if (result.refreshComplete === false) return;
  memoryCache = {
    result: { ...result, fromCache: true },
    expiresAt: Date.now() + MEMORY_TTL_MS,
  };
}

function fromMemory(): MarketDataResult | null {
  if (!memoryCache || memoryCache.expiresAt <= Date.now()) return null;
  if (memoryCache.result.refreshComplete === false) return null;
  return memoryCache.result;
}

async function withWeeklyBulk(result: MarketDataResult): Promise<MarketDataResult> {
  const bulk = await readWeeklyBulk();
  const stocks = mergeBulkWeeklyIntoStocks(result.stocks, bulk);

  let warning = result.warning;
  if (!bulk?.complete) {
    kickWeeklyBulkChain();
    const cov = weeklyBulkCoverage(bulk);
    const bulkNote =
      cov > 0
        ? `Weekly history loading: ${cov} symbols (${HISTORY_YEARS}y)…`
        : `Building ${HISTORY_YEARS}-year weekly price history…`;
    warning = warning ? `${warning} ${bulkNote}` : bulkNote;
  }

  return { ...result, stocks, warning };
}

/** Read cached snapshot only — never calls Finnhub (safe for page loads). */
export async function getMarketStocks(): Promise<MarketDataResult> {
  const mem = fromMemory();
  if (mem) return withWeeklyBulk(mem);

  const stored = await loadMarketFromStore();
  if (stored) {
    if (!stored.refreshComplete) kickRefreshChain();
    const merged = await withWeeklyBulk(stored);
    if (stored.refreshComplete) remember(merged);
    return merged;
  }

  if (!getFinnhubApiKey()) {
    return withWeeklyBulk({
      stocks: MOCK_STOCKS,
      source: 'mock',
      cachedAt: new Date().toISOString(),
      warning: 'No API key — set FINNHUB_API_KEY or X_Finnhub_Secret.',
    });
  }

  kickRefreshChain();
  kickWeeklyBulkChain();

  return withWeeklyBulk({
    stocks: MOCK_STOCKS,
    source: 'mock',
    cachedAt: new Date().toISOString(),
    warning: 'Building market cache — live data loads in a few minutes. Refresh this page shortly.',
  });
}

/** Run one incremental batch (refresh route / warm script). */
export async function refreshMarketBatch(reset = false): Promise<MarketDataResult> {
  const key = getFinnhubApiKey();
  if (!key) throw new Error('No Finnhub API key');

  await runIncrementalBatch(reset);
  const stored = await loadMarketFromStore();
  if (!stored) throw new Error('Refresh produced no snapshot');

  const merged = await withWeeklyBulk(stored);
  remember(merged);
  return merged;
}

export async function getStaleForInvalidKey(): Promise<MarketDataResult | null> {
  const stale = await readRedisSnapshot();
  if (!stale) return null;
  const { expiresAt, refreshComplete, totalSymbols, ...rest } = stale.data;
  return withWeeklyBulk({
    ...rest,
    fromCache: true,
    expiresAt,
    refreshComplete,
    totalSymbols,
    warning: 'Invalid Finnhub API key — serving cached snapshot.',
  });
}
