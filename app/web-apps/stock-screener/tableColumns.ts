import type { StockMetrics } from './types';
import { FILTER_DEFS } from './filters';
import { HISTORICAL_FUNDAMENTAL_IDS } from './fundamentalMetrics';
import { formatMarketCap } from './metricFormat';
import { returnPeriodLabel } from './returnPeriods';

export type TableColumnId =
  | 'ticker'
  | 'companyName'
  | 'sector'
  | 'price'
  | 'returnToTodayPct'
  | 'returnToTargetPct'
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
    format: v => (Number.isFinite(v) && v > 0 ? `$${v.toFixed(2)}` : '—'),
    sortable: true,
  },
  {
    id: 'returnToTodayPct',
    label: 'Return → Today',
    shortLabel: 'Ret→Now',
    align: 'right',
    historicalOnly: true,
    format: v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
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

const pctFormat = (v: number) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—');

export function buildReturnTargetColumn(periodDays: number): TableColumn {
  const label = returnPeriodLabel(periodDays);
  return {
    id: 'returnToTargetPct',
    label: periodDays <= 0 ? 'Return → Today' : `Return over ${label}`,
    shortLabel: 'Ret→Date',
    align: 'right',
    historicalOnly: true,
    format: pctFormat,
    sortable: true,
  };
}

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
}));

const historicalFundamentalIdSet = new Set<string>(HISTORICAL_FUNDAMENTAL_IDS);

/** Fundamentals rebuilt from fiscal statements + weekly price at the timeline date. */
export const HISTORICAL_FUNDAMENTAL_COLUMNS: TableColumn[] = METRIC_COLUMNS.filter(c =>
  historicalFundamentalIdSet.has(c.id),
);

/** Price / momentum columns shown on historical dates (real weekly or Finnhub return windows). */
export const HISTORICAL_TECH_COLUMNS: TableColumn[] = [
  {
    id: 'priceChange1m',
    label: '4-Week Change',
    shortLabel: '4W',
    align: 'right',
    format: v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
    sortable: true,
  },
  {
    id: 'priceChange3m',
    label: '13-Week Change',
    shortLabel: '13W',
    align: 'right',
    format: v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
    sortable: true,
  },
  {
    id: 'priceChange6m',
    label: '26-Week Change',
    shortLabel: '26W',
    align: 'right',
    format: v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
    sortable: true,
  },
  {
    id: 'priceChange52w',
    label: '52-Week Change',
    shortLabel: '52W',
    align: 'right',
    format: v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
    sortable: true,
  },
  {
    id: 'priceVs52wHigh',
    label: 'From 52W High',
    shortLabel: 'vs Hi',
    align: 'right',
    format: v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
    sortable: true,
  },
  {
    id: 'priceVs52wLow',
    label: 'From 52W Low',
    shortLabel: 'vs Lo',
    align: 'right',
    format: v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
    sortable: true,
  },
  {
    id: 'beta',
    label: 'Beta',
    align: 'right',
    format: v => (Number.isFinite(v) && v !== 0 ? v.toFixed(2) : '—'),
    sortable: true,
  },
];

export function visibleColumns(
  isHistorical: boolean,
  showSimilarity: boolean,
  returnPeriodDays = 365,
): TableColumn[] {
  if (isHistorical) {
    const cols: TableColumn[] = [
      ...IDENTITY_COLUMNS,
      CONTEXT_COLUMNS.find(c => c.id === 'price')!,
      CONTEXT_COLUMNS.find(c => c.id === 'returnToTodayPct')!,
      buildReturnTargetColumn(returnPeriodDays),
      ...HISTORICAL_FUNDAMENTAL_COLUMNS,
      ...HISTORICAL_TECH_COLUMNS,
    ];
    if (showSimilarity) {
      cols.push(CONTEXT_COLUMNS.find(c => c.id === 'similarity')!);
    }
    return cols;
  }

  return [
    ...IDENTITY_COLUMNS,
    CONTEXT_COLUMNS.find(c => c.id === 'price')!,
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
    returnToTargetPct?: number;
  },
): string | number {
  if (col === 'ticker') return row.ticker;
  if (col === 'companyName') return row.companyName;
  if (col === 'sector') return row.sector;
  if (col === 'returnToTodayPct') {
    return Number.isFinite(row.snapshot.returnToTodayPct)
      ? row.snapshot.returnToTodayPct!
      : -Infinity;
  }
  if (col === 'returnToTargetPct') {
    return Number.isFinite(row.returnToTargetPct) ? row.returnToTargetPct! : -Infinity;
  }
  if (col === 'similarity') return row.similarity ?? -1;
  if (col === 'price') {
    const p = row.snapshot.price;
    return Number.isFinite(p) && p > 0 ? p : -Infinity;
  }
  const metricVal = row.snapshot[col as keyof StockMetrics];
  if (typeof metricVal === 'number' && Number.isFinite(metricVal) && metricVal !== 0) {
    return metricVal;
  }
  return -Infinity;
}
