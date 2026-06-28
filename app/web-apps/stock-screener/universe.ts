export type UniverseId = 'sp500' | 'nasdaq100' | 'sp400';

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
  fundamentalBulkKey: string;
  localFundamentalFile: string;
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
    fundamentalBulkKey: 'stock-screener:fundamental-bulk:v1',
    localFundamentalFile: 'sp500-fundamental-bulk.json',
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
    fundamentalBulkKey: 'stock-screener:fundamental-bulk:nasdaq100:v1',
    localFundamentalFile: 'nasdaq100-fundamental-bulk.json',
  },
  sp400: {
    id: 'sp400',
    label: 'S&P 400 MidCap',
    shortLabel: 'S&P 400',
    minSymbols: 350,
    symbolsKey: 'stock-screener:symbols:sp400',
    snapshotKey: 'stock-screener:snapshot:sp400:v1',
    cursorKey: 'stock-screener:cursor:sp400',
    weeklyBulkKey: 'stock-screener:weekly-bulk:sp400:v1',
    weeklyBulkCursorKey: 'stock-screener:weekly-bulk:sp400:cursor:v1',
    localBulkFile: 'sp400-weekly-bulk.json',
    fundamentalBulkKey: 'stock-screener:fundamental-bulk:sp400:v1',
    localFundamentalFile: 'sp400-fundamental-bulk.json',
  },
};

export const UNIVERSE_IDS = Object.keys(UNIVERSES) as UniverseId[];

export function parseUniverseId(raw: string | null | undefined): UniverseId {
  if (raw === 'nasdaq100') return 'nasdaq100';
  if (raw === 'sp400') return 'sp400';
  return 'sp500';
}

/** CLI/scripts: `npm run warm:stocks -- sp400` */
export function parseUniverseArg(raw?: string | null): UniverseId {
  return parseUniverseId(raw ?? undefined);
}

export function parseUniverseSelection(raw: string | null | undefined): UniverseSelection {
  if (raw === 'nasdaq100') return 'nasdaq100';
  if (raw === 'sp400') return 'sp400';
  if (raw === 'both') return 'both';
  return 'sp500';
}

export function universesForSelection(sel: UniverseSelection): UniverseId[] {
  if (sel === 'both') return ['sp500', 'nasdaq100'];
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
  if (sel === 'nasdaq100') return 'nasdaq100-screener';
  if (sel === 'sp400') return 'sp400-screener';
  return 'sp500-screener';
}

export type UniverseCacheKey = UniverseSelection;
