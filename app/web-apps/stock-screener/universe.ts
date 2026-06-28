export type UniverseId = 'sp500' | 'nasdaq100' | 'sp400';

/** One or more index universes to load and merge (deduped by ticker). */
export type UniverseSelection = UniverseId[];

export const DEFAULT_UNIVERSE_SELECTION: UniverseSelection = ['sp500'];

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

function isUniverseId(v: unknown): v is UniverseId {
  return typeof v === 'string' && UNIVERSE_IDS.includes(v as UniverseId);
}

/** Normalize selection — at least one index; stable sort order. */
export function normalizeUniverseSelection(raw: unknown): UniverseSelection {
  if (Array.isArray(raw)) {
    const ids = [...new Set(raw.filter(isUniverseId))].sort();
    if (ids.length > 0) return ids;
  }
  if (raw === 'both') return ['nasdaq100', 'sp500'];
  if (isUniverseId(raw)) return [raw];
  return DEFAULT_UNIVERSE_SELECTION;
}

export function universesForSelection(sel: UniverseSelection): UniverseId[] {
  return normalizeUniverseSelection(sel);
}

export function isUniverseSelected(sel: UniverseSelection, id: UniverseId): boolean {
  return normalizeUniverseSelection(sel).includes(id);
}

export function toggleUniverseInSelection(
  sel: UniverseSelection,
  id: UniverseId,
  checked: boolean,
): UniverseSelection {
  const current = normalizeUniverseSelection(sel);
  if (checked) {
    if (current.includes(id)) return current;
    return [...current, id].sort();
  }
  if (current.length === 1 && current[0] === id) return current;
  return current.filter(x => x !== id);
}

/** Session cache key — e.g. `nasdaq100+sp400` or `sp500`. */
export function universeCacheKey(sel: UniverseSelection): string {
  return normalizeUniverseSelection(sel).join('+');
}

export type UniverseCacheKey = string;

export function universeMeta(id: UniverseId): UniverseMeta {
  return UNIVERSES[id];
}

export function selectionLabel(sel: UniverseSelection): string {
  const ids = normalizeUniverseSelection(sel);
  if (ids.length === UNIVERSE_IDS.length) return 'All indices';
  if (ids.length === 1) return universeMeta(ids[0]!).shortLabel;
  return ids.map(id => universeMeta(id).shortLabel).join(' + ');
}

export function universeCsvPrefix(sel: UniverseSelection): string {
  const ids = normalizeUniverseSelection(sel);
  if (ids.length !== 1) return 'combined-screener';
  if (ids[0] === 'nasdaq100') return 'nasdaq100-screener';
  if (ids[0] === 'sp400') return 'sp400-screener';
  return 'sp500-screener';
}
