import { MOCK_STOCKS } from '@/app/tools/stock-screener/mockStocks';
import { getFinnhubApiKey } from './env';
import { readRedisSnapshot, type MarketDataResult } from './cache';
import { loadMarketFromStore, runIncrementalBatch } from './incrementalRefresh';

export type { MarketDataResult };

const MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let memoryCache: { result: MarketDataResult; expiresAt: number } | null = null;

function remember(result: MarketDataResult) {
  memoryCache = {
    result: { ...result, fromCache: true },
    expiresAt: Date.now() + MEMORY_TTL_MS,
  };
}

function fromMemory(): MarketDataResult | null {
  if (!memoryCache || memoryCache.expiresAt <= Date.now()) return null;
  return memoryCache.result;
}

/** Read cached snapshot only — never calls Finnhub (safe for page loads). */
export async function getMarketStocks(): Promise<MarketDataResult> {
  const mem = fromMemory();
  if (mem) return mem;

  const stored = await loadMarketFromStore();
  if (stored) {
    remember(stored);
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

  return {
    stocks: MOCK_STOCKS,
    source: 'mock',
    cachedAt: new Date().toISOString(),
    warning: 'Market cache empty — run npm run warm:stocks or wait for weekly refresh cron.',
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
