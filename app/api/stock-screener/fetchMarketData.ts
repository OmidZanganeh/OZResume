import { MOCK_STOCKS } from '@/app/web-apps/stock-screener/mockStocks';
import { getFinnhubApiKey } from './env';
import { readRedisSnapshot, type MarketDataResult } from './cache';
import { loadMarketFromStore, runIncrementalBatch } from './incrementalRefresh';

export type { MarketDataResult };

const MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let memoryCache: { result: MarketDataResult; expiresAt: number } | null = null;
let refreshKickStarted = false;

function kickRefreshChain() {
  if (refreshKickStarted || !getFinnhubApiKey()) return;
  refreshKickStarted = true;

  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://omidzanganeh.com';
  const q = new URLSearchParams({ reset: '1', continue: '1' });
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) q.set('secret', secret);

  fetch(`${base}/api/stock-screener/refresh?${q}`, { cache: 'no-store' }).catch(() => {});
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

/** Read cached snapshot only — never calls Finnhub (safe for page loads). */
export async function getMarketStocks(): Promise<MarketDataResult> {
  const mem = fromMemory();
  if (mem) return mem;

  const stored = await loadMarketFromStore();
  if (stored) {
    if (!stored.refreshComplete) kickRefreshChain();
    else remember(stored);
    return stored;
  }

  if (!getFinnhubApiKey()) {
    return {
      stocks: MOCK_STOCKS,
      source: 'mock',
      cachedAt: new Date().toISOString(),
      warning: 'No API key — set FINNHUB_API_KEY or X_Finnhub_Secret.',
    };
  }

  kickRefreshChain();

  return {
    stocks: MOCK_STOCKS,
    source: 'mock',
    cachedAt: new Date().toISOString(),
    warning: 'Building market cache — live data loads in a few minutes. Refresh this page shortly.',
  };
}

/** Run one incremental batch (refresh route / warm script). */
export async function refreshMarketBatch(reset = false): Promise<MarketDataResult> {
  const key = getFinnhubApiKey();
  if (!key) throw new Error('No Finnhub API key');

  await runIncrementalBatch(reset);
  const stored = await loadMarketFromStore();
  if (!stored) throw new Error('Refresh produced no snapshot');

  remember(stored);
  return stored;
}

export async function getStaleForInvalidKey(): Promise<MarketDataResult | null> {
  const stale = await readRedisSnapshot();
  if (!stale) return null;
  const { expiresAt, refreshComplete, totalSymbols, ...rest } = stale.data;
  return {
    ...rest,
    fromCache: true,
    expiresAt,
    refreshComplete,
    totalSymbols,
    warning: 'Invalid Finnhub API key — serving cached snapshot.',
  };
}
