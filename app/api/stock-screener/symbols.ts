import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Sector } from '@/app/web-apps/stock-screener/types';
import {
  parseUniverseId,
  universeMeta,
  type UniverseId,
} from '@/app/web-apps/stock-screener/universe';
import { getRedis } from './redis';

/** @deprecated use universeMeta('sp500').symbolsKey */
export const SYMBOLS_REDIS_KEY = universeMeta('sp500').symbolsKey;
/** @deprecated use universeMeta('sp500').snapshotKey */
export const SNAPSHOT_REDIS_KEY = universeMeta('sp500').snapshotKey;
/** @deprecated use universeMeta('sp500').cursorKey */
export const CURSOR_REDIS_KEY = universeMeta('sp500').cursorKey;

const SYMBOLS_TTL_SEC = 30 * 24 * 60 * 60;
const SP500_DATASET_URL =
  'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv';
const NASDAQ100_DATASET_URL =
  'https://yfiua.github.io/index-constituents/constituents-nasdaq100.csv';

function sp400ConstituentsPath(): string {
  return resolve(process.cwd(), 'data/sp400-constituents.csv');
}

export interface UsSymbol {
  symbol: string;
  name: string;
  sector: Sector;
}

/** Rough sector guess from company name — used when Finnhub has no GICS field. */
export function inferSector(name: string, metric?: Record<string, number>): Sector {
  const industry = String(metric?.['industry'] ?? metric?.['sector'] ?? '').toLowerCase();
  const text = `${name} ${industry}`.toLowerCase();

  if (/\b(bank|bancorp|financial|insurance|capital|credit|reit|mortgage|asset manag|broker|exchange)\b/.test(text)) {
    return 'Finance';
  }
  if (/\b(pharma|therapeutic|medical|health|biotech|hospital|diagnostic|surgical|clinic)\b/.test(text)) {
    return 'Healthcare';
  }
  if (/\b(oil|gas|energy|petro|solar|utility|utilities|power|coal|drill|pipeline|electric)\b/.test(text)) {
    return 'Energy';
  }
  if (/\b(software|technology|semiconductor|cloud|cyber|data|digital|chip|computing|systems inc)\b/.test(text)) {
    return 'Tech';
  }
  return 'Consumer';
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function gicsToSector(gics: string): Sector {
  const g = gics.toLowerCase();
  if (g.includes('information technology')) return 'Tech';
  if (g.includes('health care')) return 'Healthcare';
  if (g.includes('financial')) return 'Finance';
  if (g.includes('energy')) return 'Energy';
  return 'Consumer';
}

async function fetchSp500FromDataset(): Promise<UsSymbol[]> {
  const res = await fetch(SP500_DATASET_URL, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`S&P 500 list fetch failed (${res.status})`);
  const lines = (await res.text()).trim().split(/\r?\n/).slice(1);
  const out: UsSymbol[] = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const symbol = cols[0]?.trim();
    const name = cols[1]?.trim();
    const gics = cols[2]?.trim();
    if (!symbol || !name) continue;
    out.push({
      symbol: symbol.replace(/\./g, '-'),
      name,
      sector: gicsToSector(gics ?? ''),
    });
  }

  if (out.length < universeMeta('sp500').minSymbols) {
    throw new Error('S&P 500 list returned too few symbols');
  }
  out.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return out;
}

async function fetchNasdaq100FromDataset(): Promise<UsSymbol[]> {
  const res = await fetch(NASDAQ100_DATASET_URL, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`NASDAQ 100 list fetch failed (${res.status})`);
  const lines = (await res.text()).trim().split(/\r?\n/).slice(1);
  const out: UsSymbol[] = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const symbol = cols[0]?.trim();
    const name = cols[1]?.trim();
    if (!symbol || !name || symbol.toLowerCase() === 'symbol') continue;
    out.push({
      symbol: symbol.replace(/\./g, '-'),
      name,
      sector: inferSector(name),
    });
  }

  if (out.length < universeMeta('nasdaq100').minSymbols) {
    throw new Error('NASDAQ 100 list returned too few symbols');
  }
  out.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return out;
}

async function fetchSp400FromDataset(): Promise<UsSymbol[]> {
  const path = sp400ConstituentsPath();
  if (!existsSync(path)) {
    throw new Error(
      'S&P 400 constituent file missing — run: node scripts/fetch-sp400-wikipedia.mjs',
    );
  }
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/).slice(1);
  const out: UsSymbol[] = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const symbol = cols[0]?.trim();
    const name = cols[1]?.trim();
    const gics = cols[2]?.trim();
    if (!symbol || !name) continue;
    out.push({
      symbol: symbol.replace(/\./g, '-'),
      name,
      sector: gicsToSector(gics ?? ''),
    });
  }

  if (out.length < universeMeta('sp400').minSymbols) {
    throw new Error('S&P 400 list returned too few symbols');
  }
  out.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return out;
}

async function fetchUniverseFromDataset(universeId: UniverseId): Promise<UsSymbol[]> {
  if (universeId === 'nasdaq100') return fetchNasdaq100FromDataset();
  if (universeId === 'sp400') return fetchSp400FromDataset();
  return fetchSp500FromDataset();
}

/** Index symbol list for the screener (S&P 500, NASDAQ 100, or S&P 400). */
export async function getSymbolUniverse(universeId: UniverseId = 'sp500'): Promise<UsSymbol[]> {
  const meta = universeMeta(universeId);
  const client = getRedis();
  if (client) {
    try {
      const raw = await client.get(meta.symbolsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as UsSymbol[];
        if (Array.isArray(parsed) && parsed.length >= meta.minSymbols) return parsed;
      }
    } catch {
      // fall through
    }
  }

  const symbols = await fetchUniverseFromDataset(universeId);

  if (client && symbols.length > 0) {
    try {
      await client.setex(meta.symbolsKey, SYMBOLS_TTL_SEC, JSON.stringify(symbols));
    } catch {
      // non-fatal
    }
  }

  return symbols;
}

export { parseUniverseId, type UniverseId };
