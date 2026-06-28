'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
} from 'lightweight-charts';
import { CHART } from './chartTheme';
import { formatChartDate, nearestBarTime, priceSeriesFromBars, weeklySliceWeeks } from './chartSeries';
import type { Stock } from '../types';
import chartStyles from './Charts.module.css';

interface Props {
  stock: Stock;
  daysAgo: number;
  weeks?: number;
  height?: number;
}

export default function PriceChart({ stock, daysAgo, weeks = 260, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { color: CHART.bg },
        textColor: CHART.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: CHART.grid },
        horzLines: { color: CHART.grid },
      },
      rightPriceScale: { borderColor: CHART.grid },
      timeScale: { borderColor: CHART.grid, timeVisible: true },
      crosshair: {
        vertLine: { color: CHART.crosshair },
        horzLine: { color: CHART.crosshair },
      },
    });

    const series = chart.addSeries(LineSeries, {
      color: CHART.accent,
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const bars = weeklySliceWeeks(stock, weeks);
    const data = priceSeriesFromBars(bars).map(p => ({
      time: p.time as import('lightweight-charts').UTCTimestamp,
      value: p.value,
    }));

    series.setData(data);

    const seriesMarkers = createSeriesMarkers(series, []);
    if (daysAgo > 0 && stock.weeklyHistory?.length) {
      const markerTime = nearestBarTime(stock.weeklyHistory, daysAgo);
      if (markerTime != null) {
        seriesMarkers.setMarkers([
          {
            time: markerTime as import('lightweight-charts').UTCTimestamp,
            position: 'aboveBar',
            color: CHART.marker,
            shape: 'circle',
            text: 'Screen date',
          },
        ]);
        chart.timeScale().scrollToPosition(-20, false);
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [stock.ticker, stock.weeklyHistory, daysAgo, weeks, height]);

  const last = stock.weeklyHistory?.[0]?.c ?? stock.price;
  const bars = weeklySliceWeeks(stock, weeks);
  const first = bars[0]?.c;
  const chg = first && first > 0 ? ((last - first) / first) * 100 : NaN;

  return (
    <div className={chartStyles.priceChartBlock}>
      <div className={chartStyles.priceChartMeta}>
        <span className={chartStyles.priceChartTicker}>{stock.ticker}</span>
        <span className={chartStyles.priceChartName}>{stock.companyName}</span>
        {Number.isFinite(chg) && (
          <span className={chg >= 0 ? chartStyles.statUp : chartStyles.statDown}>
            {chg >= 0 ? '+' : ''}{chg.toFixed(1)}% over chart range
          </span>
        )}
        {daysAgo > 0 && stock.weeklyHistory?.length ? (() => {
          const mt = nearestBarTime(stock.weeklyHistory, daysAgo);
          return (
            <span className={chartStyles.priceChartHint}>
              Marker = weekly bar at screen date
              {mt != null ? ` (${formatChartDate(mt)})` : ''}
            </span>
          );
        })() : null}
      </div>
      {!stock.weeklyHistory?.length ? (
        <div className={chartStyles.chartEmpty} style={{ height }}>
          Weekly price history not loaded yet.
        </div>
      ) : (
        <div ref={containerRef} className={chartStyles.priceChartCanvas} style={{ height }} />
      )}
    </div>
  );
}
