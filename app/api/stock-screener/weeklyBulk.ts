import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import type { Stock, WeeklyBar } from '@/app/web-apps/stock-screener/types';
import {
  parseUniverseId,
  universeMeta,
  type UniverseId,
} from '@/app/web-apps/stock-screener/universe';
import { getRedis } from './redis';
import { getSymbolUniverse } from './symbols';
import { fetchYahooWeeklyBars, sleep } from './weeklyPrices';
import { HISTORY_YEARS, WEEKLY_DOWNLOAD_YEARS, WEEKS_TO_STORE } from './historyConstants';

export { HISTORY_YEARS, WEEKLY_DOWNLOAD_YEARS, WEEKS_TO_STORE };

/** @deprecated use universeMeta('sp500').weeklyBulkKey */
export const WEEKLY_BULK_REDIS_KEY = universeMeta('sp500').weeklyBulkKey;
/** @deprecated use universeMeta('sp500').weeklyBulkCursorKey */
export const WEEKLY_BULK_CURSOR_KEY = universeMeta('sp500').weeklyBulkCursorKey;

export const WEEKLY_BULK_BATCH_SIZE = 35;

export interface WeeklyBulkStore {
  cachedAt: string;
  downloadYears: number;
  complete: boolean;
  /** Compact [unixSec, close] pairs, newest first. */
  data: Record<string, [number, number][]>;
}

function localBulkPath(universeId: UniverseId): string {
  return resolve(process.cwd(), 'data', universeMeta(universeId).localBulkFile);
}

function expandBars(compact: [number, number][]): WeeklyBar[] {
  return compact.map(([t, c]) => ({ t, c }));
}

function compactBars(bars: WeeklyBar[]): [number, number][] {
  return bars.map(b => [b.t, b.c]);
}

export function barsForTicker(store: WeeklyBulkStore | null, ticker: string): WeeklyBar[] | null {
  if (!store?.data[ticker]?.length) return null;
  return expandBars(store.data[ticker]!);
}

export function mergeBulkWeeklyIntoStocks(
  stocks: Stock[],
  bulk: WeeklyBulkStore | null,
): Stock[] {
  if (!bulk?.data || Object.keys(bulk.data).length === 0) return stocks;
  return stocks.map(stock => {
    const bars = barsForTicker(bulk, stock.ticker);
    if (!bars?.length) return stock;
    return { ...stock, weeklyHistory: bars };
  });
}

function parseBulk(raw: string | Buffer): WeeklyBulkStore | null {
  try {
    let text: string;
    if (Buffer.isBuffer(raw)) {
      text = raw[0] === 0x7b ? raw.toString('utf8') : gunzipSync(raw).toString('utf8');
    } else if (raw.startsWith('{')) {
      text = raw;
    } else {
      text = gunzipSync(Buffer.from(raw, 'base64')).toString('utf8');
    }
    const parsed = JSON.parse(text) as WeeklyBulkStore;
    if (!parsed?.data || typeof parsed.data !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function redisGetBulk(
  client: NonNullable<ReturnType<typeof getRedis>>,
  universeId: UniverseId,
): Promise<WeeklyBulkStore | null> {
  const raw = await client.getBuffer(universeMeta(universeId).weeklyBulkKey);
  if (!raw?.length) return null;
  return parseBulk(raw);
}

export async function readWeeklyBulk(universeId: UniverseId = 'sp500'): Promise<WeeklyBulkStore | null> {
  const client = getRedis();
  if (client) {
    try {
      const parsed = await redisGetBulk(client, universeId);
      if (parsed) return parsed;
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

export async function writeWeeklyBulk(
  store: WeeklyBulkStore,
  universeId: UniverseId = 'sp500',
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  const compressed = gzipSync(JSON.stringify(store));
  const WEEKLY_BULK_TTL_SEC = 21 * 24 * 60 * 60;
  await client.setex(universeMeta(universeId).weeklyBulkKey, WEEKLY_BULK_TTL_SEC, compressed);
}

export async function readWeeklyBulkCursor(universeId: UniverseId = 'sp500'): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  try {
    const v = await client.get(universeMeta(universeId).weeklyBulkCursorKey);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export async function writeWeeklyBulkCursor(
  cursor: number,
  universeId: UniverseId = 'sp500',
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(universeMeta(universeId).weeklyBulkCursorKey, String(cursor));
  } catch {
    // non-fatal
  }
}

export interface WeeklyBulkBatchResult {
  complete: boolean;
  fetched: number;
  total: number;
  batchAdded: number;
  cursor: number;
}

export async function runWeeklyBulkBatch(
  reset = false,
  universeId: UniverseId = 'sp500',
): Promise<WeeklyBulkBatchResult> {
  const universe = await getSymbolUniverse(universeId);
  const total = universe.length;

  const existing = reset ? null : await readWeeklyBulk(universeId);
  let data: Record<string, [number, number][]> = reset ? {} : { ...(existing?.data ?? {}) };

  let cursor = reset ? 0 : await readWeeklyBulkCursor(universeId);
  if (reset) await writeWeeklyBulkCursor(0, universeId);

  const batch = universe.slice(cursor, cursor + WEEKLY_BULK_BATCH_SIZE);
  if (batch.length === 0) {
    return { complete: true, fetched: Object.keys(data).length, total, batchAdded: 0, cursor: 0 };
  }

  let batchAdded = 0;
  for (const entry of batch) {
    const yahooSym = entry.symbol;
    const bars = await fetchYahooWeeklyBars(yahooSym, WEEKLY_DOWNLOAD_YEARS);
    if (bars?.length) {
      data[entry.symbol] = compactBars(bars);
      batchAdded += 1;
    }
    await sleep(180);
  }

  const nextCursor = cursor + batch.length;
  const complete = nextCursor >= total;

  const store: WeeklyBulkStore = {
    cachedAt: new Date().toISOString(),
    downloadYears: WEEKLY_DOWNLOAD_YEARS,
    complete,
    data,
  };

  await writeWeeklyBulk(store, universeId);
  await writeWeeklyBulkCursor(complete ? 0 : nextCursor, universeId);

  return {
    complete,
    fetched: Object.keys(data).length,
    total,
    batchAdded,
    cursor: nextCursor,
  };
}

export function weeklyBulkCoverage(store: WeeklyBulkStore | null): number {
  if (!store?.data) return 0;
  return Object.keys(store.data).length;
}

export interface WeeklyBulkGapFillResult {
  missingBefore: number;
  added: string[];
  failed: string[];
  fetched: number;
  total: number;
  complete: boolean;
  store: WeeklyBulkStore;
}

/** Download weekly history only for universe symbols missing from the bulk store. */
export async function fillWeeklyBulkGaps(
  universeId: UniverseId = 'sp500',
): Promise<WeeklyBulkGapFillResult> {
  const universe = await getSymbolUniverse(universeId);
  const total = universe.length;
  const existing = await readWeeklyBulk(universeId);
  const data: Record<string, [number, number][]> = { ...(existing?.data ?? {}) };

  const missing = universe
    .map(s => s.symbol)
    .filter(sym => !data[sym]?.length)
    .sort();

  const added: string[] = [];
  const failed: string[] = [];

  for (const symbol of missing) {
    const bars = await fetchYahooWeeklyBars(symbol, WEEKLY_DOWNLOAD_YEARS);
    if (bars?.length) {
      data[symbol] = compactBars(bars);
      added.push(symbol);
    } else {
      failed.push(symbol);
    }
    await sleep(180);
  }

  const universeSyms = new Set(universe.map(s => s.symbol));
  const fetched = [...universeSyms].filter(sym => data[sym]?.length).length;
  const complete = fetched >= total;

  const store: WeeklyBulkStore = {
    cachedAt: new Date().toISOString(),
    downloadYears: WEEKLY_DOWNLOAD_YEARS,
    complete,
    data,
  };

  await writeWeeklyBulk(store, universeId);
  if (complete) await writeWeeklyBulkCursor(0, universeId);

  return {
    missingBefore: missing.length,
    added,
    failed,
    fetched,
    total,
    complete,
    store,
  };
}

export { parseUniverseId, type UniverseId };
