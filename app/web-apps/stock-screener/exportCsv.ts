import type { TableRow } from './StockTable';
import type { TableColumn } from './tableColumns';
import type { StockSnapshot } from './types';
import type { UniverseId } from './universe';
import { daysAgoToDate } from './timelineDate';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rawCellValue(col: TableColumn, row: TableRow): string | number {
  if (col.id === 'ticker') return row.stock.ticker;
  if (col.id === 'companyName') return row.stock.companyName;
  if (col.id === 'sector') return row.stock.sector;
  if (col.id === 'returnToTodayPct') {
    return Number.isFinite(row.snapshot.returnToTodayPct) ? row.snapshot.returnToTodayPct : '';
  }
  if (col.id === 'returnToTargetPct') {
    return Number.isFinite(row.returnToTargetPct) ? row.returnToTargetPct! : '';
  }
  if (col.id === 'similarity') return row.similarity ?? '';
  const metricVal = row.snapshot[col.id as keyof StockSnapshot];
  if (typeof metricVal === 'number') return metricVal;
  return '';
}

export interface CsvExportOptions {
  /** When true, only rows passing active filters (default). */
  filteredOnly?: boolean;
  filename: string;
}

export function buildScreenerCsv(
  rows: TableRow[],
  columns: TableColumn[],
  filteredOnly = true,
): string {
  const exportRows = filteredOnly ? rows.filter(r => r.visible) : rows;
  const header = columns.map(c => escapeCsv(c.label)).join(',');
  const body = exportRows
    .map(row => columns.map(col => escapeCsv(rawCellValue(col, row))).join(','))
    .join('\n');
  return `\uFEFF${header}\n${body}`;
}

export function downloadScreenerCsv(
  rows: TableRow[],
  columns: TableColumn[],
  options: CsvExportOptions,
): void {
  const { filteredOnly = true, filename } = options;
  const csv = buildScreenerCsv(rows, columns, filteredOnly);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function screenerCsvFilename(
  daysAgo: number,
  watchlistName?: string,
  universeId: UniverseId = 'sp500',
): string {
  const today = isoDate(new Date());
  const safeName = watchlistName
    ? watchlistName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()
    : '';
  if (safeName) {
    return `watchlist-${safeName}-${today}.csv`;
  }
  const prefix = universeId === 'nasdaq100' ? 'nasdaq100-screener' : 'sp500-screener';
  if (daysAgo > 0) {
    return `${prefix}-${isoDate(daysAgoToDate(daysAgo))}-to-${today}.csv`;
  }
  return `${prefix}-${today}.csv`;
}
