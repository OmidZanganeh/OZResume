'use client';

import { useMemo, useState } from 'react';
import { Search, TrendingUp, BarChart2 } from 'lucide-react';
import type { TableRow } from '../StockTable';
import type { Stock } from '../types';
import PriceChart from '../charts/PriceChart';
import { formatMarketCap } from '../metricFormat';
import { returnColor, CHART } from '../charts/chartTheme';
import chartStyles from '../charts/Charts.module.css';

interface Props {
  rows: TableRow[];
  selectedTicker: string | null;
  onSelectTicker: (ticker: string) => void;
  daysAgo: number;
  onEnsureWeekly?: (ticker: string) => void;
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className={chartStyles.statCard}>
      <span className={chartStyles.statLabel}>{label}</span>
      <span
        className={
          tone === 'up'
            ? chartStyles.statUp
            : tone === 'down'
              ? chartStyles.statDown
              : chartStyles.statValue
        }
      >
        {value}
      </span>
      {sub && <span className={chartStyles.statSub}>{sub}</span>}
    </div>
  );
}

export default function ChartsView({
  rows,
  selectedTicker,
  onSelectTicker,
  daysAgo,
  onEnsureWeekly,
}: Props) {
  const [listQuery, setListQuery] = useState('');

  const pool = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    let list = rows.filter(r => r.visible);
    if (q) {
      list = list.filter(
        r =>
          r.stock.ticker.toLowerCase().includes(q) ||
          r.stock.companyName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, listQuery]);

  const stock: Stock | null = useMemo(() => {
    const t = selectedTicker ?? pool[0]?.stock.ticker;
    if (!t) return null;
    return rows.find(r => r.stock.ticker === t)?.stock ?? null;
  }, [rows, selectedTicker, pool]);

  const snapshot = useMemo(() => {
    if (!stock) return null;
    return rows.find(r => r.stock.ticker === stock.ticker)?.snapshot ?? null;
  }, [rows, stock]);

  const handlePick = (ticker: string) => {
    onSelectTicker(ticker);
    onEnsureWeekly?.(ticker);
  };

  if (rows.length === 0) {
    return <p className={chartStyles.viewEmpty}>Load universe data to view charts.</p>;
  }

  return (
    <div className={chartStyles.chartsLayout}>
      <aside className={chartStyles.chartPicker}>
        <div className={chartStyles.chartPickerHead}>
          <BarChart2 size={15} />
          <span>Filtered stocks</span>
          <span className={chartStyles.chartPickerCount}>{pool.length}</span>
        </div>
        <div className={chartStyles.chartSearch}>
          <Search size={14} className={chartStyles.chartSearchIcon} aria-hidden />
          <input
            type="search"
            className={chartStyles.chartSearchInput}
            placeholder="Filter list…"
            value={listQuery}
            onChange={e => setListQuery(e.target.value)}
            aria-label="Filter chart stock list"
          />
        </div>
        <ul className={chartStyles.chartPickerList}>
          {pool.slice(0, 120).map(row => {
            const active = stock?.ticker === row.stock.ticker;
            const chg = row.stock.priceChange52w;
            return (
              <li key={row.stock.ticker}>
                <button
                  type="button"
                  className={`${chartStyles.chartPickerItem} ${active ? chartStyles.chartPickerItemActive : ''}`}
                  onClick={() => handlePick(row.stock.ticker)}
                >
                  <span className={chartStyles.chartPickerTicker}>{row.stock.ticker}</span>
                  <span className={chartStyles.chartPickerSector}>{row.stock.sector}</span>
                  {Number.isFinite(chg) && (
                    <span
                      className={chartStyles.chartPickerChg}
                      style={{ color: returnColor(chg) }}
                    >
                      {chg > 0 ? '+' : ''}{chg.toFixed(0)}%
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {pool.length > 120 && (
          <p className={chartStyles.chartPickerFoot}>Showing first 120 — narrow filters or search.</p>
        )}
      </aside>

      <div className={chartStyles.chartMain}>
        {!stock ? (
          <p className={chartStyles.viewEmpty}>No stocks match current filters.</p>
        ) : (
          <>
            <PriceChart stock={stock} daysAgo={daysAgo} weeks={260} height={340} />

            <div className={chartStyles.statGrid}>
              <StatCard
                label="Price"
                value={snapshot?.price ? `$${snapshot.price.toFixed(2)}` : '—'}
              />
              <StatCard
                label="52W change"
                value={
                  Number.isFinite(stock.priceChange52w)
                    ? `${stock.priceChange52w > 0 ? '+' : ''}${stock.priceChange52w.toFixed(1)}%`
                    : '—'
                }
                tone={
                  stock.priceChange52w > 0 ? 'up' : stock.priceChange52w < 0 ? 'down' : 'neutral'
                }
              />
              <StatCard
                label="From 52W high"
                value={
                  Number.isFinite(stock.priceVs52wHigh)
                    ? `${stock.priceVs52wHigh.toFixed(1)}%`
                    : '—'
                }
              />
              <StatCard
                label="P/E (TTM)"
                value={snapshot?.peRatio && snapshot.peRatio > 0 ? snapshot.peRatio.toFixed(1) : '—'}
              />
              <StatCard
                label="Market cap"
                value={stock.marketCap > 0 ? formatMarketCap(stock.marketCap) : '—'}
              />
              <StatCard
                label="Div yield"
                value={
                  stock.dividendYield > 0 ? `${stock.dividendYield.toFixed(2)}%` : '—'
                }
              />
              {daysAgo > 0 && snapshot && Number.isFinite(snapshot.returnToTodayPct) && (
                <StatCard
                  label="Return → today"
                  value={`${snapshot.returnToTodayPct > 0 ? '+' : ''}${snapshot.returnToTodayPct.toFixed(1)}%`}
                  tone={
                    snapshot.returnToTodayPct > 0
                      ? 'up'
                      : snapshot.returnToTodayPct < 0
                        ? 'down'
                        : 'neutral'
                  }
                  sub="Since screen date"
                />
              )}
            </div>

            <div className={chartStyles.chartLegendRow}>
              <TrendingUp size={14} style={{ color: CHART.up }} aria-hidden />
              <span>Weekly closes · synced with timeline marker when screening a past date</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
