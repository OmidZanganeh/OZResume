import type { Stock } from '@/app/web-apps/stock-screener/types';
import type { UniverseId } from '@/app/web-apps/stock-screener/universe';
import { universeMeta } from '@/app/web-apps/stock-screener/universe';
import { liveAvgDailyVolumeM, weeklyBarsHaveVolume } from '@/app/web-apps/stock-screener/weeklyVolume';
import { getSymbolUniverse } from './symbols';
import { fetchYahooWeeklyBars, sleep } from './weeklyPrices';
import {
  mergeStocks,
  readRedisSnapshot,
  writeRedisSnapshot,
  type StoredSnapshot,
} from './cache';
import { getRedis } from './redis';
import type { BatchResult } from './incrementalRefresh';
import { snapshotNeedsVolumeRepair } from '@/app/web-apps/stock-screener/snapshotVolumeRepair';

export { snapshotNeedsVolumeRepair };

/** Yahoo weekly fetches — faster than full Finnhub refresh. */
const REPAIR_BATCH_SIZE = 80;

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

/** Patch avgVolume from Yahoo weekly bars (live, same source as price history). */
export async function runVolumeRepairBatch(universeId: UniverseId): Promise<BatchResult> {
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

  const patches: Stock[] = [];
  for (const entry of batch) {
    const existing = stockByTicker.get(entry.symbol);
    if (!existing) continue;
    const bars = await fetchYahooWeeklyBars(entry.symbol, 3);
    if (bars?.length && weeklyBarsHaveVolume(bars)) {
      const vol = liveAvgDailyVolumeM(bars);
      if (vol != null && vol > 0) {
        patches.push({
          ...existing,
          avgVolume: vol,
          weeklyHistory: existing.weeklyHistory?.length ? existing.weeklyHistory : bars,
        });
      }
    }
    await sleep(100);
  }

  const merged = mergeStocks(snap.data.stocks, patches);
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
    batchAdded: patches.length,
    cursor: nextCursor,
  };
}
