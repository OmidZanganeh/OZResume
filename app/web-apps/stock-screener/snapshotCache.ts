import type { Stock, StockSnapshot } from './types';
import { HISTORY_DAYS, HISTORY_STEP_DAYS } from './types';
import { buildSnapshot } from './historical';

const MAX_CACHED_STEPS = 10;
const BUILD_CHUNK = 64;

function snapDaysAgo(days: number): number {
  if (days <= 0) return 0;
  const snapped = Math.round(days / HISTORY_STEP_DAYS) * HISTORY_STEP_DAYS;
  return Math.min(HISTORY_DAYS, Math.max(HISTORY_STEP_DAYS, snapped));
}

let stocksIdentity = '';
const stepCache = new Map<number, Map<string, StockSnapshot>>();
const stepOrder: number[] = [];

function stocksKey(stocks: Stock[]): string {
  if (stocks.length === 0) return '0';
  return `${stocks.length}:${stocks[0]!.ticker}:${stocks[stocks.length - 1]!.ticker}`;
}

export function invalidateSnapshotCache(): void {
  stepCache.clear();
  stepOrder.length = 0;
  stocksIdentity = '';
}

function touchStep(step: number, map: Map<string, StockSnapshot>): void {
  const idx = stepOrder.indexOf(step);
  if (idx >= 0) stepOrder.splice(idx, 1);
  stepOrder.push(step);
  stepCache.set(step, map);
  while (stepOrder.length > MAX_CACHED_STEPS) {
    const evict = stepOrder.shift()!;
    stepCache.delete(evict);
  }
}

export function peekSnapshotCache(
  stocks: Stock[],
  daysAgo: number,
): Map<string, StockSnapshot> | null {
  const key = stocksKey(stocks);
  if (key !== stocksIdentity) return null;
  const step = snapDaysAgo(daysAgo);
  return stepCache.get(step) ?? null;
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 32 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/** Build snapshots in chunks so the main thread can paint between batches. */
export async function buildSnapshotsAsync(
  stocks: Stock[],
  daysAgo: number,
  signal?: { cancelled: boolean },
): Promise<Map<string, StockSnapshot>> {
  const key = stocksKey(stocks);
  if (key !== stocksIdentity) {
    invalidateSnapshotCache();
    stocksIdentity = key;
  }

  const step = snapDaysAgo(daysAgo);
  const hit = stepCache.get(step);
  if (hit) return hit;

  const map = new Map<string, StockSnapshot>();
  for (let i = 0; i < stocks.length; i += BUILD_CHUNK) {
    if (signal?.cancelled) break;
    const end = Math.min(i + BUILD_CHUNK, stocks.length);
    for (let j = i; j < end; j++) {
      const stock = stocks[j]!;
      map.set(stock.ticker, buildSnapshot(stock, step));
    }
    if (end < stocks.length) await yieldToMain();
  }

  if (!signal?.cancelled) {
    touchStep(step, map);
  }
  return map;
}
