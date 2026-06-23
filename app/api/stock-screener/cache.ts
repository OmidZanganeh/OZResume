import Redis from 'ioredis';
import type { Stock } from '@/app/tools/stock-screener/types';

const REDIS_KEY = 'stock-screener:snapshot:v1';

/** How long a snapshot is considered fresh before we try Finnhub again. */
export const FRESH_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours → ~1 Finnhub refresh/day

/** Keep stale JSON in Redis for up to a week if live refresh fails. */
const STALE_RETENTION_SEC = 7 * 24 * 60 * 60;

export interface MarketDataResult {
  stocks: Stock[];
  source: 'finnhub' | 'fmp' | 'mock';
  cachedAt: string;
  warning?: string;
  fromCache?: boolean;
  expiresAt?: string;
}

export interface StoredSnapshot extends MarketDataResult {
  expiresAt: string;
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!redis) {
    redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 });
  }
  return redis;
}

export async function readRedisSnapshot(): Promise<{ data: StoredSnapshot; fresh: boolean } | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const raw = await client.get(REDIS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredSnapshot;
    if (!Array.isArray(data.stocks) || data.stocks.length === 0) return null;
    const fresh = Date.now() < new Date(data.expiresAt).getTime();
    return { data, fresh };
  } catch {
    return null;
  }
}

export async function writeRedisSnapshot(result: MarketDataResult): Promise<void> {
  const client = getRedis();
  if (!client) return;

  const payload: StoredSnapshot = {
    ...result,
    expiresAt: new Date(Date.now() + FRESH_TTL_MS).toISOString(),
    fromCache: true,
  };

  try {
    await client.setex(REDIS_KEY, STALE_RETENTION_SEC, JSON.stringify(payload));
  } catch {
    // Non-fatal — in-memory cache still helps on warm instances
  }
}
