import type { StockMetrics } from './types';
import { FILTER_DEFS } from './filters';
import { HISTORICAL_FUNDAMENTAL_IDS } from './fundamentalMetrics';
import { formatMarketCap } from './metricFormat';
import { returnPeriodLabel } from './returnPeriods';

function filterExplanation(id: string): string | undefined {
  return FILTER_DEFS.find(d => d.id === id)?.explanation;
}

const HISTORICAL_FUNDAMENTAL_NOTE =
  ' Rebuilt from the latest fiscal report on or before the selected date and the weekly price at that date.';

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
  explanation?: string;
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
    explanation: filterExplanation('price'),
    align: 'right',
    format: v => (Number.isFinite(v) && v > 0 ? `$${v.toFixed(2)}` : '—'),
    sortable: true,
  },
  {
    id: 'returnToTodayPct',
    label: 'Return → Today',
    shortLabel: 'Ret→Now',
    explanation:
      'Total return from the selected past date to today’s price, using weekly closes when available.',
    align: 'right',
    historicalOnly: true,
    format: v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
    sortable: true,
  },
  {
    id: 'similarity',
    label: 'Match Today',
    shortLabel: 'Match',
    explanation:
      'How closely this stock’s weekly price momentum and fundamentals today match the selected past pattern. Higher % = closer match.',
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
    explanation:
      periodDays <= 0
        ? 'Return from the selected date to today.'
        : `Return from the selected past date over the next ${label.toLowerCase()}, using weekly closes.`,
    align: 'right',
    historicalOnly: true,
    format: pctFormat,
    sortable: true,
  };
}

const METRIC_SHORT_LABELS: Partial<Record<keyof StockMetrics, string>> = {
  avgVolume: 'Vol',
};

export const METRIC_COLUMNS: TableColumn[] = FILTER_DEFS.map(def => ({
  id: def.id,
  label: def.label,
  shortLabel: METRIC_SHORT_LABELS[def.id] ?? def.label.split(' ')[0] ?? def.label,
  explanation: def.explanation,
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
).map(col => ({
  ...col,
  explanation: col.explanation ? `${col.explanation}${HISTORICAL_FUNDAMENTAL_NOTE}` : undefined,
}));

function techColumn(
  id: keyof StockMetrics,
  label: string,
  shortLabel: string,
  format: (v: number) => string,
  extraNote?: string,
): TableColumn {
  const base = filterExplanation(id);
  return {
    id,
    label,
    shortLabel,
    explanation: base
      ? `${base}${extraNote ?? ' Values are computed from weekly closes at the selected date.'}`
      : undefined,
    align: 'right',
    format,
    sortable: true,
  };
}

/** Price / momentum columns shown on historical dates (real weekly or Finnhub return windows). */
export const HISTORICAL_TECH_COLUMNS: TableColumn[] = [
  techColumn(
    'priceChange1m',
    '4-Week Change',
    '4W',
    v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
  ),
  techColumn(
    'priceChange3m',
    '13-Week Change',
    '13W',
    v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
  ),
  techColumn(
    'priceChange6m',
    '26-Week Change',
    '26W',
    v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
  ),
  techColumn(
    'priceChange52w',
    '52-Week Change',
    '52W',
    v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
  ),
  techColumn(
    'priceVs52wHigh',
    'From 52W High',
    'vs Hi',
    v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
  ),
  techColumn(
    'priceVs52wLow',
    'From 52W Low',
    'vs Lo',
    v => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—'),
  ),
  techColumn(
    'beta',
    'Beta',
    'Beta',
    v => (Number.isFinite(v) && v !== 0 ? v.toFixed(2) : '—'),
    ' Shown as today’s live value, not historical.',
  ),
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
