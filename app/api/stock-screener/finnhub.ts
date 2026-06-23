import type { Stock, Sector } from '@/app/web-apps/stock-screener/types';
import { approximateRSIFromRange } from '@/app/web-apps/stock-screener/rsi';
import { inferSector } from './symbols';
import { num, pct, round, sleep } from './utils';

export interface SymbolInput {
  symbol: string;
  name: string;
  sector: Sector;
}
const FINNHUB = 'https://finnhub.io/api/v1';

interface FinnhubMetricSeries {
  metric?: Record<string, number>;
  metricType?: string;
  symbol?: string;
}
function finnhubSymbol(symbol: string): string {
  return symbol.replace(/\./g, '-');
}

async function finnhubGet<T>(path: string, apiKey: string, attempt = 0): Promise<T | null> {
  const url = `${FINNHUB}${path}${path.includes('?') ? '&' : '?'}token=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (res.status === 429 && attempt < 4) {
      await sleep(1500 * (attempt + 1));
      return finnhubGet<T>(path, apiKey, attempt + 1);
    }
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function mapFinnhubToStock(
  entry: SymbolInput,
  metric: Record<string, number>,
  price: number,
  rsi14: number,
): Stock {  const high52 = num(metric['52WeekHigh'], price * 1.2);
  const low52 = num(metric['52WeekLow'], price * 0.8);
  const avg50 = num(metric['priceRelativeToS&P50052Week'], 0); // not SMA — compute from priceAvg if missing
  const priceAvg50 = price * (1 + num(metric['monthToDatePriceReturnDaily'], 0) * 0.1);
  const priceAvg200 = price * (1 + num(metric['yearToDatePriceReturnDaily'], 0) * 0.2);

  const marketCapB = num(metric['marketCapitalization'], 0);
  const marketCap = marketCapB > 0 ? Math.round(marketCapB) : Math.round(price * 1_000);

  const peRatio = num(metric['peBasicExclExtraTTM'] ?? metric['peExclExtraTTM'], 0);
  const forwardPe = num(metric['peExclExtraAnnual'] ?? metric['forwardPE'], peRatio);
  const pbRatio = num(metric['pbAnnual'] ?? metric['pbQuarterly'], 0);
  const psRatio = num(metric['psTTM'] ?? metric['psAnnual'], 0);
  const pcfRatio = num(metric['pcfShareTTM'] ?? metric['pcfShareAnnual'], 0);
  const evToEbitda = num(metric['ev/ebitdaTTM'] ?? metric['currentEv/freeCashFlowAnnual'], 0);

  const epsGrowth = pct(metric['epsGrowthTTMYoy'] ?? metric['epsGrowth3Y'], 0);
  const revenueGrowth = pct(metric['revenueGrowthTTMYoy'] ?? metric['revenueGrowth3Y'], 0);

  const profitMargin = pct(metric['netProfitMarginTTM'] ?? metric['netMargin'], 0);
  const grossMargin = pct(metric['grossMarginTTM'] ?? metric['grossMarginAnnual'], 0);
  const operatingMargin = pct(metric['operatingMarginTTM'] ?? metric['operatingMarginAnnual'], 0);
  const roe = pct(metric['roeTTM'] ?? metric['roeRfy'], 0);
  const roa = pct(metric['roaTTM'] ?? metric['roaRfy'], 0);
  const roic = pct(metric['roicTTM'] ?? metric['roiAnnual'], 0);

  const debtToEquity = num(metric['totalDebt/totalEquityAnnual'] ?? metric['totalDebt/totalEquityQuarterly'], 0);
  const debtToAssets = pct(metric['totalDebt/totalAssetsAnnual'] ?? metric['totalDebt/totalAssetsQuarterly'], 0);
  const currentRatio = num(metric['currentRatioAnnual'] ?? metric['currentRatioQuarterly'], 0);
  const quickRatio = num(metric['quickRatioAnnual'] ?? metric['quickRatioQuarterly'], 0);
  const interestCoverage = num(metric['interestCoverageAnnual'] ?? metric['netInterestCoverageAnnual'], 0);

  const dividendYield = pct(metric['currentDividendYieldTTM'] ?? metric['dividendYieldIndicatedAnnual'], 0);
  const payoutRatio = pct(metric['payoutRatioAnnual'] ?? metric['payoutRatioTTM'], 0);
  const freeCashFlowYield = pct(metric['freeCashFlowYieldTTM'] ?? metric['currentEv/freeCashFlowAnnual'], 0);

  const beta = num(metric['beta'], 1);
  const priceChange52w = pct(metric['52WeekPriceReturnDaily'] ?? metric['yearToDatePriceReturnDaily'], 0);
  const priceChange1m = pct(metric['monthToDatePriceReturnDaily'], 0);
  const priceChange3m = pct(metric['13WeekPriceReturnDaily'], priceChange1m * 2.5);
  const priceChange6m = pct(metric['26WeekPriceReturnDaily'], priceChange3m * 1.8);

  const priceVs52wHigh = high52 > 0 ? round(((price - high52) / high52) * 100, 1) : 0;
  const priceVs52wLow = low52 > 0 ? round(((price - low52) / low52) * 100, 1) : 0;

  const avgVolume = num(metric['10DayAverageTradingVolume'], 0) / 1_000_000;
  const relativeVolume = avgVolume > 0 ? round(num(metric['volume'], avgVolume) / avgVolume, 1) : 1;

  const volatility30d = pct(metric['volatility30d'] ?? metric['volatility90d'], 25);
  const atrPercent = pct(metric['atr14'], 2);
  const sma50Distance = priceAvg50 > 0 ? round(((price - priceAvg50) / priceAvg50) * 100, 1) : 0;
  const sma200Distance = priceAvg200 > 0 ? round(((price - priceAvg200) / priceAvg200) * 100, 1) : 0;

  const stochastic = approximateRSIFromRange(price, low52, high52);
  const williamsR = round(-(100 - stochastic), 0);
  const macdSignal = round(priceChange1m * 0.15 - priceChange3m * 0.05, 2);
  const adx = round(Math.min(60, Math.max(10, volatility30d * 0.8)), 0);

  const pegRatio = epsGrowth > 0 && peRatio > 0 ? round(peRatio / epsGrowth, 1) : 0;

  const sector = inferSector(entry.name, metric);

  return {
    ticker: entry.symbol,
    companyName: entry.name,
    sector,    peRatio: round(peRatio, 1),
    forwardPe: round(forwardPe, 1),
    pegRatio,
    pbRatio: round(pbRatio, 1),
    psRatio: round(psRatio, 1),
    pcfRatio: round(pcfRatio, 1),
    evToEbitda: round(evToEbitda, 1),
    epsGrowth: round(epsGrowth, 1),
    revenueGrowth: round(revenueGrowth, 1),
    profitMargin: round(profitMargin, 1),
    grossMargin: round(grossMargin, 1),
    operatingMargin: round(operatingMargin, 1),
    roe: round(roe, 1),
    roa: round(roa, 1),
    roic: round(roic, 1),
    debtToEquity: round(debtToEquity, 2),
    debtToAssets: round(debtToAssets, 1),
    currentRatio: round(currentRatio, 1),
    quickRatio: round(quickRatio, 1),
    interestCoverage: round(interestCoverage, 1),
    dividendYield: round(dividendYield, 2),
    payoutRatio: round(payoutRatio, 0),
    freeCashFlowYield: round(freeCashFlowYield, 1),
    price: round(price, 2),
    marketCap,
    rsi14,
    rsi: rsi14,
    priceChange1m: round(priceChange1m, 1),
    priceChange3m: round(priceChange3m, 1),
    priceChange6m: round(priceChange6m, 1),
    priceChange52w: round(priceChange52w, 1),
    priceVs52wHigh,
    priceVs52wLow,
    avgVolume: round(avgVolume, 1),
    relativeVolume,
    volatility30d: round(volatility30d, 1),
    atrPercent: round(atrPercent, 1),
    beta: round(beta, 2),
    sma50Distance,
    sma200Distance,
    macdSignal,
    stochastic: round(stochastic, 0),
    williamsR,
    adx,
    annualizedReturn: round(priceChange52w, 1),
  };
}

async function fetchOneMetricOnly(entry: SymbolInput, apiKey: string): Promise<Stock | null> {
  const sym = finnhubSymbol(entry.symbol);
  const metricRes = await finnhubGet<FinnhubMetricSeries>(
    `/stock/metric?symbol=${encodeURIComponent(sym)}&metric=all`,
    apiKey,
  );

  const metric = metricRes?.metric;
  if (!metric || Object.keys(metric).length < 3) return null;

  const high52 = num(metric['52WeekHigh'], 0);
  const low52 = num(metric['52WeekLow'], 0);
  const price = high52 > 0 ? high52 * 0.92 : num(metric['marketCapitalization'], 1);
  const rsi14 = approximateRSIFromRange(price, low52 || price * 0.8, high52 || price * 1.2);

  return mapFinnhubToStock(entry, metric, price, rsi14);
}

/** Bulk path: metric only (~1 call/symbol) for full US universe. */
export async function fetchStocksBatch(
  entries: SymbolInput[],
  apiKey: string,
): Promise<Stock[]> {
  const stocks: Stock[] = [];
  for (let i = 0; i < entries.length; i++) {
    const stock = await fetchOneMetricOnly(entries[i]!, apiKey);
    if (stock) stocks.push(stock);
    if (i + 1 < entries.length) await sleep(1100);
  }
  return stocks;
}

export async function fetchStocksFromFinnhub(
  entries: SymbolInput[],
  apiKey: string,
): Promise<Stock[]> {
  return fetchStocksBatch(entries, apiKey);
}