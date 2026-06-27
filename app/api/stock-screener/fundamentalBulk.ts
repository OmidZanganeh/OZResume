import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import type { Stock } from '@/app/web-apps/stock-screener/types';
import type {
  FundamentalBulkStore,
  FundamentalPeriod,
} from '@/app/web-apps/stock-screener/fundamentalTypes';
import type { UniverseId } from '@/app/web-apps/stock-screener/universe';
import { universeMeta } from '@/app/web-apps/stock-screener/universe';
import { getRedis } from './redis';
import { getSymbolUniverse } from './symbols';
import { sleep } from './weeklyPrices';

const FUNDAMENTAL_BULK_TTL_SEC = 21 * 24 * 60 * 60;

function localBulkPath(universeId: UniverseId): string {
  return resolve(process.cwd(), 'data', universeMeta(universeId).localFundamentalFile);
}

function parseBulk(raw: string | Buffer): FundamentalBulkStore | null {
  try {
    let text: string;
    if (Buffer.isBuffer(raw)) {
      text = raw[0] === 0x7b ? raw.toString('utf8') : gunzipSync(raw).toString('utf8');
    } else if (raw.startsWith('{')) {
      text = raw;
    } else {
      text = gunzipSync(Buffer.from(raw, 'base64')).toString('utf8');
    }
    const parsed = JSON.parse(text) as FundamentalBulkStore;
    if (!parsed?.data || typeof parsed.data !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readFundamentalBulk(
  universeId: UniverseId = 'sp500',
): Promise<FundamentalBulkStore | null> {
  const client = getRedis();
  const key = universeMeta(universeId).fundamentalBulkKey;

  if (client) {
    try {
      const raw = await client.getBuffer(key);
      if (raw?.length) {
        const parsed = parseBulk(raw);
        if (parsed) return parsed;
      }
    } catch {
      // fall through
    }
  }

  const path = localBulkPath(universeId);
  if (existsSync(path)) {
    try {
      return parseBulk(readFileSync(path, 'utf8'));
    } catch {
      return null;
    }
  }

  return null;
}

export async function writeFundamentalBulk(
  store: FundamentalBulkStore,
  universeId: UniverseId = 'sp500',
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  const compressed = gzipSync(JSON.stringify(store));
  await client.setex(
    universeMeta(universeId).fundamentalBulkKey,
    FUNDAMENTAL_BULK_TTL_SEC,
    compressed,
  );
}

export function periodsForTicker(
  store: FundamentalBulkStore | null,
  ticker: string,
): FundamentalPeriod[] | null {
  const rows = store?.data[ticker];
  return rows?.length ? rows : null;
}

export function mergeBulkFundamentalsIntoStocks(
  stocks: Stock[],
  bulk: FundamentalBulkStore | null,
): Stock[] {
  if (!bulk?.data || Object.keys(bulk.data).length === 0) return stocks;
  return stocks.map(stock => {
    const periods = periodsForTicker(bulk, stock.ticker);
    if (!periods?.length) return stock;
    return { ...stock, fundamentalHistory: periods };
  });
}

export function fundamentalBulkCoverage(store: FundamentalBulkStore | null): number {
  if (!store?.data) return 0;
  return Object.keys(store.data).length;
}

/** Import JSON written by scripts/bulk-fundamental-history.py into Redis. */
export async function importFundamentalBulkFromFile(
  universeId: UniverseId = 'sp500',
): Promise<FundamentalBulkStore | null> {
  const path = localBulkPath(universeId);
  if (!existsSync(path)) return null;
  const store = parseBulk(readFileSync(path, 'utf8'));
  if (store) await writeFundamentalBulk(store, universeId);
  return store;
}

export async function fillFundamentalBulkGaps(universeId: UniverseId = 'sp500'): Promise<{
  missingBefore: number;
  added: string[];
  store: FundamentalBulkStore;
}> {
  const { spawnFundamentalFetch } = await import('./fundamentalFetch');
  const universe = await getSymbolUniverse(universeId);
  const existing = await readFundamentalBulk(universeId);
  const data: Record<string, FundamentalPeriod[]> = { ...(existing?.data ?? {}) };

  const missing = universe
    .map(s => s.symbol)
    .filter(sym => !data[sym]?.length)
    .sort();

  const added: string[] = [];
  for (const symbol of missing) {
    const periods = await spawnFundamentalFetch(symbol);
    if (periods?.length) {
      data[symbol] = periods;
      added.push(symbol);
    }
    await sleep(350);
  }

  const store: FundamentalBulkStore = {
    cachedAt: new Date().toISOString(),
    complete: added.length === missing.length,
    data,
  };
  await writeFundamentalBulk(store, universeId);
  return { missingBefore: missing.length, added, store };
}
