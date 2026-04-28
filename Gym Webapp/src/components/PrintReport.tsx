import { BodyMapFigure } from './BodyMapFigure';
import type { MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import { MUSCLE_GROUP_CALENDAR_COLOR } from './calendarMuscleColors';

export type ReportData = {
  profile: { name: string; weight: string; weightUnit: 'kg' | 'lbs'; height: string; heightUnit: 'cm' | 'ft'; age: string };
  totalWorkouts: number;
  totalSets: number;
  totalCompletions: number;
  streak: { current: number; longest: number };
  consistency: number;
  analysisDays: number;
  analysisCounts: Map<MuscleGroup, number>;
  ppl: { push: number; pull: number; legs: number; core: number };
  topExercises: { name: string; count: number; sets: number }[];
  neglectedMuscles: MuscleGroup[];
  recentSessions: { date: string; groups: MuscleGroup[]; entries: number }[];
  weeklyData: { label: string; count: number }[];
  warnings: string[];
};

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function pt(cx: number, cy: number, angle: number, r: number) {
  return { x: cx + r * Math.cos(toRad(angle)), y: cy + r * Math.sin(toRad(angle)) };
}

function SpiderSVG({ counts }: { counts: Map<MuscleGroup, number> }) {
  const CX = 160, CY = 145, R = 90;
  const muscles = MUSCLE_GROUPS.filter(g => g !== 'Cardio' && g !== 'Mobility');
  const maxVal = Math.max(...muscles.map(g => counts.get(g) ?? 0), 1);
  const items = muscles
    .map(g => ({ g, val: counts.get(g) ?? 0 }))
    .sort((a, b) => b.val - a.val)
    .map((m, i) => {
      const score = m.val / maxVal;
      const angle = -90 + (360 / muscles.length) * i;
      return { g: m.g, val: m.val, score, angle, color: MUSCLE_GROUP_CALENDAR_COLOR[m.g] };
    });
  const polyPoints = items.map(m => { const p = pt(CX, CY, m.angle, m.score * R); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
  const LEVELS = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox="0 0 320 310" style={{ width: '100%', height: 'auto' }}>
      {LEVELS.map((lvl, li) => (
        <polygon key={li} points={items.map(m => { const p = pt(CX, CY, m.angle, R * lvl); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ')}
          fill="none" stroke="#334155" strokeWidth="1" strokeDasharray={li === 3 ? '0' : '3 3'} />
      ))}
      {items.map((m, i) => { const end = pt(CX, CY, m.angle, R); return <line key={i} x1={CX} y1={CY} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="#334155" strokeWidth="1" />; })}
      <polygon points={polyPoints} fill="#00b4d820" stroke="#00b4d8" strokeWidth="2" strokeLinejoin="round" />
      {items.map((m, i) => { const p = pt(CX, CY, m.angle, m.score * R); return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={m.color} stroke="#fff" strokeWidth="1" />; })}
      {items.map((m, i) => {
        const pad = 18; const p = pt(CX, CY, m.angle, R + pad);
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        if (p.x < CX - 15) anchor = 'end'; else if (p.x > CX + 15) anchor = 'start';
        return <text key={i} x={p.x.toFixed(1)} y={(p.y + 3).toFixed(1)} textAnchor={anchor} fontSize="8" fontWeight="700" fill={m.val === 0 ? '#64748b' : '#f1f5f9'}>{m.g}</text>;
      })}
    </svg>
  );
}

function WeeklyBarSVG({ weeklyData }: { weeklyData: { label: string; count: number }[] }) {
  const maxVal = Math.max(...weeklyData.map(w => w.count), 1);
  const W = 320, H = 80, BAR_W = Math.floor((W - 30) / weeklyData.length) - 3;
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ width: '100%', height: 'auto' }}>
      {weeklyData.map((w, i) => {
        const barH = Math.max(2, (w.count / maxVal) * H);
        const x = 15 + i * (BAR_W + 3);
        const y = H - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={BAR_W} height={barH} rx="2"
              fill={w.count === 0 ? '#1e293b' : '#00b4d8'} fillOpacity={w.count === 0 ? 1 : 0.85} />
            {w.count > 0 && <text x={x + BAR_W / 2} y={y - 2} textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#00b4d8">{w.count}</text>}
            <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize="6" fill="#64748b">{w.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PPLDonut({ ppl }: { ppl: { push: number; pull: number; legs: number; core: number } }) {
  const slices = [
    { label: 'Push', val: ppl.push, color: '#ea580c' },
    { label: 'Pull', val: ppl.pull, color: '#2563eb' },
    { label: 'Legs', val: ppl.legs, color: '#16a34a' },
    { label: 'Core', val: ppl.core, color: '#65a30d' },
  ];
  const total = slices.reduce((s, x) => s + x.val, 0);
  if (total === 0) return <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.72rem' }}>No data yet.</p>;

  const CX = 55, CY = 55, R = 46, INNER = 27;
  let startAngle = -90;
  const paths: { d: string; color: string; label: string; val: number }[] = [];

  for (const sl of slices) {
    if (sl.val === 0) continue;
    const sweep = (sl.val / total) * 360;
    const endAngle = startAngle + sweep;
    const r1 = toRad(startAngle), r2 = toRad(endAngle);
    const x1 = CX + R * Math.cos(r1), y1 = CY + R * Math.sin(r1);
    const x2 = CX + R * Math.cos(r2), y2 = CY + R * Math.sin(r2);
    const ix1 = CX + INNER * Math.cos(r1), iy1 = CY + INNER * Math.sin(r1);
    const ix2 = CX + INNER * Math.cos(r2), iy2 = CY + INNER * Math.sin(r2);
    const largeArc = sweep > 180 ? 1 : 0;
    paths.push({
      d: `M ${ix1} ${iy1} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${INNER} ${INNER} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      color: sl.color, label: sl.label, val: sl.val,
    });
    startAngle = endAngle;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <svg viewBox="0 0 110 110" style={{ width: 90, height: 90, flexShrink: 0 }}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
        <text x={CX} y={CY + 3} textAnchor="middle" fontSize="9" fontWeight="800" fill="#f1f5f9">{total}d</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {slices.filter(s => s.val > 0).map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: '#f1f5f9' }}>{s.label}</span>
            <span style={{ color: '#64748b', marginLeft: 'auto' }}>{Math.round((s.val / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrintReport({ data, selectedGroups }: { data: ReportData, selectedGroups: MuscleGroup[] }) {
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const hasBMI = data.profile.weight && data.profile.height;
  let bmi: number | null = null;
  if (hasBMI) {
    const weightKg = data.profile.weightUnit === 'lbs' ? parseFloat(data.profile.weight) * 0.453592 : parseFloat(data.profile.weight);
    let heightCm = 0;
    if (data.profile.heightUnit === 'ft') {
      const parts = data.profile.height.split("'");
      const ft = parseFloat(parts[0] || '0');
      const inch = parseFloat(parts[1] || '0');
      heightCm = (ft * 12 + inch) * 2.54;
    } else {
      heightCm = parseFloat(data.profile.height);
    }
    bmi = weightKg / Math.pow(heightCm / 100, 2);
  }

  const insight = data.consistency > 85 ? 'Elite Consistency' : data.consistency > 60 ? 'Active Momentum' : 'Needs Regularity';
  const balanceInsight = data.neglectedMuscles.length < 2 ? 'Excellent Balance' : 'Focus Needed';

  return (
    <div id="print-report">

      {/* ── HEADER STRIP ──────────────────────────────────────────── */}
      <div className="prl-header">
        <div className="prl-brand">
          <span className="prl-logo">🏋️</span>
          <div>
            <div className="prl-app-name">GYM FLOW INTELLIGENCE</div>
            <div className="prl-report-title">Athlete Performance Dashboard</div>
          </div>
        </div>

        <div className="prl-kpi-strip">
          {[
            { val: data.totalWorkouts, label: 'Workouts' },
            { val: data.totalSets, label: 'Total Sets' },
            { val: `${data.streak.current}d`, label: 'Streak' },
            { val: `${data.consistency}%`, label: 'Consistency' },
            { val: `${data.analysisDays}d`, label: 'Period' },
          ].map(k => (
            <div key={k.label} className="prl-kpi">
              <div className="prl-kpi-val">{k.val}</div>
              <div className="prl-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="prl-athlete">
          <div className="prl-athlete-name">{data.profile.name || 'Anonymous Athlete'}</div>
          <div className="prl-athlete-meta">
            {data.profile.age && <span>Age {data.profile.age}</span>}
            {data.profile.weight && <span>{data.profile.weight}{data.profile.weightUnit}</span>}
            {bmi && <span>BMI {bmi.toFixed(1)}</span>}
            <span>{today}</span>
          </div>
          <div className="prl-tags">
            <span className="prl-tag">{insight}</span>
            <span className="prl-tag">{balanceInsight}</span>
          </div>
        </div>
      </div>

      {/* ── 3-COLUMN MAIN GRID ──────────────────────────────────── */}
      <div className="prl-grid">

        {/* COL 1: Body Heatmap */}
        {/* COL 1: Body Heatmap */}
        <div className="prl-col">
          <div className="prl-card prl-card--full">
            <div className="prl-card-head">
              <span className="prl-card-title">Focus Heatmap</span>
              <span className="prl-card-sub">Last {data.analysisDays} days · anatomy view</span>
            </div>
            <div className="prl-card-body prl-body-map-wrap">
              <BodyMapFigure
                practiceCounts={data.analysisCounts}
                practiceWindowDays={data.analysisDays}
                selectedGroups={selectedGroups}
                onToggleGroup={() => {}}
                orphansPlacement="top"
              />
            </div>
          </div>
        </div>

        {/* COL 2: Radar + PPL Donut */}
        <div className="prl-col">
          <div className="prl-card">
            <div className="prl-card-head">
              <span className="prl-card-title">Muscle Radar</span>
              <span className="prl-card-sub">Training balance by muscle group</span>
            </div>
            <div className="prl-card-body">
              <SpiderSVG counts={data.analysisCounts} />
            </div>
          </div>

          <div className="prl-card" style={{ marginTop: '0.6rem' }}>
            <div className="prl-card-head">
              <span className="prl-card-title">Movement Patterns</span>
              <span className="prl-card-sub">Push / Pull / Legs / Core split</span>
            </div>
            <div className="prl-card-body">
              <PPLDonut ppl={data.ppl} />
            </div>
          </div>
        </div>

        {/* COL 3: Top Exercises + Weekly + Alerts */}
        <div className="prl-col">
          <div className="prl-card">
            <div className="prl-card-head">
              <span className="prl-card-title">Top Movements</span>
              <span className="prl-card-sub">Most-trained exercises</span>
            </div>
            <div className="prl-card-body">
              <table className="prl-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Exercise</th>
                    <th>Sessions</th>
                    <th>Sets</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topExercises.slice(0, 6).map((ex, i) => (
                    <tr key={i}>
                      <td style={{ color: '#64748b' }}>{i + 1}</td>
                      <td>{ex.name}</td>
                      <td style={{ color: '#00b4d8', fontWeight: 700 }}>{ex.count}</td>
                      <td style={{ color: '#94a3b8' }}>{ex.sets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="prl-card" style={{ marginTop: '0.6rem' }}>
            <div className="prl-card-head">
              <span className="prl-card-title">Weekly Volume</span>
              <span className="prl-card-sub">Sessions per week (last 12 wks)</span>
            </div>
            <div className="prl-card-body">
              <WeeklyBarSVG weeklyData={data.weeklyData} />
            </div>
          </div>

          {(data.neglectedMuscles.length > 0 || data.warnings.length > 0) && (
            <div className="prl-card prl-card--alerts" style={{ marginTop: '0.6rem' }}>
              <div className="prl-card-head">
                <span className="prl-card-title">⚠ Training Alerts</span>
              </div>
              <div className="prl-card-body">
                {data.neglectedMuscles.length > 0 && (
                  <div className="prl-alert prl-alert--red">
                    <strong>Neglected:</strong> {data.neglectedMuscles.join(', ')}
                  </div>
                )}
                {data.warnings.slice(0, 2).map((w, i) => (
                  <div key={i} className="prl-alert prl-alert--orange">{w}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <div className="prl-footer">
        <div className="prl-footer-brand">GYM FLOW · Professional Athlete Dashboard</div>
        <div className="prl-footer-quote">Consistency is the bridge between goals and accomplishment.</div>
        <div className="prl-footer-date">Generated {today}</div>
      </div>

    </div>
  );
}
