import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import type { Stock, WeeklyBar } from '@/app/web-apps/stock-screener/types';
import { enrichStockFromWeeklyHistory } from '@/app/api/stock-screener/enrichStockFromWeekly';
import { weeklyBarsHaveVolume } from '@/app/web-apps/stock-screener/weeklyVolume';
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

/** [unixSec, close] or [unixSec, close, weeklyVolumeShares]. */
export type CompactWeeklyBar = [number, number] | [number, number, number];

export interface WeeklyBulkStore {
  cachedAt: string;
  downloadYears: number;
  complete: boolean;
  data: Record<string, CompactWeeklyBar[]>;
}

function localBulkPath(universeId: UniverseId): string {
  return resolve(process.cwd(), 'data', universeMeta(universeId).localBulkFile);
}

function expandBars(compact: CompactWeeklyBar[]): WeeklyBar[] {
  return compact.map(row => {
    const [t, c, v] = row;
    if (v != null && Number.isFinite(v) && v > 0) return { t, c, v };
    return { t, c };
  });
}

function compactBars(bars: WeeklyBar[]): CompactWeeklyBar[] {
  return bars.map(b =>
    b.v != null && b.v > 0 ? [b.t, b.c, b.v] : [b.t, b.c],
  );
}

function compactRowHasVolume(row: CompactWeeklyBar): boolean {
  return row.length >= 3 && row[2]! > 0;
}

export function weeklyBulkNeedsVolumeRepair(store: WeeklyBulkStore | null): boolean {
  if (!store?.data) return false;
  const tickers = Object.keys(store.data).filter(sym => store.data[sym]?.length);
  if (tickers.length < 20) return false;
  const sample = tickers.slice(0, Math.min(40, tickers.length));
  const withVol = sample.filter(sym => {
    const rows = store.data[sym]!;
    const recent = rows.slice(0, 4);
    return recent.some(compactRowHasVolume);
  }).length;
  return withVol / sample.length < 0.5;
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
    if (!bars?.length) return enrichStockFromWeeklyHistory(stock);
    return enrichStockFromWeeklyHistory({ ...stock, weeklyHistory: bars });
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
  let data: Record<string, CompactWeeklyBar[]> = reset ? {} : { ...(existing?.data ?? {}) };

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
  const data: Record<string, CompactWeeklyBar[]> = { ...(existing?.data ?? {}) };

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

function volumeRepairCursorKey(universeId: UniverseId): string {
  return `${universeMeta(universeId).weeklyBulkKey}:volume-repair-cursor`;
}

async function readVolumeRepairCursor(universeId: UniverseId): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  try {
    const v = await client.get(volumeRepairCursorKey(universeId));
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

async function writeVolumeRepairCursor(cursor: number, universeId: UniverseId): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    if (cursor <= 0) await client.del(volumeRepairCursorKey(universeId));
    else await client.set(volumeRepairCursorKey(universeId), String(cursor));
  } catch {
    // non-fatal
  }
}

/** Re-download Yahoo weekly bars (with volume) for symbols still stored as close-only. */
export async function runWeeklyVolumeRepairBatch(
  universeId: UniverseId = 'sp500',
): Promise<WeeklyBulkBatchResult> {
  const universe = await getSymbolUniverse(universeId);
  const total = universe.length;
  const existing = await readWeeklyBulk(universeId);
  if (!existing?.data) {
    return { complete: true, fetched: 0, total, batchAdded: 0, cursor: 0 };
  }

  const data: Record<string, CompactWeeklyBar[]> = { ...existing.data };
  const needsRepair = universe
    .map(s => s.symbol)
    .filter(sym => {
      const rows = data[sym];
      if (!rows?.length) return false;
      const recent = rows.slice(0, 4);
      return !recent.some(compactRowHasVolume);
    });

  if (needsRepair.length === 0) {
    await writeVolumeRepairCursor(0, universeId);
    return {
      complete: true,
      fetched: Object.keys(data).length,
      total: needsRepair.length,
      batchAdded: 0,
      cursor: 0,
    };
  }

  let cursor = await readVolumeRepairCursor(universeId);
  if (cursor >= needsRepair.length) cursor = 0;

  const batch = needsRepair.slice(cursor, cursor + WEEKLY_BULK_BATCH_SIZE);
  let batchAdded = 0;

  for (const symbol of batch) {
    const bars = await fetchYahooWeeklyBars(symbol, WEEKLY_DOWNLOAD_YEARS);
    if (bars?.length && weeklyBarsHaveVolume(bars)) {
      data[symbol] = compactBars(bars);
      batchAdded += 1;
    }
    await sleep(180);
  }

  const nextCursor = cursor + batch.length;
  const complete = nextCursor >= needsRepair.length;

  const store: WeeklyBulkStore = {
    ...existing,
    cachedAt: new Date().toISOString(),
    data,
  };

  await writeWeeklyBulk(store, universeId);
  await writeVolumeRepairCursor(complete ? 0 : nextCursor, universeId);

  return {
    complete,
    fetched: Object.keys(data).length,
    total: needsRepair.length,
    batchAdded,
    cursor: nextCursor,
  };
}

export { parseUniverseId, type UniverseId };
