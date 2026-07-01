import type { Stock } from '@/app/web-apps/stock-screener/types';
import type { UniverseId } from '@/app/web-apps/stock-screener/universe';
import { universeMeta } from '@/app/web-apps/stock-screener/universe';
import { getFinnhubApiKey } from './env';
import { getSymbolUniverse } from './symbols';
import { fetchStocksBatch } from './finnhub';
import {
  mergeStocks,
  readRedisSnapshot,
  writeRedisSnapshot,
  type StoredSnapshot,
} from './cache';
import { getRedis } from './redis';
import type { BatchResult } from './incrementalRefresh';

/** Matches incremental refresh batch size (Finnhub rate limits). */
const REPAIR_BATCH_SIZE = 150;
import { snapshotNeedsVolumeRepair } from '@/app/web-apps/stock-screener/snapshotVolumeRepair';

export { snapshotNeedsVolumeRepair };

function volumeRepairCursorKey(universeId: UniverseId): string {
  return `${universeMeta(universeId).snapshotKey}:volume-repair-cursor`;
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

/** Re-fetch Finnhub metrics for symbols whose cached avgVolume is still zero. */
export async function runVolumeRepairBatch(universeId: UniverseId): Promise<BatchResult> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey) throw new Error('No Finnhub API key');

  const snap = await readRedisSnapshot(universeId);
  if (!snap?.data.stocks?.length) {
    return { complete: true, fetched: 0, total: 0, batchAdded: 0, cursor: 0 };
  }

  const stockByTicker = new Map(snap.data.stocks.map(s => [s.ticker, s]));
  const universe = await getSymbolUniverse(universeId);
  const needsRepair = universe.filter(u => {
    const s = stockByTicker.get(u.symbol);
    return s && s.marketCap > 0 && (!s.avgVolume || s.avgVolume <= 0);
  });

  if (needsRepair.length === 0) {
    await writeVolumeRepairCursor(0, universeId);
    return {
      complete: true,
      fetched: snap.data.stocks.length,
      total: 0,
      batchAdded: 0,
      cursor: 0,
    };
  }

  let cursor = await readVolumeRepairCursor(universeId);
  if (cursor >= needsRepair.length) cursor = 0;

  const batch = needsRepair.slice(cursor, cursor + REPAIR_BATCH_SIZE);
  if (batch.length === 0) {
    await writeVolumeRepairCursor(0, universeId);
    return {
      complete: true,
      fetched: snap.data.stocks.length,
      total: needsRepair.length,
      batchAdded: 0,
      cursor: 0,
    };
  }

  const fetched = await fetchStocksBatch(
    batch.map(s => ({ ...s, sector: s.sector })),
    apiKey,
  );
  const merged = mergeStocks(snap.data.stocks, fetched);

  const nextCursor = cursor + batch.length;
  const complete = nextCursor >= needsRepair.length;

  const updated: StoredSnapshot = {
    ...snap.data,
    stocks: merged,
    cachedAt: new Date().toISOString(),
    refreshComplete: snap.data.refreshComplete ?? true,
    totalSymbols: snap.data.totalSymbols ?? merged.length,
    expiresAt: snap.data.expiresAt,
  };
  await writeRedisSnapshot(updated, universeId);
  await writeVolumeRepairCursor(complete ? 0 : nextCursor, universeId);

  return {
    complete,
    fetched: merged.length,
    total: needsRepair.length,
    batchAdded: fetched.filter(s => s.avgVolume > 0).length,
    cursor: nextCursor,
  };
}
