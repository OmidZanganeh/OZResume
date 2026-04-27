import { useMemo, useState } from 'react';
import { SEED_SESSION_ID_PREFIX } from '../utils/historySeed';

type Session = { id: string; date: string };

type DaySummary = {
  total: number;
  real: number;
  sample: number;
};

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildDaySummaries(sessions: Session[]): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  for (const s of sessions) {
    const key = toLocalDateKey(s.date);
    if (!key) continue;
    const isSample = s.id.startsWith(SEED_SESSION_ID_PREFIX);
    const prev = map.get(key) ?? { total: 0, real: 0, sample: 0 };
    map.set(key, {
      total: prev.total + 1,
      real: prev.real + (isSample ? 0 : 1),
      sample: prev.sample + (isSample ? 1 : 0),
    });
  }
  return map;
}

function monthMatrix(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const pad = first.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type Props = {
  sessions: Session[];
};

export function WorkoutCalendar({ sessions }: Props) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const summaries = useMemo(() => buildDaySummaries(sessions), [sessions]);

  const matrix = useMemo(
    () => monthMatrix(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
        new Date(cursor.year, cursor.month, 1),
      ),
    [cursor.year, cursor.month],
  );

  const todayKey = localTodayKey();

  function goPrev() {
    setCursor((c) => {
      const m = c.month - 1;
      if (m < 0) return { year: c.year - 1, month: 11 };
      return { year: c.year, month: m };
    });
  }

  function goNext() {
    setCursor((c) => {
      const m = c.month + 1;
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { year: c.year, month: m };
    });
  }

  function goThisMonth() {
    const n = new Date();
    setCursor({ year: n.getFullYear(), month: n.getMonth() });
  }

  return (
    <div className="workout-cal">
      <div className="workout-cal-header">
        <button type="button" className="workout-cal-nav" onClick={goPrev} aria-label="Previous month">
          ‹
        </button>
        <div className="workout-cal-title-wrap">
          <h3 className="workout-cal-title">{monthLabel}</h3>
          <button type="button" className="workout-cal-today-link text-button" onClick={goThisMonth}>
            Today
          </button>
        </div>
        <button type="button" className="workout-cal-nav" onClick={goNext} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="workout-cal-grid" role="grid" aria-label={`Workout days for ${monthLabel}`}>
        <div className="workout-cal-weekdays" role="row">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="workout-cal-wd" role="columnheader">
              {wd}
            </div>
          ))}
        </div>
        {matrix.map((row, ri) => (
          <div key={ri} className="workout-cal-row" role="row">
            {row.map((day, ci) => {
              if (day === null) {
                return <div key={`e-${ri}-${ci}`} className="workout-cal-cell workout-cal-cell--empty" />;
              }
              const key = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const info = summaries.get(key);
              const hasWorkout = info && info.total > 0;
              const onlySample = hasWorkout && info!.real === 0 && info!.sample > 0;
              const mixed = hasWorkout && info!.real > 0 && info!.sample > 0;
              const isToday = key === todayKey;

              const dayLabel = new Intl.DateTimeFormat(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }).format(new Date(cursor.year, cursor.month, day));
              let title = dayLabel;
              if (hasWorkout && info) {
                const parts: string[] = [];
                if (info.real) parts.push(`${info.real} logged workout${info.real === 1 ? '' : 's'}`);
                if (info.sample) parts.push(`${info.sample} sample`);
                title = `${dayLabel} — ${parts.join(', ')}`;
              }

              return (
                <div
                  key={key}
                  className={[
                    'workout-cal-cell',
                    hasWorkout ? 'workout-cal-cell--workout' : '',
                    onlySample ? 'workout-cal-cell--sample' : '',
                    mixed ? 'workout-cal-cell--mixed' : '',
                    isToday ? 'workout-cal-cell--today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="gridcell"
                  title={title}
                >
                  <span className="workout-cal-daynum">{day}</span>
                  {hasWorkout ? <span className="workout-cal-dot" aria-hidden /> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="workout-cal-legend">
        <span className="workout-cal-legend-item">
          <i className="workout-cal-legend-swatch workout-cal-legend-swatch--workout" aria-hidden />
          Workout day
        </span>
        <span className="workout-cal-legend-item">
          <i className="workout-cal-legend-swatch workout-cal-legend-swatch--sample" aria-hidden />
          Sample history only
        </span>
        <span className="workout-cal-legend-item">
          <i className="workout-cal-legend-ring" aria-hidden />
          Today
        </span>
      </div>
    </div>
  );
}
