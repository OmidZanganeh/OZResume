export type UniverseId = 'sp500' | 'nasdaq100';

/** Which index(es) to show in the universe table. */
export type UniverseSelection = UniverseId | 'both';

export interface UniverseMeta {
  id: UniverseId;
  label: string;
  shortLabel: string;
  minSymbols: number;
  symbolsKey: string;
  snapshotKey: string;
  cursorKey: string;
  weeklyBulkKey: string;
  weeklyBulkCursorKey: string;
  localBulkFile: string;
}

export const UNIVERSES: Record<UniverseId, UniverseMeta> = {
  sp500: {
    id: 'sp500',
    label: 'S&P 500',
    shortLabel: 'S&P 500',
    minSymbols: 400,
    symbolsKey: 'stock-screener:symbols:sp500',
    snapshotKey: 'stock-screener:snapshot:sp500:v3',
    cursorKey: 'stock-screener:cursor:sp500',
    weeklyBulkKey: 'stock-screener:weekly-bulk:v1',
    weeklyBulkCursorKey: 'stock-screener:weekly-bulk:cursor:v1',
    localBulkFile: 'sp500-weekly-bulk.json',
  },
  nasdaq100: {
    id: 'nasdaq100',
    label: 'NASDAQ 100',
    shortLabel: 'NASDAQ 100',
    minSymbols: 90,
    symbolsKey: 'stock-screener:symbols:nasdaq100',
    snapshotKey: 'stock-screener:snapshot:nasdaq100:v1',
    cursorKey: 'stock-screener:cursor:nasdaq100',
    weeklyBulkKey: 'stock-screener:weekly-bulk:nasdaq100:v1',
    weeklyBulkCursorKey: 'stock-screener:weekly-bulk:nasdaq100:cursor:v1',
    localBulkFile: 'nasdaq100-weekly-bulk.json',
  },
};

export const UNIVERSE_IDS = Object.keys(UNIVERSES) as UniverseId[];

export function parseUniverseId(raw: string | null | undefined): UniverseId {
  if (raw === 'nasdaq100') return 'nasdaq100';
  return 'sp500';
}

export function parseUniverseSelection(raw: string | null | undefined): UniverseSelection {
  if (raw === 'nasdaq100') return 'nasdaq100';
  if (raw === 'both') return 'both';
  return 'sp500';
}

export function universesForSelection(sel: UniverseSelection): UniverseId[] {
  if (sel === 'both') return [...UNIVERSE_IDS];
  return [sel];
}

export function universeMeta(id: UniverseId): UniverseMeta {
  return UNIVERSES[id];
}

export function selectionLabel(sel: UniverseSelection): string {
  if (sel === 'both') return 'S&P 500 + NASDAQ 100';
  return universeMeta(sel).shortLabel;
}

export function universeCsvPrefix(sel: UniverseSelection): string {
  if (sel === 'both') return 'combined-screener';
  return sel === 'nasdaq100' ? 'nasdaq100-screener' : 'sp500-screener';
}

export type UniverseCacheKey = UniverseSelection;
