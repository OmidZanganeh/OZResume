import type { Stock } from '@/app/tools/stock-screener/types';
import { SCREEN_TICKERS } from '@/app/tools/stock-screener/tickers';
import { MOCK_STOCKS } from '@/app/tools/stock-screener/mockStocks';
import { fetchStocksFromFinnhub } from './finnhub';
import { fetchStocksFromFmpQuotesOnly } from './fmp';
import {
  FRESH_TTL_MS,
  readRedisSnapshot,
  writeRedisSnapshot,
  type MarketDataResult,
} from './cache';

export type { MarketDataResult };

const MEMORY_TTL_MS = FRESH_TTL_MS;

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
        fromCache: false,
        expiresAt: new Date(Date.now() + FRESH_TTL_MS).toISOString(),
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
        fromCache: false,
        expiresAt: new Date(Date.now() + FRESH_TTL_MS).toISOString(),
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
    fromCache: false,
    warning: !finnhubKey && !fmpKey
      ? 'No API key configured — showing demo data. Set FINNHUB_API_KEY in .env.local.'
      : 'Live API fetch failed — showing demo data.',
  };
}

function fromMemory(): MarketDataResult | null {
  if (!memoryCache || memoryCache.expiresAt <= Date.now()) return null;
  return { ...memoryCache.result, fromCache: true };
}

function remember(result: MarketDataResult) {
  memoryCache = {
    result: { ...result, fromCache: true },
    expiresAt: Date.now() + MEMORY_TTL_MS,
  };
}

async function persist(result: MarketDataResult) {
  remember(result);
  if (result.source !== 'mock') {
    await writeRedisSnapshot(result);
  }
}

export async function getMarketStocks(options?: { force?: boolean }): Promise<MarketDataResult> {
  const force = options?.force ?? false;

  if (!force) {
    const mem = fromMemory();
    if (mem) return mem;

    const redisHit = await readRedisSnapshot();
    if (redisHit?.fresh) {
      const { expiresAt, ...rest } = redisHit.data;
      const result: MarketDataResult = { ...rest, fromCache: true, expiresAt };
      remember(result);
      return result;
    }
  }

  if (!inflight) {
    inflight = (async () => {
      try {
        const fresh = await loadFresh();
        if (fresh.source !== 'mock') {
          await persist(fresh);
          return { ...fresh, fromCache: false };
        }

        // Live fetch failed — serve stale Redis if we have it
        const stale = await readRedisSnapshot();
        if (stale) {
          const { expiresAt, ...rest } = stale.data;
          return {
            ...rest,
            fromCache: true,
            expiresAt,
            warning: fresh.warning ?? 'Serving cached market data — live refresh failed.',
          };
        }

        remember(fresh);
        return fresh;
      } finally {
        inflight = null;
      }
    })();
  }

  return inflight;
}
