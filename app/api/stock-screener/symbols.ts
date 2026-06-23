import type { Sector } from '@/app/tools/stock-screener/types';
import { getRedis } from './redis';

export const SYMBOLS_REDIS_KEY = 'stock-screener:symbols:sp500';
export const SNAPSHOT_REDIS_KEY = 'stock-screener:snapshot:sp500';
export const CURSOR_REDIS_KEY = 'stock-screener:cursor:sp500';

const SYMBOLS_TTL_SEC = 30 * 24 * 60 * 60;
const SP500_DATASET_URL =
  'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv';

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

  if (out.length < 400) throw new Error('S&P 500 list returned too few symbols');
  out.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return out;
}

/** S&P 500 symbol list for the screener. */
export async function getSymbolUniverse(): Promise<UsSymbol[]> {
  const client = getRedis();
  if (client) {
    try {
      const raw = await client.get(SYMBOLS_REDIS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UsSymbol[];
        if (Array.isArray(parsed) && parsed.length >= 400) return parsed;
      }
    } catch {
      // fall through
    }
  }

  const symbols = await fetchSp500FromDataset();

  if (client && symbols.length > 0) {
    try {
      await client.setex(SYMBOLS_REDIS_KEY, SYMBOLS_TTL_SEC, JSON.stringify(symbols));
    } catch {
      // non-fatal
    }
  }

  return symbols;
}
