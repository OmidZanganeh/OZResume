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

type EnergySplitProps = {
  protein: number;
  carbs: number;
  fat: number;
};

/** Share of today’s logged energy from protein / carbs / fat (Atwater). */
export function MacroEnergySplit({ protein, carbs, fat }: EnergySplitProps) {
  const kP = Math.max(0, protein) * 4;
  const kC = Math.max(0, carbs) * 4;
  const kF = Math.max(0, fat) * 9;
  const total = kP + kC + kF;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  if (total <= 0) {
    return (
      <div className="nutrition-viz-card nutrition-viz-card--empty">
        <h3 className="nutrition-viz-title">Energy from macros</h3>
        <p className="nutrition-viz-caption">Log meals for this day to see how calories split across protein, carbs, and fat.</p>
      </div>
    );
  }

  const pPct = kP / total;
  const cPct = kC / total;
  const fPct = kF / total;

  return (
    <div className="nutrition-viz-card nutrition-viz-card--split">
      <h3 className="nutrition-viz-title nutrition-viz-span-full">Energy from macros</h3>
      <p className="nutrition-viz-caption nutrition-viz-span-full">Approximate calories from protein (4 kcal/g), carbs (4), fat (9).</p>
      <div className="nutrition-viz-body">
        <div className="nutrition-macro-stack" role="img" aria-label={`Protein ${pct(kP)} percent, carbs ${pct(kC)} percent, fat ${pct(kF)} percent of macro calories`}>
          <span className="nutrition-macro-stack-seg" style={{ flex: pPct, background: COL.protein }} title={`Protein ~${pct(kP)}%`} />
          <span className="nutrition-macro-stack-seg" style={{ flex: cPct, background: COL.carbs }} title={`Carbs ~${pct(kC)}%`} />
          <span className="nutrition-macro-stack-seg" style={{ flex: fPct, background: COL.fat }} title={`Fat ~${pct(kF)}%`} />
        </div>
        <ul className="nutrition-macro-legend">
          <li><span className="nutrition-dot" style={{ background: COL.protein }} /> Protein ~{pct(kP)}%</li>
          <li><span className="nutrition-dot" style={{ background: COL.carbs }} /> Carbs ~{pct(kC)}%</li>
          <li><span className="nutrition-dot" style={{ background: COL.fat }} /> Fat ~{pct(kF)}%</li>
        </ul>
      </div>
      <div className="nutrition-donut-wrap" aria-hidden>
        <svg className="nutrition-donut" viewBox="0 0 36 36">
          <DonutSegments p={pPct} c={cPct} f={fPct} />
        </svg>
      </div>
    </div>
  );
}

function DonutSegments({ p, c, f }: { p: number; c: number; f: number }) {
  const r = 15.915;
  const cx = 18;
  const cy = 18;
  const circ = 2 * Math.PI * r;
  const dashFor = (frac: number) => `${frac * circ} ${circ}`;
  return (
    <>
      <circle className="nutrition-donut-ring" cx={cx} cy={cy} r={r} fill="none" strokeWidth="4" stroke={COL.muted} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        strokeWidth="4"
        stroke={COL.protein}
        strokeDasharray={dashFor(p)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        strokeWidth="4"
        stroke={COL.carbs}
        strokeDasharray={dashFor(c)}
        strokeDashoffset={-p * circ}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        strokeWidth="4"
        stroke={COL.fat}
        strokeDasharray={dashFor(f)}
        strokeDashoffset={-(p + c) * circ}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
}

type SevenDayCaloriesProps = {
  days: NutritionDayRollup[];
  goalKcal: number;
  highlightDateKey: string;
  windowDays: number;
};

export function SevenDayCaloriesChart({ days, goalKcal, highlightDateKey, windowDays }: SevenDayCaloriesProps) {
  const n = days.length || 1;
  const w = Math.min(720, Math.max(268, 12 * n + 96));
  const h = 120;
  const padL = 8;
  const padR = 8;
  const padT = 18;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxCal = Math.max(goalKcal * 1.05, ...days.map((d) => d.calories), 1);
  const barW = Math.min(26, (innerW / n) * 0.58);
  const gap = innerW / n;

  const barX = (i: number) => padL + gap * i + (gap - barW) / 2;
  const barH = (cals: number) => (cals / maxCal) * innerH;
  const goalY = padT + innerH - (goalKcal / maxCal) * innerH;

  return (
    <div className="nutrition-viz-card nutrition-viz-card--wide">
      <h3 className="nutrition-viz-title">{windowDays}-day calories vs target</h3>
      <p className="nutrition-viz-caption">Bar height = logged kcal; dashed line = your calorie goal.</p>
      <svg className="nutrition-chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <line
          x1={padL}
          x2={w - padR}
          y1={goalY}
          y2={goalY}
          stroke="rgba(45, 212, 191, 0.55)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <text x={padL} y={goalY - 5} fill="rgba(148, 163, 184, 0.95)" fontSize="9" fontWeight="600">
          Goal {Math.round(goalKcal)}
        </text>
        {days.map((d, i) => {
          const x = barX(i);
          const bh = barH(d.calories);
          const y = padT + innerH - bh;
          const isHi = d.dateKey === highlightDateKey;
          return (
            <g key={d.dateKey}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(bh, 1)}
                rx={4}
                fill={isHi ? COL.kcal : 'rgba(45, 212, 191, 0.45)'}
                stroke={isHi ? COL.kcal : 'none'}
                strokeWidth={isHi ? 1.5 : 0}
                className="nutrition-cal-bar"
              >
                <title>{`${d.dateKey}: ${Math.round(d.calories)} kcal`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={h - 8}
                textAnchor="middle"
                fill="var(--gf-text-dim)"
                fontSize="9"
              >
                {new Date(d.dateKey + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
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
    <div className="nutrition-viz-card nutrition-viz-card--stretch nutrition-week-rings-card">
      <h3 className="nutrition-viz-title">{n}-day at a glance</h3>
      <p className="nutrition-viz-caption">
        Each ring is one day: gray track = your goal; colored arc = share of goal (capped at 100% for the arc). Center = logged amount. Scroll horizontally on small screens when the window is long.
      </p>
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
    <div className="nutrition-viz-card nutrition-viz-card--compact">
      <h3 className="nutrition-viz-title">Today’s meals by energy</h3>
      <p className="nutrition-viz-caption">Wider bar = more of today&apos;s calories from that item.</p>
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
