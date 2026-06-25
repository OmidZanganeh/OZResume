export type UniverseId = 'sp500' | 'nasdaq100';

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

export function universeMeta(id: UniverseId): UniverseMeta {
  return UNIVERSES[id];
}

export function universeCsvPrefix(id: UniverseId): string {
  return id === 'nasdaq100' ? 'nasdaq100-screener' : 'sp500-screener';
}
