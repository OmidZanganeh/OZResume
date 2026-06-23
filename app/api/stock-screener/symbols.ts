import type { Sector } from '@/app/tools/stock-screener/types';
import { getFinnhubApiKey } from './env';
import { getRedis } from './redis';

const FINNHUB = 'https://finnhub.io/api/v1';
export const SYMBOLS_REDIS_KEY = 'stock-screener:symbols:v2';
const SYMBOLS_TTL_SEC = 30 * 24 * 60 * 60;

export interface UsSymbol {
  symbol: string;
  name: string;
  sector: Sector;
  mic?: string;
}

interface FinnhubSymbolRow {
  symbol: string;
  description?: string;
  displaySymbol?: string;
  type?: string;
  mic?: string;
}

/** Major US listing venues — skips OTC/pink sheets unless STOCK_SCREENER_INCLUDE_OTC=true */
const MAJOR_MICS = new Set(['XNAS', 'XNYS', 'ARCX', 'XNCM', 'XNMS', 'XASE']);

function includeOtc(): boolean {
  return process.env.STOCK_SCREENER_INCLUDE_OTC?.trim() === 'true';
}

const EQUITY_TYPES = new Set([
  'common stock',
  'adr',
  'eqs',
]);

function isCommonEquity(row: FinnhubSymbolRow): boolean {
  const t = (row.type ?? '').toLowerCase().trim();
  if (!t) return false;
  if (t.includes('etf') || t.includes('etn') || t.includes('fund')) return false;
  if (t.includes('warrant') || t.includes('right') || t.includes('unit')) return false;
  if (t.includes('bond') || t.includes('note') || t.includes('preferred')) return false;
  if (EQUITY_TYPES.has(t)) return true;
  return t.includes('common stock');
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

async function fetchFromFinnhub(apiKey: string): Promise<UsSymbol[]> {
  const res = await fetch(`${FINNHUB}/stock/symbol?exchange=US&token=${apiKey}`);
  if (!res.ok) throw new Error(`Finnhub symbol list failed (${res.status})`);
  const rows = (await res.json()) as FinnhubSymbolRow[];
  if (!Array.isArray(rows)) throw new Error('Invalid Finnhub symbol response');

  const seen = new Set<string>();
  const out: UsSymbol[] = [];

  for (const row of rows) {
    if (!isCommonEquity(row)) continue;
    if (!includeOtc() && row.mic && !MAJOR_MICS.has(row.mic)) continue;
    const symbol = (row.displaySymbol ?? row.symbol)?.trim();
    if (!symbol || symbol.length > 8) continue;
    if (seen.has(symbol)) continue;
    seen.add(symbol);

    const name = (row.description ?? symbol).trim();
    out.push({
      symbol,
      name,
      sector: inferSector(name),
      mic: row.mic,
    });
  }

  out.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return out;
}

export async function getUsSymbolUniverse(): Promise<UsSymbol[]> {
  const client = getRedis();
  if (client) {
    try {
      const raw = await client.get(SYMBOLS_REDIS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UsSymbol[];
        if (Array.isArray(parsed) && parsed.length > 100) return parsed;
      }
    } catch {
      // fall through to Finnhub
    }
  }

  const apiKey = getFinnhubApiKey();
  if (!apiKey) throw new Error('No Finnhub API key');

  const symbols = await fetchFromFinnhub(apiKey);

  if (client && symbols.length > 0) {
    try {
      await client.setex(SYMBOLS_REDIS_KEY, SYMBOLS_TTL_SEC, JSON.stringify(symbols));
    } catch {
      // non-fatal
    }
  }

  return symbols;
}
