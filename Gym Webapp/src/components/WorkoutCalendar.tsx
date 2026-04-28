import { useMemo, useState } from 'react';
import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import { isLegacySampleSessionId } from '../utils/historySeed';
import {
  MUSCLE_GROUP_CALENDAR_COLOR,
  muscleGroupsForSession,
  sortMuscleGroupsForDisplay,
} from './calendarMuscleColors';


type Session = {
  id: string;
  date: string;
  groups: MuscleGroup[];
  entries: { exerciseId: string }[];
};

type DaySummary = {
  total: number;
  real: number;
  sample: number;
};

type DayMuscleInfo = {
  summary: DaySummary;
  /** Groups trained that day (real ∪ sample), catalog order. */
  groupsUnion: MuscleGroup[];
  groupsReal: MuscleGroup[];
  groupsSample: MuscleGroup[];
};

function toLocalDateKey(iso: string): string {
  // If it's already just a date string, don't re-parse it with Date() 
  // because new Date('YYYY-MM-DD') defaults to UTC midnight, 
  // which shifts back a day in Western timezones.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  
  // Use local time components to match the user's wall clock
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

function mergeUniqueSorted(a: MuscleGroup[], b: MuscleGroup[]): MuscleGroup[] {
  return sortMuscleGroupsForDisplay(new Set([...a, ...b]));
}

function buildDayMuscleMap(sessions: Session[], exerciseById: Map<string, Exercise>): Map<string, DayMuscleInfo> {
  const map = new Map<string, DayMuscleInfo>();

  for (const s of sessions) {
    const key = toLocalDateKey(s.date);
    if (!key) continue;

    const isSample = isLegacySampleSessionId(s.id);
    const groups = muscleGroupsForSession(s, exerciseById);

    const prev = map.get(key);
    const summary: DaySummary = prev
      ? {
          total: prev.summary.total + 1,
          real: prev.summary.real + (isSample ? 0 : 1),
          sample: prev.summary.sample + (isSample ? 1 : 0),
        }
      : { total: 1, real: isSample ? 0 : 1, sample: isSample ? 1 : 0 };

    const groupsReal = prev?.groupsReal ?? [];
    const groupsSample = prev?.groupsSample ?? [];
    const nextReal = isSample ? [...groupsReal] : mergeUniqueSorted(groupsReal, groups);
    const nextSample = isSample ? mergeUniqueSorted(groupsSample, groups) : [...groupsSample];
    const groupsUnion = mergeUniqueSorted(nextReal, nextSample);

    map.set(key, {
      summary,
      groupsUnion,
      groupsReal: nextReal,
      groupsSample: nextSample,
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
  allExercises: Exercise[];
};

export function WorkoutCalendar({ sessions, allExercises }: Props) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const exerciseById = useMemo(() => new Map(allExercises.map((e) => [e.id, e])), [allExercises]);

  const dayInfo = useMemo(() => buildDayMuscleMap(sessions, exerciseById), [sessions, exerciseById]);

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

  const lastSession = useMemo(() => {
    if (!sessions.length) return null;
    // sessions are usually sorted descending by date
    return sessions[0];
  }, [sessions]);

  const hitInLastSession = useMemo(() => {
    if (!lastSession) return new Set<MuscleGroup>();
    const groups = muscleGroupsForSession(lastSession, exerciseById);
    return new Set(groups);
  }, [lastSession, exerciseById]);

  const lastSessionLabel = useMemo(() => {
    if (!lastSession) return null;
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(lastSession.date));
  }, [lastSession]);

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
              const cal = dayInfo.get(key);
              const info = cal?.summary;
              const hasWorkout = info && info.total > 0;
              const onlySample = hasWorkout && info!.real === 0 && info!.sample > 0;
              const mixed = hasWorkout && info!.real > 0 && info!.sample > 0;
              const isToday = key === todayKey;

              const groupsStripe = cal?.groupsUnion ?? [];

              const dayLabel = new Intl.DateTimeFormat(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }).format(new Date(cursor.year, cursor.month, day));
              let title = dayLabel;
              if (hasWorkout && info && cal) {
                const parts: string[] = [];
                if (cal.groupsUnion.length) parts.push(cal.groupsUnion.join(', '));
                if (info.real) parts.push(`${info.real} logged workout${info.real === 1 ? '' : 's'}`);
                if (info.sample) parts.push(`${info.sample} legacy sample`);
                title = `${dayLabel} — ${parts.join(' · ')}`;
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
                  {hasWorkout && groupsStripe.length > 0 ? (
                    <div className="workout-cal-muscle-strip" aria-hidden>
                      {groupsStripe.map((g) => (
                        <span
                          key={g}
                          className="workout-cal-muscle-segment"
                          style={{ background: MUSCLE_GROUP_CALENDAR_COLOR[g] }}
                          title={g}
                        />
                      ))}
                    </div>
                  ) : hasWorkout ? (
                    <span className="workout-cal-dot" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="workout-cal-legend workout-cal-legend--muscles">
        {lastSessionLabel ? (
          <>
            {/* Compact muscle chip grid acting as visual legend */}
            <p className="workout-cal-legend-heading">Trained in last session ({lastSessionLabel})</p>
            <div className="cal-muscle-legend-grid">
              {MUSCLE_GROUPS.filter(g => g !== 'Cardio' && g !== 'Mobility').map((g) => {
                const hit = hitInLastSession.has(g);
                return (
                  <span key={g} className={`cal-legend-chip ${hit ? 'cal-legend-chip--hit' : 'cal-legend-chip--miss'}`}>
                    <span className="cal-legend-chip-dot" style={{ background: hit ? MUSCLE_GROUP_CALENDAR_COLOR[g] : 'var(--gf-surface-2)', border: `2px solid ${hit ? MUSCLE_GROUP_CALENDAR_COLOR[g] : '#ef4444'}` }} />
                    {g}
                  </span>
                );
              })}
            </div>
            {/* Cardio / Mobility chips */}
            {(['Cardio', 'Mobility'] as MuscleGroup[]).some(g => hitInLastSession.has(g)) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {(['Cardio', 'Mobility'] as MuscleGroup[]).filter(g => hitInLastSession.has(g)).map(g => (
                  <span key={g} className="cal-legend-chip cal-legend-chip--hit">
                    <span className="cal-legend-chip-dot" style={{ background: MUSCLE_GROUP_CALENDAR_COLOR[g], border: `2px solid ${MUSCLE_GROUP_CALENDAR_COLOR[g]}` }} />
                    {g}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="workout-cal-legend-heading">Muscle / focus (day stripe)</p>
            <div className="workout-cal-legend-muscle-grid">
              {MUSCLE_GROUPS.map((g) => (
                <span key={g} className="workout-cal-legend-item workout-cal-legend-item--muscle">
                  <i
                    className="workout-cal-legend-swatch workout-cal-legend-swatch--muscle"
                    style={{ background: MUSCLE_GROUP_CALENDAR_COLOR[g] }}
                    aria-hidden
                  />
                  {g}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="workout-cal-legend">
        <span className="workout-cal-legend-item">
          <i className="workout-cal-legend-swatch workout-cal-legend-swatch--workout" aria-hidden />
          Logged workout day
        </span>
        <span className="workout-cal-legend-item">
          <i className="workout-cal-legend-swatch workout-cal-legend-swatch--sample" aria-hidden />
          Legacy sample only
        </span>
        <span className="workout-cal-legend-item">
          <i className="workout-cal-legend-ring" aria-hidden />
          Today
        </span>
        <span className="workout-cal-legend-item workout-cal-legend-item--hint">
          Multiple colors = multiple areas that day (from your moves).
        </span>
      </div>
    </div>
  );
}
