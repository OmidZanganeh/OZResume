/** Timeline date helpers (no imports from historical — avoids circular deps). */

export function daysAgoToDate(daysAgo: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export function formatAsOfDate(daysAgo: number): string {
  if (daysAgo <= 0) return 'Today';
  return daysAgoToDate(daysAgo).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Calendar days from today back to `d` (noon-local to avoid DST edge cases). */
export function dateToDaysAgo(d: Date): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const t = new Date(d);
  t.setHours(12, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - t.getTime()) / 86_400_000));
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isoDateToDaysAgo(iso: string): number {
  const [y, m, day] = iso.split('-').map(Number);
  if (!y || !m || !day) return 0;
  return dateToDaysAgo(new Date(y, m - 1, day));
}
