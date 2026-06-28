import type { Stock, Sector, WeeklyBar } from '../types';
import type { TableRow } from '../StockTable';
import { barForDaysAgo } from '../weeklyLookup';
import { daysAgoToDate } from '../timelineDate';

export interface TimeValue {
  time: number;
  value: number;
}

export interface SparklineData {
  path: string;
  changePct: number;
  width: number;
  height: number;
}

/** Weekly bars oldest → newest (chart-friendly). */
export function barsAscending(bars: WeeklyBar[]): WeeklyBar[] {
  return [...bars].reverse();
}

/** Slice of weekly history ending at daysAgo → today (ascending). */
export function weeklySliceFromDaysAgo(stock: Stock, daysAgo: number): WeeklyBar[] {
  const hist = stock.weeklyHistory;
  if (!hist?.length) return [];
  const hit = barForDaysAgo(hist, daysAgo);
  if (!hit) return [];
  return hist.slice(0, hit.idx + 1).reverse();
}

export function weeklySliceWeeks(stock: Stock, weeks: number): WeeklyBar[] {
  const hist = stock.weeklyHistory;
  if (!hist?.length) return [];
  return barsAscending(hist.slice(0, weeks));
}

export function sparklineFromBars(bars: WeeklyBar[], weeks = 52): SparklineData | null {
  if (!bars.length) return null;
  const slice = bars.length > weeks ? bars.slice(-weeks) : bars;
  if (slice.length < 2) return null;

  const prices = slice.map(b => b.c);
  const first = prices[0]!;
  const last = prices[prices.length - 1]!;
  const changePct = ((last - first) / first) * 100;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const width = 80;
  const height = 26;

  const coords = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return {
    path: `M ${coords.join(' L ')}`,
    changePct,
    width,
    height,
  };
}

export function priceSeriesFromBars(bars: WeeklyBar[]): TimeValue[] {
  return bars.map(b => ({ time: b.t, value: b.c }));
}

/** Rebased to 100 at first bar. */
export function normalizedSeries(bars: WeeklyBar[]): TimeValue[] {
  if (bars.length < 2) return [];
  const base = bars[0]!.c;
  if (base <= 0) return [];
  return bars.map(b => ({ time: b.t, value: (b.c / base) * 100 }));
}

export function nearestBarTime(hist: WeeklyBar[], daysAgo: number): number | null {
  const hit = barForDaysAgo(hist, daysAgo);
  if (!hit) return null;
  return hist[hit.idx]?.t ?? null;
}

export interface CumulativePoint {
  time: number;
  label: string;
  matched?: number;
  universe?: number;
}

/** Equal-weight cumulative return paths (rebased 100) for backtest visualization. */
export function buildCumulativeBacktestSeries(
  stocks: Stock[],
  daysAgo: number,
  matchedTickers: Set<string>,
): CumulativePoint[] {
  if (daysAgo <= 0) return [];

  type Entry = { bars: WeeklyBar[]; base: number; matched: boolean };
  const entries: Entry[] = [];

  for (const stock of stocks) {
    const slice = weeklySliceFromDaysAgo(stock, daysAgo);
    if (slice.length < 2) continue;
    entries.push({
      bars: slice,
      base: slice[0]!.c,
      matched: matchedTickers.has(stock.ticker),
    });
  }

  if (!entries.length) return [];

  const maxLen = Math.max(...entries.map(e => e.bars.length));
  const points: CumulativePoint[] = [];

  for (let wi = 0; wi < maxLen; wi++) {
    let uSum = 0;
    let uCount = 0;
    let mSum = 0;
    let mCount = 0;
    let time = 0;

    for (const e of entries) {
      if (wi >= e.bars.length) continue;
      const bar = e.bars[wi]!;
      time = bar.t;
      const idx = (bar.c / e.base) * 100;
      uSum += idx;
      uCount += 1;
      if (e.matched) {
        mSum += idx;
        mCount += 1;
      }
    }

    if (uCount === 0) continue;
    const d = new Date(time * 1000);
    points.push({
      time,
      label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      universe: Math.round((uSum / uCount) * 10) / 10,
      matched: mCount > 0 ? Math.round((mSum / mCount) * 10) / 10 : undefined,
    });
  }

  return points;
}

export interface SectorAggregate {
  sector: Sector;
  count: number;
  avgReturn52w: number;
  avgPe: number;
  totalCapB: number;
  pctOfCount: number;
}

export function aggregateBySector(
  rows: TableRow[],
  filteredOnly: boolean,
): SectorAggregate[] {
  const pool = filteredOnly ? rows.filter(r => r.visible) : rows;
  const map = new Map<Sector, { count: number; retSum: number; peSum: number; peN: number; cap: number }>();

  for (const row of pool) {
    const sector = row.stock.sector;
    let bucket = map.get(sector);
    if (!bucket) {
      bucket = { count: 0, retSum: 0, peSum: 0, peN: 0, cap: 0 };
      map.set(sector, bucket);
    }
    bucket.count += 1;
    bucket.cap += row.stock.marketCap || 0;
    const r52 = row.stock.priceChange52w;
    if (Number.isFinite(r52)) bucket.retSum += r52;
    const pe = row.snapshot.peRatio;
    if (Number.isFinite(pe) && pe > 0) {
      bucket.peSum += pe;
      bucket.peN += 1;
    }
  }

  const total = pool.length || 1;
  return [...map.entries()]
    .map(([sector, b]) => ({
      sector,
      count: b.count,
      avgReturn52w: b.count ? b.retSum / b.count : 0,
      avgPe: b.peN ? b.peSum / b.peN : 0,
      totalCapB: b.cap,
      pctOfCount: (b.count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface ScatterPoint {
  ticker: string;
  sector: Sector;
  pe: number;
  return52w: number;
  marketCapB: number;
}

export function scatterPeVsReturn(rows: TableRow[], filteredOnly: boolean): ScatterPoint[] {
  const pool = filteredOnly ? rows.filter(r => r.visible) : rows;
  return pool
    .map(row => {
      const pe = row.snapshot.peRatio;
      const ret = row.stock.priceChange52w;
      if (!Number.isFinite(pe) || pe <= 0 || !Number.isFinite(ret)) return null;
      return {
        ticker: row.stock.ticker,
        sector: row.stock.sector,
        pe: pe,
        return52w: ret,
        marketCapB: row.stock.marketCap,
      };
    })
    .filter((p): p is ScatterPoint => p != null);
}

export function formatChartDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function weeksBackFromDays(days: number): number {
  return Math.max(4, Math.ceil(days / 7) + 2);
}
