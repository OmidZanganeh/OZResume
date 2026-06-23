import type { Stock } from '@/app/tools/stock-screener/types';
import { SCREEN_TICKERS } from '@/app/tools/stock-screener/tickers';
import { MOCK_STOCKS } from '@/app/tools/stock-screener/mockStocks';
import { fetchStocksFromFinnhub } from './finnhub';
import { fetchStocksFromFmpQuotesOnly } from './fmp';

export interface MarketDataResult {
  stocks: Stock[];
  source: 'finnhub' | 'fmp' | 'mock';
  cachedAt: string;
  warning?: string;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — one refresh ≈ 4×/day

let memoryCache: { result: MarketDataResult; expiresAt: number } | null = null;
let inflight: Promise<MarketDataResult> | null = null;

async function loadFresh(): Promise<MarketDataResult> {
  const finnhubKey = process.env.FINNHUB_API_KEY?.trim();
  const fmpKey = process.env.FMP_API_KEY?.trim();

  if (finnhubKey) {
    const stocks = await fetchStocksFromFinnhub(SCREEN_TICKERS, finnhubKey);
    if (stocks.length >= 50) {
      return {
        stocks,
        source: 'finnhub',
        cachedAt: new Date().toISOString(),
      };
    }
  }

  if (fmpKey) {
    const stocks = await fetchStocksFromFmpQuotesOnly(SCREEN_TICKERS, fmpKey);
    if (stocks.length >= 50) {
      return {
        stocks,
        source: 'fmp',
        cachedAt: new Date().toISOString(),
        warning: finnhubKey
          ? 'Finnhub fetch incomplete — using FMP batch quotes (approx. RSI & some ratios).'
          : 'Using FMP batch quotes only to stay within free-tier limits. Add FINNHUB_API_KEY for full fundamentals + RSI.',
      };
    }
  }

  const techFinanceMock = MOCK_STOCKS.filter(s => s.sector === 'Tech' || s.sector === 'Finance');
  return {
    stocks: techFinanceMock.length > 0 ? techFinanceMock : MOCK_STOCKS,
    source: 'mock',
    cachedAt: new Date().toISOString(),
    warning: !finnhubKey && !fmpKey
      ? 'No API key configured — showing demo data. Set FINNHUB_API_KEY or FMP_API_KEY in .env.local.'
      : 'Live API fetch failed — showing demo data.',
  };
}

export async function getMarketStocks(): Promise<MarketDataResult> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.result;
  }

  if (!inflight) {
    inflight = loadFresh()
      .then(result => {
        memoryCache = { result, expiresAt: Date.now() + CACHE_TTL_MS };
        return result;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
