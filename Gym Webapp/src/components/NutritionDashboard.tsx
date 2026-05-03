import type { NutritionGoals } from '../data/gymFlowStorage';

const COL = {
  protein: '#38bdf8',
  carbs: '#a78bfa',
  fat: '#fb923c',
  fiber: '#4ade80',
  kcal: '#2dd4bf',
  muted: 'rgba(148, 163, 184, 0.35)',
} as const;

export type NutritionDayRollup = { dateKey: string } & NutritionGoals;

const WEEK_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const;

const RING_LABELS: Record<(typeof WEEK_KEYS)[number], string> = {
  calories: 'kcal',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
};

const RING_COLORS: Record<(typeof WEEK_KEYS)[number], string> = {
  calories: COL.kcal,
  protein: COL.protein,
  carbs: COL.carbs,
  fat: COL.fat,
  fiber: COL.fiber,
};

type TodayRingsProps = {
  totals: NutritionGoals;
  goals: NutritionGoals;
  endDateKey: string;
  periodDays: number;
};

/** Five nested circles (outer → inner: kcal, P, C, F, fiber). Totals = selected day or period daily average vs goals. */
export function TodayConcentricGoalRings({ totals, goals, endDateKey, periodDays }: TodayRingsProps) {
  const VB_W = 128;
  const VB_H = 120;
  /** Nudge rings right so they sit a bit farther from the title/date block above. */
  const cx = VB_W / 2 + 5;
  const cy = VB_H / 2;
  /** Outer ring largest; step keeps gaps between strokes. */
  const radii = [52, 44, 36, 28, 20];
  const strokeW = 3.25;
  const endLabel = new Date(endDateKey + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const titleMain = periodDays === 1 ? 'Day' : `${periodDays}d avg`;
  const subLine =
    periodDays === 1
      ? endLabel
      : `Last ${periodDays} days ending ${endLabel} · vs daily goals`;

  const fmt = (key: (typeof WEEK_KEYS)[number], v: number) => {
    if (key === 'calories') return String(Math.round(v));
    const x = Math.round(v * 10) / 10;
    return Number.isInteger(x) ? String(x) : x.toFixed(1);
  };

  const centerKcal = Math.round(totals.calories);

  return (
    <div
      className="nutrition-viz-card nutrition-viz-card--stretch nutrition-viz-card--micro nutrition-concentric-card"
      role="group"
      aria-label={
        periodDays === 1
          ? `Nutrition for ${endLabel} versus daily goals`
          : `${periodDays}-day average ending ${endLabel} versus daily goals`
      }
    >
      <h3 className="nutrition-viz-title nutrition-concentric-title">{titleMain}</h3>
      <p className="nutrition-concentric-date">{subLine}</p>
      <div className="nutrition-concentric-svg-wrap">
        <svg className="nutrition-concentric-svg" viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {WEEK_KEYS.map((key, i) => {
            const r = radii[i]!;
            const g = Math.max(goals[key], 0.001);
            const val = totals[key];
            const circ = 2 * Math.PI * r;
            const arcFrac = Math.min(Math.max(g > 0 ? val / g : 0, 0), 1);
            const dash = `${arcFrac * circ} ${circ}`;
            const color = RING_COLORS[key];
            return (
              <g key={key}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.28)"
                  strokeWidth={strokeW}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeW}
                  strokeDasharray={dash}
                  strokeLinecap="round"
                  opacity={0.88}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
                <title>{`${RING_LABELS[key]}: ${fmt(key, val)} / goal ${fmt(key, goals[key])} per day`}</title>
              </g>
            );
          })}
        </svg>
        <div className="nutrition-concentric-center">
          <span className="nutrition-concentric-center-kcal">{centerKcal}</span>
          <span className="nutrition-concentric-center-sub">
            kcal
            {periodDays > 1 ? ' · avg' : ''}
          </span>
        </div>
      </div>
      <ul className="nutrition-concentric-legend">
        {WEEK_KEYS.map((key) => (
          <li key={key} className="nutrition-concentric-legend-item">
            <span className="nutrition-concentric-legend-dot" style={{ background: RING_COLORS[key] }} />
            <span className="nutrition-concentric-legend-label">{RING_LABELS[key]}</span>
            <span className="nutrition-concentric-legend-val">
              {fmt(key, totals[key])}/{fmt(key, goals[key])}
              {key === 'calories' ? '' : 'g'}
            </span>
          </li>
        ))}
      </ul>
      {periodDays > 1 ? (
        <p className="nutrition-concentric-foot">Ring values are daily averages for the window; goals are your daily targets.</p>
      ) : null}
    </div>
  );
}

type WeekStripesProps = {
  days: NutritionDayRollup[];
  goals: NutritionGoals;
  highlightDateKey: string;
  /** When false, omit the in-card heading (e.g. PDF report uses its own card title). */
  showTitle?: boolean;
};

/** One row per nutrient: goal rings per day; one weekday row below. Shown only for 7+ days (caller + guard). */
export function WeekNutrientStrips({ days, goals, highlightDateKey, showTitle = true }: WeekStripesProps) {
  const labels: Record<(typeof WEEK_KEYS)[number], string> = {
    calories: 'Calories (kcal)',
    protein: 'Protein (g)',
    carbs: 'Carbs (g)',
    fat: 'Fat (g)',
    fiber: 'Fiber (g)',
  };
  const colors: Record<(typeof WEEK_KEYS)[number], string> = {
    calories: COL.kcal,
    protein: COL.protein,
    carbs: COL.carbs,
    fat: COL.fat,
    fiber: COL.fiber,
  };
  const n = days.length || 1;
  if (n < 7) return null;

  const labelColW = n <= 14 ? 70 : 88;
  const labelToRingsGap = 14;
  const ringsStartX = labelColW + labelToRingsGap;
  /** Slightly wider columns than before; still scrolls for very long windows. */
  const targetRingsWidth = Math.min(400, Math.max(300, 72 + n * 34));
  const cellW = Math.max(26, Math.min(44, Math.floor((targetRingsWidth - ringsStartX) / n)));
  const rowH = 50;
  const padT = 8;
  const dowRowY = padT + WEEK_KEYS.length * rowH + 12;
  const totalW = ringsStartX + n * cellW + 6;
  const totalH = dowRowY + 12;

  const fmtCenter = (key: (typeof WEEK_KEYS)[number], val: number) => {
    if (key === 'calories') return String(Math.round(val));
    const v = Math.round(val * 10) / 10;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };

  return (
    <div className="nutrition-viz-card nutrition-viz-card--stretch nutrition-week-rings-card nutrition-viz-card--micro">
      {showTitle ? <h3 className="nutrition-viz-title">{n}-day rings</h3> : null}
      <div className="nutrition-week-rings-scroll">
        <svg
          className="nutrition-chart-svg nutrition-week-rings"
          viewBox={`0 0 ${totalW} ${totalH}`}
          preserveAspectRatio="xMinYMid meet"
          style={{ width: `${totalW}px`, maxWidth: 'none', height: 'auto' }}
        >
          {WEEK_KEYS.map((key, row) => {
            const goal = Math.max(goals[key], 0.001);
            const cy = padT + row * rowH + rowH / 2;
            return (
              <g key={key}>
                <text x={4} y={cy + 4} fill="var(--gf-text-muted)" fontSize="10" fontWeight="600">
                  {labels[key]}
                </text>
                {days.map((d, i) => {
                  const val = d[key];
                  const cx = ringsStartX + i * cellW + cellW / 2;
                  const r = Math.max(10, Math.min(16, (cellW - 6) / 2));
                  const strokeW = 3;
                  const circ = 2 * Math.PI * r;
                  const rawFrac = goal > 0 ? val / goal : 0;
                  const arcFrac = Math.min(Math.max(rawFrac, 0), 1);
                  const dash = `${arcFrac * circ} ${circ}`;
                  const isHi = d.dateKey === highlightDateKey;
                  const centerTxt = fmtCenter(key, val);
                  const fs = centerTxt.length > 4 ? 7.5 : centerTxt.length > 3 ? 8.5 : 10;
                  return (
                    <g key={`${key}-${d.dateKey}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.32)"
                        strokeWidth={strokeW}
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={colors[key]}
                        strokeWidth={strokeW}
                        strokeDasharray={dash}
                        strokeLinecap="round"
                        opacity={isHi ? 1 : 0.72}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        className="nutrition-ring-arc"
                      />
                      {isHi ? (
                        <circle cx={cx} cy={cy} r={r + strokeW} fill="none" stroke={COL.kcal} strokeWidth="1" opacity="0.45" />
                      ) : null}
                      <text
                        x={cx}
                        y={cy + fs / 3}
                        textAnchor="middle"
                        fill="var(--gf-text)"
                        fontSize={fs}
                        fontWeight="700"
                      >
                        {centerTxt}
                      </text>
                      <title>{`${d.dateKey} · ${labels[key]} ${typeof val === 'number' ? val.toFixed(1) : val} (goal ${goal})`}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
          <g aria-hidden>
            {days.map((d, i) => {
              const cx = ringsStartX + i * cellW + cellW / 2;
              const dow = new Date(d.dateKey + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
              const isHi = d.dateKey === highlightDateKey;
              return (
                <text
                  key={`dow-${d.dateKey}`}
                  x={cx}
                  y={dowRowY}
                  textAnchor="middle"
                  fill={isHi ? 'var(--gf-text)' : 'var(--gf-text-dim)'}
                  fontSize="8.5"
                  fontWeight={isHi ? 700 : 600}
                >
                  {dow}
                </text>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

type LogKcalShare = { id: string; name: string; calories: number };

/** Shows each log’s share of the day’s calories (when day has data). */
export function TodayMealEnergyRows({ logs, dayTotalKcal }: { logs: LogKcalShare[]; dayTotalKcal: number }) {
  if (logs.length === 0 || dayTotalKcal <= 0) return null;
  const sorted = [...logs].sort((a, b) => b.calories - a.calories).slice(0, 8);

  return (
    <div className="nutrition-viz-card nutrition-viz-card--stretch nutrition-viz-card--micro">
      <h3 className="nutrition-viz-title">Today’s foods</h3>
      <ul className="nutrition-meal-share-list">
        {sorted.map((l) => {
          const pct = Math.min(100, (l.calories / dayTotalKcal) * 100);
          return (
            <li key={l.id} className="nutrition-meal-share-row">
              <span className="nutrition-meal-share-name">{l.name}</span>
              <span className="nutrition-meal-share-val">{Math.round(l.calories)} kcal</span>
              <span className="nutrition-meal-share-track">
                <span className="nutrition-meal-share-fill" style={{ width: `${pct}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
