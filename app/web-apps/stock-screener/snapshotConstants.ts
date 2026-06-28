import type { StockSnapshot } from './types';

/** Stable empty map — avoid `new Map()` on every render when snapshots are loading. */
export const EMPTY_SNAPSHOTS = new Map<string, StockSnapshot>();
