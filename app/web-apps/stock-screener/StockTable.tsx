'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Stock, StockSnapshot } from './types';
import {
  visibleColumns,
  columnSortValue,
  type TableColumn,
  type TableColumnId,
} from './tableColumns';
import ColumnHeaderInfo from './ColumnHeaderInfo';
import Sparkline from './charts/Sparkline';
import chartStyles from './charts/Charts.module.css';
import styles from './StockScreener.module.css';
import { yahooQuoteUrl } from './yahooFinanceUrl';

export type SortDir = 'asc' | 'desc';

export interface TableRow {
  stock: Stock;
  snapshot: StockSnapshot;
  visible: boolean;
  similarity?: number;
  /** Return % from screen-as-of date to user-chosen target date. */
  returnToTargetPct?: number;
}

interface Props {
  rows: TableRow[];
  isHistorical: boolean;
  showSimilarity: boolean;
  returnPeriodDays?: number;
  referenceTickers: ReadonlySet<string>;
  sortColumn: TableColumnId;
  sortDir: SortDir;
  onSort: (col: TableColumnId) => void;
  onSelectReference: (ticker: string) => void;
  isLoading?: boolean;
  isUpdating?: boolean;
  patternLoading?: ReadonlySet<string>;
  watchlistTickers?: ReadonlySet<string>;
  onToggleWatchlist?: (ticker: string) => void;
  selectedChartTicker?: string | null;
  onSelectChart?: (ticker: string) => void;
}

const ROW_HEIGHT_PX = 37;
const VIRTUAL_OVERSCAN = 10;

function cellValue(col: TableColumn, row: TableRow): string {
  if (col.id === 'ticker') return row.stock.ticker;
  if (col.id === 'companyName') return row.stock.companyName;
  if (col.id === 'sector') return row.stock.sector;
  if (col.id === 'returnToTodayPct') {
    const v = row.snapshot.returnToTodayPct;
    return Number.isFinite(v) ? col.format(v) : '—';
  }
  if (col.id === 'returnToTargetPct') {
    const v = row.returnToTargetPct;
    return Number.isFinite(v) ? col.format(v!) : '—';
  }
  if (col.id === 'similarity') return row.similarity != null ? col.format(row.similarity) : '—';
  const metricVal = row.snapshot[col.id as keyof StockSnapshot];
  if (typeof metricVal === 'number' && Number.isFinite(metricVal)) {
    if (col.id === 'beta' && metricVal === 0) return '—';
    return col.format(metricVal);
  }
  return '—';
}

function sortIndicator(active: boolean, dir: SortDir): string {
  if (!active) return '';
  return dir === 'asc' ? ' ↑' : ' ↓';
}

function TableHeaderLabel({ col, sortColumn, sortDir, onSort }: {
  col: TableColumn;
  sortColumn: TableColumnId;
  sortDir: SortDir;
  onSort: (col: TableColumnId) => void;
}) {
  const label = col.shortLabel ?? col.label;
  if (!col.sortable) {
    return (
      <span className={styles.thLabel}>
        {label}
        {col.explanation && <ColumnHeaderInfo label={col.label} explanation={col.explanation} />}
      </span>
    );
  }
  return (
    <span className={styles.thLabel}>
      <button
        type="button"
        className={styles.thBtn}
        onClick={() => onSort(col.id)}
      >
        {label}
        {sortIndicator(sortColumn === col.id, sortDir)}
      </button>
      {col.explanation && <ColumnHeaderInfo label={col.label} explanation={col.explanation} />}
    </span>
  );
}

function TableRowView({
  row,
  columns,
  isHistorical,
  showSimilarity,
  isRef,
  onSelectReference,
  patternLoading,
  watchlistTickers,
  onToggleWatchlist,
  selectedChartTicker,
  onSelectChart,
}: {
  row: TableRow;
  columns: TableColumn[];
  isHistorical: boolean;
  showSimilarity: boolean;
  isRef: boolean;
  onSelectReference: (ticker: string) => void;
  patternLoading?: ReadonlySet<string>;
  watchlistTickers?: ReadonlySet<string>;
  onToggleWatchlist?: (ticker: string) => void;
  selectedChartTicker?: string | null;
  onSelectChart?: (ticker: string) => void;
}) {
  const highMatch = (row.similarity ?? 0) >= 75;
  const isPatternLoading = patternLoading?.has(row.stock.ticker) ?? false;
  const inWatchlist = watchlistTickers?.has(row.stock.ticker) ?? false;
  const isChartSelected = selectedChartTicker === row.stock.ticker;
  const retTarget = row.returnToTargetPct;
  return (
    <tr
      className={[
        styles.tr,
        !row.visible ? styles.trDim : '',
        isRef ? styles.trReference : '',
        highMatch && showSimilarity ? styles.trMatch : '',
        isChartSelected ? chartStyles.trSelected : '',
      ].filter(Boolean).join(' ')}
    >
      <td className={styles.tdAction}>
        <div className={styles.actionBtns}>
          {onToggleWatchlist && (
            <button
              type="button"
              className={`${styles.watchBtn} ${inWatchlist ? styles.watchBtnOn : ''}`}
              onClick={() => onToggleWatchlist(row.stock.ticker)}
              title={
                inWatchlist
                  ? `Remove ${row.stock.ticker} from watchlist`
                  : `Add ${row.stock.ticker} to watchlist`
              }
              aria-pressed={inWatchlist}
            >
              ★
            </button>
          )}
          {isHistorical && (
            <button
              type="button"
              className={`${styles.patternBtn} ${isRef ? styles.patternBtnOn : ''} ${isPatternLoading ? styles.patternBtnLoading : ''}`}
              onClick={() => onSelectReference(row.stock.ticker)}
              disabled={isPatternLoading}
              title={
                isPatternLoading
                  ? `Loading weekly prices for ${row.stock.ticker}…`
                  : `${isRef ? 'Remove' : 'Add'} ${row.stock.ticker} as pattern on this date`
              }
              aria-pressed={isRef}
              aria-busy={isPatternLoading}
            >
              {isPatternLoading ? <Loader2 size={14} className={styles.spinIcon} /> : '◉'}
            </button>
          )}
        </div>
      </td>
      <td className={`${styles.td} ${styles.tdSpark}`}>
        <Sparkline
          stock={row.stock}
          onClick={onSelectChart ? () => onSelectChart(row.stock.ticker) : undefined}
        />
      </td>
      {columns.map(col => (
        <td
          key={col.id}
          className={[
            styles.td,
            col.align === 'right' ? styles.tdRight : styles.tdLeft,
            col.sticky ? styles.tdSticky : '',
            col.id === 'returnToTodayPct'
              ? Number.isFinite(row.snapshot.returnToTodayPct)
                ? row.snapshot.returnToTodayPct > 0
                  ? styles.tdUp
                  : row.snapshot.returnToTodayPct < 0
                    ? styles.tdDown
                    : ''
                : ''
              : col.id === 'returnToTargetPct'
                ? Number.isFinite(retTarget)
                  ? retTarget! > 0
                    ? styles.tdUp
                    : retTarget! < 0
                      ? styles.tdDown
                      : ''
                  : ''
                : '',
            col.id === 'similarity' && highMatch ? styles.tdMatch : '',
          ].filter(Boolean).join(' ')}
        >
          {col.id === 'companyName' ? (
            <span className={styles.companyCell} title={row.stock.companyName}>
              {row.stock.companyName}
            </span>
          ) : col.id === 'ticker' ? (
            <a
              href={yahooQuoteUrl(row.stock.ticker)}
              className={styles.tickerLink}
              target="_blank"
              rel="noopener noreferrer"
              title={`${row.stock.ticker} on Yahoo Finance`}
            >
              {row.stock.ticker}
            </a>
          ) : col.id === 'price' && row.snapshot.priceSource === 'weekly-clamped' ? (
            <span
              className={styles.priceClamped}
              title="No weekly data before this ticker’s listing/spinoff — showing first available close"
            >
              {cellValue(col, row)}*
            </span>
          ) : (
            cellValue(col, row)
          )}
        </td>
      ))}
    </tr>
  );
}

export default function StockTable({
  rows,
  isHistorical,
  showSimilarity,
  returnPeriodDays = 365,
  referenceTickers,
  sortColumn,
  sortDir,
  onSort,
  onSelectReference,
  isLoading,
  isUpdating,
  patternLoading,
  watchlistTickers,
  onToggleWatchlist,
  selectedChartTicker,
  onSelectChart,
}: Props) {
  const columns = useMemo(
    () => visibleColumns(isHistorical, showSimilarity, returnPeriodDays),
    [isHistorical, showSimilarity, returnPeriodDays],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  const onScroll = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [isLoading]);

  const colSpan = columns.length + 2;
  const totalHeight = rows.length * ROW_HEIGHT_PX;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_PX) - VIRTUAL_OVERSCAN);
  const visibleCount =
    Math.ceil(viewportHeight / ROW_HEIGHT_PX) + VIRTUAL_OVERSCAN * 2;
  const endIdx = Math.min(rows.length, startIdx + visibleCount);
  const topPad = startIdx * ROW_HEIGHT_PX;
  const bottomPad = Math.max(0, totalHeight - endIdx * ROW_HEIGHT_PX);
  const visibleRows = rows.slice(startIdx, endIdx);

  if (isLoading) {
    return (
      <div className={styles.tableSkeletonWrap}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className={styles.tableSkeletonRow} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.tableWrap} ref={wrapRef} onScroll={onScroll} style={{ '--sticky-offset': '160px' } as React.CSSProperties}>
      {isUpdating && <div className={styles.tableUpdating} aria-hidden />}
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th className={`${styles.th} ${styles.thAction}`} scope="col" aria-label="Actions" />
            <th className={`${styles.th} ${styles.thSpark}`} scope="col">
              <span className={styles.thLabel}>Trend</span>
            </th>
            {columns.map(col => (
              <th
                key={col.id}
                scope="col"
                className={[
                  styles.th,
                  col.align === 'right' ? styles.thRight : styles.thLeft,
                  col.sticky ? styles.thSticky : '',
                ].join(' ')}
              >
                <TableHeaderLabel
                  col={col}
                  sortColumn={sortColumn}
                  sortDir={sortDir}
                  onSort={onSort}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {topPad > 0 && (
            <tr aria-hidden className={styles.trSpacer}>
              <td colSpan={colSpan} style={{ height: topPad, padding: 0, border: 0 }} />
            </tr>
          )}
          {visibleRows.map(row => (
            <TableRowView
              key={row.stock.ticker}
              row={row}
              columns={columns}
              isHistorical={isHistorical}
              showSimilarity={showSimilarity}
              isRef={referenceTickers.has(row.stock.ticker)}
              onSelectReference={onSelectReference}
              patternLoading={patternLoading}
              watchlistTickers={watchlistTickers}
              onToggleWatchlist={onToggleWatchlist}
              selectedChartTicker={selectedChartTicker}
              onSelectChart={onSelectChart}
            />
          ))}
          {bottomPad > 0 && (
            <tr aria-hidden className={styles.trSpacer}>
              <td colSpan={colSpan} style={{ height: bottomPad, padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </table>
      {isHistorical && (
        <p className={styles.tableFoot}>
          Fundamentals use the latest reported fiscal period on or before the selected date (price at that date).
          Momentum uses weekly closes (up to 10 years). Beta is today&apos;s live value.
        </p>
      )}
    </div>
  );
}

export function sortRows(
  rows: TableRow[],
  sortColumn: TableColumnId,
  sortDir: SortDir,
): TableRow[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = columnSortValue(sortColumn, {
      ticker: a.stock.ticker,
      companyName: a.stock.companyName,
      sector: a.stock.sector,
      snapshot: a.snapshot,
      similarity: a.similarity,
      returnToTargetPct: a.returnToTargetPct,
    });
    const bv = columnSortValue(sortColumn, {
      ticker: b.stock.ticker,
      companyName: b.stock.companyName,
      sector: b.stock.sector,
      snapshot: b.snapshot,
      similarity: b.similarity,
      returnToTargetPct: b.returnToTargetPct,
    });
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });
}
