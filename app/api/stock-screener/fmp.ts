import type { Stock } from '@/app/web-apps/stock-screener/types';
import type { TickerEntry } from '@/app/web-apps/stock-screener/tickers';
import { num, pct, round, chunk } from './utils';

const FMP = 'https://financialmodelingprep.com';

interface FmpQuote {
  symbol?: string;
  name?: string;
  price?: number;
  pe?: number;
  marketCap?: number;
  yearHigh?: number;
  yearLow?: number;
  volume?: number;
  avgVolume?: number;
  beta?: number;
}

interface FmpRatios {
  priceToEarningsRatio?: number;
  priceToEarningsGrowthRatio?: number;
  priceToBookRatio?: number;
  priceToSalesRatio?: number;
  priceToFreeCashFlowRatio?: number;
  enterpriseValueMultiple?: number;
  debtToEquityRatio?: number;
  debtToAssetsRatio?: number;
  currentRatio?: number;
  quickRatio?: number;
  interestCoverageRatio?: number;
  dividendYield?: number;
  payoutRatio?: number;
  freeCashFlowYield?: number;
  netProfitMargin?: number;
  grossProfitMargin?: number;
  operatingProfitMargin?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  returnOnCapitalEmployed?: number;
}

async function fmpGet<T>(path: string, apiKey: string): Promise<T | null> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${FMP}${path}${sep}apikey=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data as T;
  } catch {
    return null;
  }
}

function mapFmpToStock(
  entry: TickerEntry,
  quote: FmpQuote,
  ratios: FmpRatios | null,
): Stock {
  const price = num(quote.price, 0);
  const high52 = num(quote.yearHigh, 0);
  const low52 = num(quote.yearLow, 0);
  const marketCapRaw = num(quote.marketCap, 0);
  const marketCap = marketCapRaw > 1e9 ? Math.round(marketCapRaw / 1e6) : Math.round(marketCapRaw);

  const peRatio = num(ratios?.priceToEarningsRatio ?? quote.pe, 0);
  const epsGrowth = 0;
  const pegRatio = num(ratios?.priceToEarningsGrowthRatio, 0);

  return {
    ticker: entry.symbol,
    companyName: quote.name ?? entry.name,
    sector: entry.sector,
    peRatio: round(peRatio, 1),
    forwardPe: 0,
    pegRatio: round(pegRatio, 1),
    pbRatio: round(num(ratios?.priceToBookRatio, 0), 1),
    psRatio: round(num(ratios?.priceToSalesRatio, 0), 1),
    pcfRatio: round(num(ratios?.priceToFreeCashFlowRatio, 0), 1),
    evToEbitda: round(num(ratios?.enterpriseValueMultiple, 0), 1),
    epsGrowth,
    revenueGrowth: 0,
    profitMargin: pct(ratios?.netProfitMargin),
    grossMargin: pct(ratios?.grossProfitMargin),
    operatingMargin: pct(ratios?.operatingProfitMargin),
    roe: pct(ratios?.returnOnEquity),
    roa: pct(ratios?.returnOnAssets),
    roic: pct(ratios?.returnOnCapitalEmployed),
    debtToEquity: round(num(ratios?.debtToEquityRatio, 0), 2),
    debtToAssets: pct(ratios?.debtToAssetsRatio),
    currentRatio: round(num(ratios?.currentRatio, 0), 1),
    quickRatio: round(num(ratios?.quickRatio, 0), 1),
    interestCoverage: round(num(ratios?.interestCoverageRatio, 0), 1),
    dividendYield: pct(ratios?.dividendYield),
    payoutRatio: pct(ratios?.payoutRatio),
    freeCashFlowYield: pct(ratios?.freeCashFlowYield),
    price: round(price, 2),
    marketCap,
    priceChange1m: 0,
    priceChange3m: 0,
    priceChange6m: 0,
    priceChange52w: 0,
    priceVs52wHigh: high52 > 0 ? round(((price - high52) / high52) * 100, 1) : 0,
    priceVs52wLow: low52 > 0 ? round(((price - low52) / low52) * 100, 1) : 0,
    avgVolume: round(num(quote.avgVolume, 0) / 1_000_000, 1),
    volatility30d: 0,
    atrPercent: 0,
    beta: round(num(quote.beta, 0), 2),
  };
}

export async function fetchStocksFromFmp(
  entries: TickerEntry[],
  apiKey: string,
): Promise<Stock[]> {
  const symbols = entries.map(e => e.symbol.replace(/-/g, '.'));
  const bySymbol = new Map(entries.map(e => [e.symbol.replace(/-/g, '.'), e]));

  const quoteBatches = chunk(symbols, 40);
  const allQuotes: FmpQuote[] = [];

  for (const batch of quoteBatches) {
    const data = await fmpGet<FmpQuote[]>(
      `/api/v3/quote/${batch.map(encodeURIComponent).join(',')}`,
      apiKey,
    );
    if (Array.isArray(data)) allQuotes.push(...data);
    await new Promise(r => setTimeout(r, 250));
  }

  const stocks: Stock[] = [];

  for (const quote of allQuotes) {
    const sym = quote.symbol;
    if (!sym) continue;
    const entry = bySymbol.get(sym) ?? bySymbol.get(sym.replace('.', '-'));
    if (!entry) continue;

    const ratios = await fmpGet<FmpRatios[]>(
      `/api/v3/ratios-ttm/${encodeURIComponent(sym)}`,
      apiKey,
    );
    const ratio = Array.isArray(ratios) ? ratios[0] ?? null : null;
    stocks.push(mapFmpToStock(entry, quote, ratio));
    await new Promise(r => setTimeout(r, 120));
  }

  return stocks;
}

/** Lighter FMP path: batch quotes only (~3 API calls). Fewer fundamentals, good for rate limits. */
export async function fetchStocksFromFmpQuotesOnly(
  entries: TickerEntry[],
  apiKey: string,
): Promise<Stock[]> {
  const symbols = entries.map(e => e.symbol.replace(/-/g, '.'));
  const bySymbol = new Map(entries.map(e => [e.symbol.replace(/-/g, '.'), e]));
  const quoteBatches = chunk(symbols, 40);
  const stocks: Stock[] = [];

  for (const batch of quoteBatches) {
    const data = await fmpGet<FmpQuote[]>(
      `/api/v3/quote/${batch.map(encodeURIComponent).join(',')}`,
      apiKey,
    );
    if (!Array.isArray(data)) continue;
    for (const quote of data) {
      const sym = quote.symbol;
      if (!sym) continue;
      const entry = bySymbol.get(sym) ?? bySymbol.get(sym.replace('.', '-'));
      if (!entry) continue;
      stocks.push(mapFmpToStock(entry, quote, null));
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return stocks;
}
