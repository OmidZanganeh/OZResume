import type { StockMetrics } from './types';
import { FILTER_DEFS } from './filters';
import { formatMarketCap } from './metricFormat';

export type TableColumnId =
  | 'ticker'
  | 'companyName'
  | 'sector'
  | 'price'
  | 'returnToTodayPct'
  | 'similarity'
  | keyof StockMetrics;

export interface TableColumn {
  id: TableColumnId;
  label: string;
  shortLabel?: string;
  align?: 'left' | 'right';
  sticky?: boolean;
  historicalOnly?: boolean;
  todayOnly?: boolean;
  format: (value: number) => string;
  sortable: boolean;
  estimatedAtPast?: boolean;
}

export const IDENTITY_COLUMNS: TableColumn[] = [
  {
    id: 'ticker',
    label: 'Ticker',
    align: 'left',
    sticky: true,
    format: () => '',
    sortable: true,
  },
  {
    id: 'companyName',
    label: 'Company',
    align: 'left',
    format: () => '',
    sortable: true,
  },
  {
    id: 'sector',
    label: 'Sector',
    align: 'left',
    format: () => '',
    sortable: true,
  },
];

export const CONTEXT_COLUMNS: TableColumn[] = [
  {
    id: 'price',
    label: 'Price',
    shortLabel: 'Price',
    align: 'right',
    format: v => `$${v.toFixed(2)}`,
    sortable: true,
    estimatedAtPast: true,
  },
  {
    id: 'returnToTodayPct',
    label: 'Return → Today',
    shortLabel: 'Ret→Now',
    align: 'right',
    historicalOnly: true,
    format: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
    sortable: true,
  },
  {
    id: 'similarity',
    label: 'Match Today',
    shortLabel: 'Match',
    align: 'right',
    todayOnly: true,
    format: v => `${v.toFixed(0)}%`,
    sortable: true,
  },
];

export const METRIC_COLUMNS: TableColumn[] = FILTER_DEFS.map(def => ({
  id: def.id,
  label: def.label,
  shortLabel: def.label.split(' ')[0] ?? def.label,
  align: 'right' as const,
  format:
    def.id === 'marketCap'
      ? (v: number) => formatMarketCap(v)
      : def.id === 'price'
        ? (v: number) => `$${v.toFixed(2)}`
        : def.format,
  sortable: true,
  estimatedAtPast: !['beta', 'avgVolume', 'volatility30d', 'atrPercent'].includes(def.id),
}));

export function visibleColumns(
  isHistorical: boolean,
  showSimilarity: boolean,
): TableColumn[] {
  return [
    ...IDENTITY_COLUMNS,
    ...CONTEXT_COLUMNS.filter(c => {
      if (c.historicalOnly && !isHistorical) return false;
      if (c.todayOnly && !showSimilarity) return false;
      return true;
    }),
    ...METRIC_COLUMNS.filter(c => c.id !== 'price'),
  ];
}

export function columnSortValue(
  col: TableColumnId,
  row: {
    ticker: string;
    companyName: string;
    sector: string;
    snapshot: { returnToTodayPct?: number } & StockMetrics;
    similarity?: number;
  },
): string | number {
  if (col === 'ticker') return row.ticker;
  if (col === 'companyName') return row.companyName;
  if (col === 'sector') return row.sector;
  if (col === 'returnToTodayPct') return row.snapshot.returnToTodayPct ?? 0;
  if (col === 'similarity') return row.similarity ?? -1;
  return row.snapshot[col as keyof StockMetrics] ?? 0;
}
