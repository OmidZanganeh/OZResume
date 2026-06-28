'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { X, Plus } from 'lucide-react';
import type { TableRow } from '../StockTable';
import type { Stock } from '../types';
import {
  normalizedSeries,
  weeklySliceWeeks,
  weeklySliceFromDaysAgo,
  buildCumulativeBacktestSeries,
} from '../charts/chartSeries';
import { CHART, COMPARE_PALETTE } from '../charts/chartTheme';
import chartStyles from '../charts/Charts.module.css';

const RANGE_OPTIONS = [
  { id: '52', label: '1Y', weeks: 52 },
  { id: '156', label: '3Y', weeks: 156 },
  { id: '260', label: '5Y', weeks: 260 },
  { id: '520', label: '10Y', weeks: 520 },
  { id: 'screen', label: 'Since screen', weeks: 0 },
] as const;

type RangeId = (typeof RANGE_OPTIONS)[number]['id'];

interface Props {
  rows: TableRow[];
  compareTickers: string[];
  onCompareChange: (tickers: string[]) => void;
  daysAgo: number;
  stocks: Stock[];
  matchedTickers: Set<string>;
  universeLabel: string;
}

function mergeNormalizedSeries(
  tickers: string[],
  stocks: Stock[],
  weeks: number,
  daysAgo: number,
  useScreen: boolean,
): { label: string; [key: string]: string | number }[] {
  const seriesMap = new Map<string, { time: number; value: number }[]>();

  for (const ticker of tickers) {
    const stock = stocks.find(s => s.ticker === ticker);
    if (!stock?.weeklyHistory?.length) continue;
    const bars = useScreen
      ? weeklySliceFromDaysAgo(stock, daysAgo)
      : weeklySliceWeeks(stock, weeks);
    seriesMap.set(ticker, normalizedSeries(bars));
  }

  if (seriesMap.size === 0) return [];

  const timeSet = new Set<number>();
  for (const pts of seriesMap.values()) {
    for (const p of pts) timeSet.add(p.time);
  }
  const times = [...timeSet].sort((a, b) => a - b);

  return times.map(time => {
    const d = new Date(time * 1000);
    const row: { label: string; [key: string]: string | number } = {
      label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    };
    for (const [ticker, pts] of seriesMap) {
      const hit = pts.find(p => p.time === time);
      if (hit) row[ticker] = Math.round(hit.value * 10) / 10;
    }
    return row;
  });
}

export default function CompareView({
  rows,
  compareTickers,
  onCompareChange,
  daysAgo,
  stocks,
  matchedTickers,
  universeLabel,
}: Props) {
  const [range, setRange] = useState<RangeId>(daysAgo > 0 ? 'screen' : '260');

  const pool = useMemo(() => rows.filter(r => r.visible), [rows]);

  const rangeWeeks = RANGE_OPTIONS.find(r => r.id === range)?.weeks ?? 260;
  const useScreen = range === 'screen' && daysAgo > 0;

  const chartData = useMemo(
    () =>
      mergeNormalizedSeries(
        compareTickers,
        stocks,
        rangeWeeks,
        daysAgo,
        useScreen,
      ),
    [compareTickers, stocks, rangeWeeks, daysAgo, useScreen],
  );

  const benchmark = useMemo(() => {
    if (compareTickers.length === 0) return [];
    const pts = buildCumulativeBacktestSeries(stocks, useScreen ? daysAgo : 0, matchedTickers);
    if (!useScreen && rangeWeeks > 0) {
      const cutoff = chartData[0]?.label;
      return pts.filter((_, i) => i >= pts.length - rangeWeeks || !cutoff);
    }
    return pts;
  }, [stocks, daysAgo, matchedTickers, useScreen, rangeWeeks, compareTickers.length, chartData]);

  const addTicker = (ticker: string) => {
    if (compareTickers.includes(ticker)) return;
    if (compareTickers.length >= 5) return;
    onCompareChange([...compareTickers, ticker]);
  };

  const removeTicker = (ticker: string) => {
    onCompareChange(compareTickers.filter(t => t !== ticker));
  };

  const suggest = pool
    .filter(r => !compareTickers.includes(r.stock.ticker))
    .slice(0, 8);

  return (
    <div className={chartStyles.compareLayout}>
      <div className={chartStyles.compareToolbar}>
        <div className={chartStyles.compareChips}>
          {compareTickers.length === 0 && (
            <span className={chartStyles.compareHint}>Pick up to 5 tickers — rebased to 100 at start</span>
          )}
          {compareTickers.map((t, i) => (
            <span
              key={t}
              className={chartStyles.compareChip}
              style={{ borderColor: COMPARE_PALETTE[i % COMPARE_PALETTE.length] }}
            >
              <span style={{ color: COMPARE_PALETTE[i % COMPARE_PALETTE.length] }}>{t}</span>
              <button
                type="button"
                className={chartStyles.compareChipRemove}
                onClick={() => removeTicker(t)}
                aria-label={`Remove ${t}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className={chartStyles.rangePills}>
          {RANGE_OPTIONS.map(opt => {
            if (opt.id === 'screen' && daysAgo <= 0) return null;
            return (
              <button
                key={opt.id}
                type="button"
                className={`${chartStyles.rangePill} ${range === opt.id ? chartStyles.rangePillActive : ''}`}
                onClick={() => setRange(opt.id)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {suggest.length > 0 && compareTickers.length < 5 && (
        <div className={chartStyles.compareSuggest}>
          <span className={chartStyles.compareSuggestLabel}>Add from filter:</span>
          {suggest.map(row => (
            <button
              key={row.stock.ticker}
              type="button"
              className={chartStyles.compareSuggestBtn}
              onClick={() => addTicker(row.stock.ticker)}
            >
              <Plus size={12} />
              {row.stock.ticker}
            </button>
          ))}
        </div>
      )}

      <div className={chartStyles.chartPanel}>
        <h3 className={chartStyles.panelTitle}>Normalized price (100 = start)</h3>
        <div className={chartStyles.panelChart} style={{ height: 360 }}>
          {compareTickers.length === 0 ? (
            <p className={chartStyles.viewEmpty}>
              Add tickers from the suggestions above or click ★ then open Compare.
            </p>
          ) : chartData.length < 2 ? (
            <p className={chartStyles.viewEmpty}>Weekly history missing for selected tickers.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: CHART.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART.grid }}
                  interval={Math.max(0, Math.floor(chartData.length / 10))}
                />
                <YAxis
                  tick={{ fill: CHART.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART.grid }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    background: '#121820',
                    border: `1px solid ${CHART.grid}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: CHART.text }} />
                <ReferenceLine y={100} stroke={CHART.grid} strokeDasharray="4 4" />
                {compareTickers.map((t, i) => (
                  <Line
                    key={t}
                    type="monotone"
                    dataKey={t}
                    stroke={COMPARE_PALETTE[i % COMPARE_PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {daysAgo > 0 && benchmark.length > 1 && compareTickers.length > 0 && (
        <div className={chartStyles.chartPanel}>
          <h3 className={chartStyles.panelTitle}>Filter basket vs {universeLabel}</h3>
          <p className={chartStyles.panelSub}>
            Equal-weight cumulative return since screen date — same logic as backtest stats.
          </p>
          <div className={chartStyles.panelChart} style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchmark} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: CHART.text, fontSize: 11 }}
                  interval={Math.max(0, Math.floor(benchmark.length / 8))}
                />
                <YAxis tick={{ fill: CHART.text, fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: '#121820',
                    border: `1px solid ${CHART.grid}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: CHART.text }} />
                <ReferenceLine y={100} stroke={CHART.grid} strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="universe"
                  name={universeLabel}
                  stroke={CHART.benchmark}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="matched"
                  name="Filter basket"
                  stroke={CHART.accent2}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
