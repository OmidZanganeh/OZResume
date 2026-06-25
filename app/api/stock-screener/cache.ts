import type { Stock } from '@/app/web-apps/stock-screener/types';
import { getRedis } from './redis';
import { CURSOR_REDIS_KEY, SNAPSHOT_REDIS_KEY } from './symbols';

/** Pre-v2 snapshot — read if v2 missing so deploys don't cold-start empty. */
const LEGACY_SNAPSHOT_REDIS_KEY = 'stock-screener:snapshot:sp500';

/** How long a completed snapshot stays fresh before a new full refresh cycle. */
export const FRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const STALE_RETENTION_SEC = 30 * 24 * 60 * 60;

export interface MarketDataResult {
  stocks: Stock[];
  source: 'finnhub' | 'fmp' | 'mock';
  cachedAt: string;
  warning?: string;
  fromCache?: boolean;
  expiresAt?: string;
  totalSymbols?: number;
  refreshComplete?: boolean;
}

export interface StoredSnapshot extends MarketDataResult {
  expiresAt: string;
  refreshComplete: boolean;
  totalSymbols: number;
}

export async function readRedisSnapshot(): Promise<{ data: StoredSnapshot; fresh: boolean } | null> {
  const client = getRedis();
  if (!client) return null;

  for (const key of [SNAPSHOT_REDIS_KEY, 'stock-screener:snapshot:sp500:v2', LEGACY_SNAPSHOT_REDIS_KEY]) {
    try {
      const raw = await client.get(key);
      if (!raw) continue;
      const data = JSON.parse(raw) as StoredSnapshot;
      if (!Array.isArray(data.stocks) || data.stocks.length === 0) continue;
      const fresh = Boolean(data.refreshComplete) && Date.now() < new Date(data.expiresAt).getTime();
      return { data, fresh };
    } catch {
      continue;
    }
  }
  return null;
}

export async function readRedisCursor(): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  try {
    const v = await client.get(CURSOR_REDIS_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export async function writeRedisCursor(cursor: number): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(CURSOR_REDIS_KEY, String(cursor));
  } catch {
    // non-fatal
  }
}

export async function writeRedisSnapshot(result: MarketDataResult & {
  refreshComplete: boolean;
  totalSymbols: number;
}): Promise<void> {
  const client = getRedis();
  if (!client) return;

  const payload: StoredSnapshot = {
    ...result,
    expiresAt: result.expiresAt ?? new Date(Date.now() + FRESH_TTL_MS).toISOString(),
    fromCache: true,
    refreshComplete: result.refreshComplete,
    totalSymbols: result.totalSymbols,
  };

  try {
    await client.setex(SNAPSHOT_REDIS_KEY, STALE_RETENTION_SEC, JSON.stringify(payload));
  } catch {
    // non-fatal
  }
}

export function mergeStocks(existing: Stock[], incoming: Stock[]): Stock[] {
  const map = new Map<string, Stock>();
  for (const s of existing) map.set(s.ticker, s);
  for (const s of incoming) map.set(s.ticker, s);
  return [...map.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
}
