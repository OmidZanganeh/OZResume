import { MOCK_STOCKS } from '@/app/web-apps/stock-screener/mockStocks';
import type { UniverseId } from '@/app/web-apps/stock-screener/universe';
import { getFinnhubApiKey } from './env';
import { readRedisSnapshot, type MarketDataResult } from './cache';
import { loadMarketFromStore, runIncrementalBatch } from './incrementalRefresh';
import { HISTORY_YEARS } from './historyConstants';
import {
  mergeBulkFundamentalsIntoStocks,
  readFundamentalBulk,
  fundamentalBulkCoverage,
} from './fundamentalBulk';
import {
  mergeBulkWeeklyIntoStocks,
  readWeeklyBulk,
  weeklyBulkCoverage,
  weeklyBulkNeedsVolumeRepair,
} from './weeklyBulk';
import { enrichLiveYahooVolumeForStocks } from './enrichStockFromWeekly';
import { persistVolumePatchesToSnapshot, snapshotNeedsVolumeRepair } from './volumeRepair';

export type { MarketDataResult };

const MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const memoryCache = new Map<UniverseId, { result: MarketDataResult; expiresAt: number }>();
const refreshKickStarted = new Set<UniverseId>();
const weeklyBulkKickStarted = new Set<UniverseId>();
const weeklyVolumeRepairKickStarted = new Map<UniverseId, number>();
const volumeRepairKickStarted = new Map<UniverseId, number>();

const REPAIR_KICK_DEBOUNCE_MS = 60_000;

function apiBase(): string {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://omidzanganeh.com';
}

function kickRefreshChain(universeId: UniverseId) {
  if (refreshKickStarted.has(universeId) || !getFinnhubApiKey()) return;
  refreshKickStarted.add(universeId);

  const q = new URLSearchParams({ reset: '1', continue: '1', universe: universeId });
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) q.set('secret', secret);

  fetch(`${apiBase()}/api/stock-screener/refresh?${q}`, { cache: 'no-store' }).catch(() => {});
}

function kickWeeklyBulkChain(universeId: UniverseId) {
  if (weeklyBulkKickStarted.has(universeId)) return;
  weeklyBulkKickStarted.add(universeId);

  const q = new URLSearchParams({ reset: '1', continue: '1', universe: universeId });
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) q.set('secret', secret);

  fetch(`${apiBase()}/api/stock-screener/weekly-bulk/refresh?${q}`, {
    cache: 'no-store',
  }).catch(() => {});
}

function kickWeeklyVolumeRepairChain(universeId: UniverseId) {
  const now = Date.now();
  const last = weeklyVolumeRepairKickStarted.get(universeId) ?? 0;
  if (now - last < REPAIR_KICK_DEBOUNCE_MS) return;
  weeklyVolumeRepairKickStarted.set(universeId, now);

  const q = new URLSearchParams({ repairVolume: '1', continue: '1', universe: universeId });
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) q.set('secret', secret);

  fetch(`${apiBase()}/api/stock-screener/weekly-bulk/refresh?${q}`, { cache: 'no-store' }).catch(
    () => {},
  );
}

function kickVolumeRepairChain(universeId: UniverseId) {
  const now = Date.now();
  const last = volumeRepairKickStarted.get(universeId) ?? 0;
  if (now - last < REPAIR_KICK_DEBOUNCE_MS) return;
  volumeRepairKickStarted.set(universeId, now);

  const q = new URLSearchParams({ repairVolume: '1', continue: '1', universe: universeId });
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) q.set('secret', secret);

  fetch(`${apiBase()}/api/stock-screener/refresh?${q}`, { cache: 'no-store' }).catch(() => {});
}

function remember(result: MarketDataResult, universeId: UniverseId) {
  if (result.refreshComplete === false) return;
  if (snapshotNeedsVolumeRepair(result.stocks)) return;
  memoryCache.set(universeId, {
    result: { ...result, fromCache: true, universe: universeId },
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });
}

function fromMemory(universeId: UniverseId): MarketDataResult | null {
  const entry = memoryCache.get(universeId);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  if (entry.result.refreshComplete === false) return null;
  return entry.result;
}

async function withBulkData(
  result: MarketDataResult,
  universeId: UniverseId,
): Promise<MarketDataResult> {
  const weekly = await readWeeklyBulk(universeId);
  let stocks = mergeBulkWeeklyIntoStocks(result.stocks, weekly);
  const enriched = await enrichLiveYahooVolumeForStocks(stocks);
  stocks = enriched.stocks;
  if (enriched.patches.length > 0) {
    void persistVolumePatchesToSnapshot(universeId, enriched.patches).catch(() => {});
  }

  let warning = result.warning;
  if (!weekly?.complete) {
    kickWeeklyBulkChain(universeId);
    const cov = weeklyBulkCoverage(weekly);
    const bulkNote =
      cov > 0
        ? `Weekly history loading: ${cov} symbols (${HISTORY_YEARS}y)…`
        : `Building ${HISTORY_YEARS}-year weekly price history…`;
    warning = warning ? `${warning} ${bulkNote}` : bulkNote;
  } else if (weeklyBulkNeedsVolumeRepair(weekly)) {
    kickWeeklyVolumeRepairChain(universeId);
    const volHistNote = 'Backfilling historical volume from Yahoo — Vol at past dates improves over a few minutes.';
    warning = warning ? `${warning} ${volHistNote}` : volHistNote;
  }

  const fundamental = await readFundamentalBulk(universeId);
  stocks = mergeBulkFundamentalsIntoStocks(stocks, fundamental);
  if (!fundamental?.complete) {
    const cov = fundamentalBulkCoverage(fundamental);
    const fundNote =
      cov > 0
        ? `Historical fundamentals loading: ${cov} symbols…`
        : 'Building historical fundamentals — run npm run warm:fundamentals if this persists.';
    warning = warning ? `${warning} ${fundNote}` : fundNote;
  }

  if (snapshotNeedsVolumeRepair(stocks)) {
    kickVolumeRepairChain(universeId);
    const volNote = 'Refreshing average volume data — Vol column will fill in over the next few minutes.';
    warning = warning ? `${warning} ${volNote}` : volNote;
  }

  return { ...result, stocks, universe: universeId, warning };
}

/** Read cached snapshot only — never calls Finnhub (safe for page loads). */
export async function getMarketStocks(universeId: UniverseId = 'sp500'): Promise<MarketDataResult> {
  const mem = fromMemory(universeId);
  if (mem && !snapshotNeedsVolumeRepair(mem.stocks)) return withBulkData(mem, universeId);

  const stored = await loadMarketFromStore(universeId);
  if (stored) {
    if (!stored.refreshComplete) kickRefreshChain(universeId);
    const merged = await withBulkData(stored, universeId);
    if (stored.refreshComplete) remember(merged, universeId);
    return merged;
  }

  if (!getFinnhubApiKey()) {
    return withBulkData({
      stocks: MOCK_STOCKS,
      source: 'mock',
      cachedAt: new Date().toISOString(),
      universe: universeId,
      warning: 'No API key — set FINNHUB_API_KEY or X_Finnhub_Secret.',
    }, universeId);
  }

  kickRefreshChain(universeId);
  kickWeeklyBulkChain(universeId);

  return withBulkData({
    stocks: MOCK_STOCKS,
    source: 'mock',
    cachedAt: new Date().toISOString(),
    universe: universeId,
    warning: 'Building market cache — live data loads in a few minutes. Refresh this page shortly.',
  }, universeId);
}

/** Run one incremental batch (refresh route / warm script). */
export async function refreshMarketBatch(
  reset = false,
  universeId: UniverseId = 'sp500',
): Promise<MarketDataResult> {
  const key = getFinnhubApiKey();
  if (!key) throw new Error('No Finnhub API key');

  await runIncrementalBatch(reset, universeId);
  const stored = await loadMarketFromStore(universeId);
  if (!stored) throw new Error('Refresh produced no snapshot');

  const merged = await withBulkData(stored, universeId);
  remember(merged, universeId);
  return merged;
}

export async function getStaleForInvalidKey(
  universeId: UniverseId = 'sp500',
): Promise<MarketDataResult | null> {
  const stale = await readRedisSnapshot(universeId);
  if (!stale) return null;
  const { expiresAt, refreshComplete, totalSymbols, ...rest } = stale.data;
  return withBulkData({
    ...rest,
    fromCache: true,
    expiresAt,
    refreshComplete,
    totalSymbols,
    universe: universeId,
    warning: 'Invalid Finnhub API key — serving cached snapshot.',
  }, universeId);
}
