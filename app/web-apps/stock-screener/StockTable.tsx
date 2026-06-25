'use client';

import { useMemo } from 'react';
import type { Stock, StockSnapshot } from './types';
import {
  visibleColumns,
  columnSortValue,
  type TableColumn,
  type TableColumnId,
} from './tableColumns';
import styles from './StockScreener.module.css';

export type SortDir = 'asc' | 'desc';

export interface TableRow {
  stock: Stock;
  snapshot: StockSnapshot;
  visible: boolean;
  similarity?: number;
}

interface Props {
  rows: TableRow[];
  isHistorical: boolean;
  showSimilarity: boolean;
  referenceTickers: ReadonlySet<string>;
  sortColumn: TableColumnId;
  sortDir: SortDir;
  onSort: (col: TableColumnId) => void;
  onSelectReference: (ticker: string) => void;
  isLoading?: boolean;
}

function cellValue(col: TableColumn, row: TableRow): string {
  if (col.id === 'ticker') return row.stock.ticker;
  if (col.id === 'companyName') return row.stock.companyName;
  if (col.id === 'sector') return row.stock.sector;
  if (col.id === 'returnToTodayPct') return col.format(row.snapshot.returnToTodayPct);
  if (col.id === 'similarity') return row.similarity != null ? col.format(row.similarity) : '—';
  const metricVal = row.snapshot[col.id as keyof StockSnapshot];
  if (typeof metricVal === 'number') return col.format(metricVal);
  return '—';
}

function sortIndicator(active: boolean, dir: SortDir): string {
  if (!active) return '';
  return dir === 'asc' ? ' ↑' : ' ↓';
}

export default function StockTable({
  rows,
  isHistorical,
  showSimilarity,
  referenceTickers,
  sortColumn,
  sortDir,
  onSort,
  onSelectReference,
  isLoading,
}: Props) {
  const columns = useMemo(
    () => visibleColumns(isHistorical, showSimilarity),
    [isHistorical, showSimilarity],
  );

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
    <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th className={`${styles.th} ${styles.thAction}`} scope="col" aria-label="Set pattern" />
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
                {col.sortable ? (
                  <button
                    type="button"
                    className={styles.thBtn}
                    onClick={() => onSort(col.id)}
                    title={col.label}
                  >
                    {col.shortLabel ?? col.label}
                    {isHistorical && col.estimatedAtPast ? '*' : ''}
                    {sortIndicator(sortColumn === col.id, sortDir)}
                  </button>
                ) : (
                  col.shortLabel ?? col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const isRef = referenceTickers.has(row.stock.ticker);
            const highMatch = (row.similarity ?? 0) >= 75;
            return (
              <tr
                key={row.stock.ticker}
                className={[
                  styles.tr,
                  !row.visible ? styles.trDim : '',
                  isRef ? styles.trReference : '',
                  highMatch && showSimilarity ? styles.trMatch : '',
                ].filter(Boolean).join(' ')}
              >
                <td className={styles.tdAction}>
                  {isHistorical && (
                    <button
                      type="button"
                      className={`${styles.patternBtn} ${isRef ? styles.patternBtnOn : ''}`}
                      onClick={() => onSelectReference(row.stock.ticker)}
                      title={`${isRef ? 'Remove' : 'Add'} ${row.stock.ticker} as pattern on this date`}
                      aria-pressed={isRef}
                    >
                      ◉
                    </button>
                  )}
                </td>
                {columns.map(col => (
                  <td
                    key={col.id}
                    className={[
                      styles.td,
                      col.align === 'right' ? styles.tdRight : styles.tdLeft,
                      col.sticky ? styles.tdSticky : '',
                      col.id === 'returnToTodayPct'
                        ? row.snapshot.returnToTodayPct > 0
                          ? styles.tdUp
                          : row.snapshot.returnToTodayPct < 0
                            ? styles.tdDown
                            : ''
                        : '',
                      col.id === 'similarity' && highMatch ? styles.tdMatch : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {col.id === 'companyName' ? (
                      <span className={styles.companyCell} title={row.stock.companyName}>
                        {row.stock.companyName}
                      </span>
                    ) : (
                      cellValue(col, row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {isHistorical && (
        <p className={styles.tableFoot}>
          * Estimated at selected date (price from Finnhub returns; fundamentals adjusted from current snapshot).
          Click ◉ to add past winners (select multiple for a blended pattern match).
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
    });
    const bv = columnSortValue(sortColumn, {
      ticker: b.stock.ticker,
      companyName: b.stock.companyName,
      sector: b.stock.sector,
      snapshot: b.snapshot,
      similarity: b.similarity,
    });
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });
}
