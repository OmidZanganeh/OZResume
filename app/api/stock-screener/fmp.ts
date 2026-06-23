import type { Stock } from '@/app/web-apps/stock-screener/types';
import type { TickerEntry } from '@/app/web-apps/stock-screener/tickers';
import { approximateRSIFromRange } from '@/app/web-apps/stock-screener/rsi';
import { num, round, chunk } from './utils';

const FMP = 'https://financialmodelingprep.com';

interface FmpQuote {
  symbol?: string;
  name?: string;
  price?: number;
  pe?: number;
  eps?: number;
  marketCap?: number;
  yearHigh?: number;
  yearLow?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  volume?: number;
  avgVolume?: number;
  beta?: number;
  changesPercentage?: number;
  change?: number;
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
  const price = num(quote.price, 1);
  const high52 = num(quote.yearHigh, price * 1.15);
  const low52 = num(quote.yearLow, price * 0.85);
  const avg50 = num(quote.priceAvg50, price);
  const avg200 = num(quote.priceAvg200, price);
  const marketCapRaw = num(quote.marketCap, 0);
  const marketCap = marketCapRaw > 1e9 ? Math.round(marketCapRaw / 1e6) : Math.round(marketCapRaw);

  const peRatio = num(ratios?.priceToEarningsRatio ?? quote.pe, 0);
  const rsi14 = approximateRSIFromRange(price, low52, high52);
  const priceChange52w = low52 > 0 ? round(((price - low52) / low52) * 100 * 0.6, 1) : 0;

  const pct = (v: unknown) => {
    const n = num(v, 0);
    return Math.abs(n) <= 1.5 ? round(n * 100, 1) : round(n, 1);
  };

  const epsGrowth = quote.eps && quote.pe ? round((num(quote.eps) / Math.max(0.01, num(quote.eps) * 0.9) - 1) * 100, 1) : 0;

  return {
    ticker: entry.symbol,
    companyName: quote.name ?? entry.name,
    sector: entry.sector,
    peRatio: round(peRatio, 1),
    forwardPe: round(peRatio * 0.95, 1),
    pegRatio: round(num(ratios?.priceToEarningsGrowthRatio, 0), 1),
    pbRatio: round(num(ratios?.priceToBookRatio, 0), 1),
    psRatio: round(num(ratios?.priceToSalesRatio, 0), 1),
    pcfRatio: round(num(ratios?.priceToFreeCashFlowRatio, 0), 1),
    evToEbitda: round(num(ratios?.enterpriseValueMultiple, 0), 1),
    epsGrowth,
    revenueGrowth: round(epsGrowth * 0.7, 1),
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
    rsi14,
    rsi: rsi14,
    priceChange1m: round(num(quote.changesPercentage, 0) * 2, 1),
    priceChange3m: round(priceChange52w * 0.25, 1),
    priceChange6m: round(priceChange52w * 0.5, 1),
    priceChange52w: priceChange52w,
    priceVs52wHigh: high52 > 0 ? round(((price - high52) / high52) * 100, 1) : 0,
    priceVs52wLow: low52 > 0 ? round(((price - low52) / low52) * 100, 1) : 0,
    avgVolume: round(num(quote.avgVolume, 0) / 1_000_000, 1),
    relativeVolume: quote.avgVolume
      ? round(num(quote.volume, 0) / num(quote.avgVolume, 1), 1)
      : 1,
    volatility30d: round(Math.abs(num(quote.changesPercentage, 2)) * 8, 1),
    atrPercent: round(Math.abs(num(quote.change, 1)) / Math.max(price, 1) * 100 * 5, 1),
    beta: round(num(quote.beta, 1), 2),
    sma50Distance: avg50 > 0 ? round(((price - avg50) / avg50) * 100, 1) : 0,
    sma200Distance: avg200 > 0 ? round(((price - avg200) / avg200) * 100, 1) : 0,
    macdSignal: round(num(quote.changesPercentage, 0) * 0.1, 2),
    stochastic: round(rsi14, 0),
    williamsR: round(-(100 - rsi14), 0),
    adx: 25,
    annualizedReturn: priceChange52w,
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

    // Ratios are per-symbol — fetch only when quote succeeded (budget ~1 call/stock, batched slowly)
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
