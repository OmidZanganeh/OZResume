import type { Stock } from '@/app/web-apps/stock-screener/types';
import { enrichStockPriceVolatility } from '@/app/web-apps/stock-screener/priceVolatility';
import {
  enrichStockVolumeFromWeekly,
  liveAvgDailyVolumeM,
  weeklyBarsHaveVolume,
} from '@/app/web-apps/stock-screener/weeklyVolume';
import { fetchYahooWeeklyBars } from './weeklyPrices';
import { mapPool } from './utils';

export type VolumeEnrichResult = {
  stocks: Stock[];
  patches: Stock[];
};

/** Volume + vol/ATR from attached weekly history (Yahoo). */
export function enrichStockFromWeeklyHistory(stock: Stock): Stock {
  return enrichStockVolumeFromWeekly(enrichStockPriceVolatility(stock));
}

/** Fetch Yahoo weekly bars for symbols still missing volume and patch live (page-load hydrate). */
export async function enrichLiveYahooVolumeForStocks(
  stocks: Stock[],
  maxFetches = 24,
): Promise<VolumeEnrichResult> {
  const needs = stocks
    .filter(
      s =>
        (!s.avgVolume || s.avgVolume <= 0) &&
        (!s.weeklyHistory?.length || !weeklyBarsHaveVolume(s.weeklyHistory)),
    )
    .slice(0, maxFetches);

  if (needs.length === 0) {
    return { stocks: stocks.map(enrichStockFromWeeklyHistory), patches: [] };
  }

  const patches = new Map<string, Stock>();

  await mapPool(needs, 6, 50, async stock => {
    const bars = await fetchYahooWeeklyBars(stock.ticker, 3);
    if (!bars?.length || !weeklyBarsHaveVolume(bars)) return;
    const vol = liveAvgDailyVolumeM(bars);
    if (vol == null || vol <= 0) return;
    patches.set(stock.ticker, {
      ...stock,
      avgVolume: vol,
      weeklyHistory: bars,
    });
  });

  const patchedList = [...patches.values()];
  const enriched = stocks.map(s => {
    const patch = patches.get(s.ticker);
    if (!patch) return enrichStockFromWeeklyHistory(s);
    return enrichStockFromWeeklyHistory(patch);
  });

  return { stocks: enriched, patches: patchedList };
}

export async function patchStockAvgVolumeFromYahoo(stock: Stock): Promise<Stock> {
  if (stock.avgVolume > 0 && weeklyBarsHaveVolume(stock.weeklyHistory ?? [])) {
    return enrichStockVolumeFromWeekly(stock);
  }
  const bars = await fetchYahooWeeklyBars(stock.ticker, 3);
  if (!bars?.length) return stock;
  const vol = liveAvgDailyVolumeM(bars);
  if (vol == null || vol <= 0) return { ...stock, weeklyHistory: bars };
  return enrichStockFromWeeklyHistory({ ...stock, weeklyHistory: bars, avgVolume: vol });
}

export async function patchStocksAvgVolumeFromYahoo(
  stocks: Stock[],
  symbols: string[],
): Promise<Stock[]> {
  const symSet = new Set(symbols);
  const targets = stocks.filter(s => symSet.has(s.ticker));
  if (targets.length === 0) return stocks;

  const patched = new Map<string, Stock>();
  await mapPool(targets, 8, 80, async stock => {
    patched.set(stock.ticker, await patchStockAvgVolumeFromYahoo(stock));
  });

  return stocks.map(s => patched.get(s.ticker) ?? enrichStockFromWeeklyHistory(s));
}
