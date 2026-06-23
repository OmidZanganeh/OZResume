import type { Stock } from '@/app/tools/stock-screener/types';
import { getFinnhubApiKey } from './env';
import { getSymbolUniverse, inferSector, type UsSymbol } from './symbols';
import { fetchStocksBatch } from './finnhub';
import {
  FRESH_TTL_MS,
  mergeStocks,
  readRedisCursor,
  readRedisSnapshot,
  writeRedisCursor,
  writeRedisSnapshot,
  type MarketDataResult,
} from './cache';

/** Fits in ~4 min Vercel limit with 1.1s/call metric-only mode. */
export const BATCH_SIZE = 150;

export interface BatchResult {
  complete: boolean;
  fetched: number;
  total: number;
  batchAdded: number;
  cursor: number;
}

export async function runIncrementalBatch(reset = false): Promise<BatchResult> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey) throw new Error('No Finnhub API key');

  const universe = await getSymbolUniverse();
  const total = universe.length;

  const existingSnap = await readRedisSnapshot();
  const snapFresh = existingSnap?.fresh ?? false;
  const snapComplete = existingSnap?.data.refreshComplete ?? false;

  if (!reset && snapComplete && snapFresh) {
    return {
      complete: true,
      fetched: existingSnap!.data.stocks.length,
      total,
      batchAdded: 0,
      cursor: 0,
    };
  }

  if (!reset && snapComplete && !snapFresh) {
    reset = true;
  }

  let cursor = reset ? 0 : await readRedisCursor();
  if (reset) await writeRedisCursor(0);

  let existingStocks = reset ? [] : (existingSnap?.data.stocks ?? []);

  const batch = universe.slice(cursor, cursor + BATCH_SIZE);
  if (batch.length === 0) {
    return {
      complete: true,
      fetched: existingStocks.length,
      total,
      batchAdded: 0,
      cursor: 0,
    };
  }

  const entries: UsSymbol[] = batch.map(s => ({
    ...s,
    sector: s.sector,
  }));

  const fetched = await fetchStocksBatch(entries, apiKey);
  const merged = mergeStocks(existingStocks, fetched);

  const nextCursor = cursor + batch.length;
  const complete = nextCursor >= total;

  await writeRedisCursor(complete ? 0 : nextCursor);

  const now = new Date().toISOString();
  const result: MarketDataResult & { refreshComplete: boolean; totalSymbols: number } = {
    stocks: merged,
    source: 'finnhub',
    cachedAt: now,
    fromCache: false,
    refreshComplete: complete,
    totalSymbols: total,
    expiresAt: complete ? new Date(Date.now() + FRESH_TTL_MS).toISOString() : existingSnap?.data.expiresAt ?? now,
    warning: complete
      ? undefined
      : `Building universe: ${merged.length}/${total} loaded (batch ${Math.ceil(nextCursor / BATCH_SIZE)}/${Math.ceil(total / BATCH_SIZE)})`,
  };

  await writeRedisSnapshot(result);

  return {
    complete,
    fetched: merged.length,
    total,
    batchAdded: fetched.length,
    cursor: nextCursor,
  };
}

export async function loadMarketFromStore(): Promise<MarketDataResult | null> {
  const hit = await readRedisSnapshot();
  if (!hit) return null;

  const { expiresAt, refreshComplete, totalSymbols, ...rest } = hit.data;
  const fresh = refreshComplete && Date.now() < new Date(expiresAt).getTime();

  return {
    ...rest,
    fromCache: true,
    expiresAt,
    refreshComplete,
    totalSymbols,
    warning: !refreshComplete
      ? `Partial universe: ${rest.stocks.length}/${totalSymbols} symbols loaded — refresh in progress.`
      : fresh
        ? undefined
        : `Weekly snapshot expired — showing ${rest.stocks.length} cached symbols until refresh completes.`,
  };
}

/** Re-apply sector labels from metric industry when batch completes (optional polish). */
export function refineSector(stock: Stock, metric?: Record<string, number>): Stock {
  return { ...stock, sector: inferSector(stock.companyName, metric) };
}
