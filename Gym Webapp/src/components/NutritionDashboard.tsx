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

type MacroEnergySplitProps = {
  protein: number;
  carbs: number;
  fat: number;
  /** Logged kcal for the day (may differ slightly from macro-derived kcal). */
  caloriesLogged: number;
  calorieGoal: number;
  fiber: number;
  fiberGoal: number;
};

/** Outer ring = calories vs goal; inner donut = P/C/F share of macro-derived kcal. */
export function MacroEnergySplit({
  protein,
  carbs,
  fat,
  caloriesLogged,
  calorieGoal,
  fiber,
  fiberGoal,
}: MacroEnergySplitProps) {
  const kP = Math.max(0, protein) * 4;
  const kC = Math.max(0, carbs) * 4;
  const kF = Math.max(0, fat) * 9;
  const macroKcal = kP + kC + kF;
  const pct = (n: number) => (macroKcal > 0 ? Math.round((n / macroKcal) * 100) : 0);
  const pFrac = macroKcal > 0 ? kP / macroKcal : 0;
  const cFrac = macroKcal > 0 ? kC / macroKcal : 0;
  const fFrac = macroKcal > 0 ? kF / macroKcal : 0;

  const hasAnything = caloriesLogged > 0 || macroKcal > 0;

  if (!hasAnything) {
    return (
      <div className="nutrition-viz-card nutrition-viz-card--empty nutrition-viz-card--micro">
        <h3 className="nutrition-viz-title">Today</h3>
        <p className="nutrition-viz-caption nutrition-viz-caption--tight">Log food to see calories and macro split.</p>
      </div>
    );
  }

  return (
    <div className="nutrition-viz-card nutrition-viz-card--split nutrition-viz-card--micro">
      <h3 className="nutrition-viz-title nutrition-viz-span-full">Today</h3>
      <div className="nutrition-viz-body">
        {macroKcal > 0 ? (
          <>
            <div
              className="nutrition-macro-stack"
              role="img"
              aria-label={`Protein ${pct(kP)} percent, carbs ${pct(kC)} percent, fat ${pct(kF)} percent of macro calories`}
            >
              <span className="nutrition-macro-stack-seg" style={{ flex: pFrac, background: COL.protein }} title={`Protein ~${pct(kP)}%`} />
              <span className="nutrition-macro-stack-seg" style={{ flex: cFrac, background: COL.carbs }} title={`Carbs ~${pct(kC)}%`} />
              <span className="nutrition-macro-stack-seg" style={{ flex: fFrac, background: COL.fat }} title={`Fat ~${pct(kF)}%`} />
            </div>
            <ul className="nutrition-macro-legend">
              <li>
                <span className="nutrition-dot" style={{ background: COL.protein }} /> Protein ~{pct(kP)}%
              </li>
              <li>
                <span className="nutrition-dot" style={{ background: COL.carbs }} /> Carbs ~{pct(kC)}%
              </li>
              <li>
                <span className="nutrition-dot" style={{ background: COL.fat }} /> Fat ~{pct(kF)}%
              </li>
            </ul>
          </>
        ) : (
          <p className="nutrition-viz-caption nutrition-viz-caption--tight" style={{ marginBottom: '0.5rem' }}>
            Add protein, carbs, or fat to see macro split. Outer ring shows kcal vs goal.
          </p>
        )}
        <p className="nutrition-fiber-inline">
          <span className="nutrition-fiber-dot" style={{ background: COL.fiber }} aria-hidden />
          Fiber <strong>{Math.round(fiber * 10) / 10}</strong> / {Math.round(fiberGoal * 10) / 10} g
        </p>
      </div>
      <div className="nutrition-donut-wrap nutrition-donut-wrap--dual-ring">
        <svg className="nutrition-donut" viewBox="0 0 44 44" role="img" aria-label={`Calories ${Math.round(caloriesLogged)} of ${Math.round(calorieGoal)}; macro ring shows protein carbs fat split`}>
          <title>{`Calories ${Math.round(caloriesLogged)} / ${Math.round(calorieGoal)} kcal`}</title>
          <CalorieWrappedMacroDonut
            p={pFrac}
            c={cFrac}
            f={fFrac}
            caloriesLogged={caloriesLogged}
            calorieGoal={calorieGoal}
            hasMacroSplit={macroKcal > 0}
          />
        </svg>
      </div>
    </div>
  );
}

function CalorieWrappedMacroDonut({
  p,
  c,
  f,
  caloriesLogged,
  calorieGoal,
  hasMacroSplit,
}: {
  p: number;
  c: number;
  f: number;
  caloriesLogged: number;
  calorieGoal: number;
  hasMacroSplit: boolean;
}) {
  const cx = 22;
  const cy = 22;
  const R_OUT = 19;
  const R_IN = 12;
  const swOut = 3;
  const swIn = 3.25;
  const circOut = 2 * Math.PI * R_OUT;
  const circIn = 2 * Math.PI * R_IN;
  const dashFor = (frac: number, circ: number) => `${Math.max(0, Math.min(1, frac)) * circ} ${circ}`;
  const calFrac = calorieGoal > 0 ? Math.min(Math.max(caloriesLogged / calorieGoal, 0), 1) : 0;

  return (
    <>
      <circle cx={cx} cy={cy} r={R_OUT} fill="none" stroke="rgba(148, 163, 184, 0.28)" strokeWidth={swOut} />
      <circle
        cx={cx}
        cy={cy}
        r={R_OUT}
        fill="none"
        stroke={COL.kcal}
        strokeWidth={swOut}
        strokeLinecap="round"
        strokeDasharray={dashFor(calFrac, circOut)}
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity={0.92}
      />
      {hasMacroSplit ? (
        <>
          <circle cx={cx} cy={cy} r={R_IN} fill="none" strokeWidth={swIn} stroke={COL.muted} />
          <circle
            cx={cx}
            cy={cy}
            r={R_IN}
            fill="none"
            strokeWidth={swIn}
            stroke={COL.protein}
            strokeDasharray={dashFor(p, circIn)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={R_IN}
            fill="none"
            strokeWidth={swIn}
            stroke={COL.carbs}
            strokeDasharray={dashFor(c, circIn)}
            strokeDashoffset={-p * circIn}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={R_IN}
            fill="none"
            strokeWidth={swIn}
            stroke={COL.fat}
            strokeDasharray={dashFor(f, circIn)}
            strokeDashoffset={-(p + c) * circIn}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </>
      ) : (
        <circle cx={cx} cy={cy} r={R_IN} fill="none" strokeWidth={swIn} stroke="rgba(148, 163, 184, 0.2)" />
      )}
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="var(--gf-text)">
        {Math.round(caloriesLogged)}
      </text>
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize="4.8" fill="#94a3b8">
        / {Math.round(calorieGoal)} kcal
      </text>
    </>
  );
}

const WEEK_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const;

type WeekStripesProps = {
  days: NutritionDayRollup[];
  goals: NutritionGoals;
  highlightDateKey: string;
};

/** One row per nutrient: compact goal rings (full gray ring = target; colored arc = logged; number centered). */
export function WeekNutrientStrips({ days, goals, highlightDateKey }: WeekStripesProps) {
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
  const labelW = 108;
  const cellW = Math.max(36, Math.min(52, Math.floor(680 / Math.max(n, 8))));
  const rowH = 58;
  const padT = 10;
  const totalW = labelW + n * cellW;
  const totalH = padT + WEEK_KEYS.length * rowH + 6;

  const fmtCenter = (key: (typeof WEEK_KEYS)[number], val: number) => {
    if (key === 'calories') return String(Math.round(val));
    const v = Math.round(val * 10) / 10;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };

  return (
    <div className="nutrition-viz-card nutrition-viz-card--stretch nutrition-week-rings-card nutrition-viz-card--micro">
      <h3 className="nutrition-viz-title">{n}-day rings</h3>
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
                <text x={4} y={cy + 4} fill="var(--gf-text-muted)" fontSize="11" fontWeight="600">
                  {labels[key]}
                </text>
                {days.map((d, i) => {
                  const val = d[key];
                  const cx = labelW + i * cellW + cellW / 2;
                  const r = Math.max(12, Math.min(17, (cellW - 14) / 2));
                  const strokeW = 3.5;
                  const circ = 2 * Math.PI * r;
                  const rawFrac = goal > 0 ? val / goal : 0;
                  const arcFrac = Math.min(Math.max(rawFrac, 0), 1);
                  const dash = `${arcFrac * circ} ${circ}`;
                  const isHi = d.dateKey === highlightDateKey;
                  const dow = new Date(d.dateKey + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
                  const centerTxt = fmtCenter(key, val);
                  const fs = centerTxt.length > 4 ? 8.5 : centerTxt.length > 3 ? 9.5 : 11;
                  return (
                    <g key={d.dateKey}>
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
                      <text x={cx} y={cy + r + 11} textAnchor="middle" fill="var(--gf-text-dim)" fontSize="8.5">
                        {dow}
                      </text>
                      <title>{`${d.dateKey} · ${labels[key]} ${typeof val === 'number' ? val.toFixed(1) : val} (goal ${goal})`}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
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
    <div className="nutrition-viz-card nutrition-viz-card--compact nutrition-viz-card--micro">
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
