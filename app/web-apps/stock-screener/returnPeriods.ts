import { formatAsOfDate } from './timelineDate';

export interface ReturnPeriodOption {
  id: string;
  label: string;
  /** Forward window from screen date; 0 = through today. */
  days: number;
}

export const RETURN_PERIOD_OPTIONS: ReturnPeriodOption[] = [
  { id: '3m', label: '3 months', days: 91 },
  { id: '6m', label: '6 months', days: 182 },
  { id: '1y', label: '1 year', days: 365 },
  { id: '2y', label: '2 years', days: 730 },
  { id: '3y', label: '3 years', days: 1095 },
  { id: '5y', label: '5 years', days: 1825 },
  { id: 'today', label: 'To today', days: 0 },
];

export const DEFAULT_RETURN_PERIOD_DAYS = 365;

export function returnPeriodLabel(periodDays: number): string {
  const hit = RETURN_PERIOD_OPTIONS.find(o => o.days === periodDays);
  return hit?.label ?? `${periodDays} days`;
}

/** End date as days-ago from today (0 = live price). */
export function targetDaysAgoFromPeriod(screenDaysAgo: number, periodDays: number): number {
  if (screenDaysAgo <= 0) return 0;
  if (periodDays <= 0) return 0;
  return Math.max(0, screenDaysAgo - periodDays);
}

export function returnPeriodHint(screenDaysAgo: number, periodDays: number): string {
  const target = targetDaysAgoFromPeriod(screenDaysAgo, periodDays);
  const period = returnPeriodLabel(periodDays);
  if (periodDays <= 0 || target === 0) {
    return `From ${formatAsOfDate(screenDaysAgo)} through today`;
  }
  return `From ${formatAsOfDate(screenDaysAgo)} over ${period} → ${formatAsOfDate(target)}`;
}
