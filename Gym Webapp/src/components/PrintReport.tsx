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
  const CX = 250, CY = 220, R = 115;
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
    <svg viewBox="0 0 500 460" style={{ width: '100%', height: 'auto' }}>
      {LEVELS.map((lvl, li) => (
        <polygon key={li} points={items.map(m => { const p = pt(CX, CY, m.angle, R * lvl); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ')}
          fill="none" stroke="#334155" strokeWidth="1" strokeDasharray={li === 3 ? '0' : '3 3'} />
      ))}
      {items.map((m, i) => { const end = pt(CX, CY, m.angle, R); return <line key={i} x1={CX} y1={CY} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="#334155" strokeWidth="1" />; })}
      <polygon points={polyPoints} fill="#00b4d830" stroke="#00b4d8" strokeWidth="2" strokeLinejoin="round" />
      {items.map((m, i) => { const p = pt(CX, CY, m.angle, m.score * R); return <circle key={i} cx={p.x} cy={p.y} r={4} fill={m.color} stroke="#fff" strokeWidth="1.5" />; })}
      {items.map((m, i) => {
        const pad = 22; const p = pt(CX, CY, m.angle, R + pad);
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        if (p.x < CX - 20) anchor = 'end'; else if (p.x > CX + 20) anchor = 'start';
        return <text key={i} x={p.x.toFixed(1)} y={(p.y + 4).toFixed(1)} textAnchor={anchor} fontSize="10" fontWeight="700" fill={m.val === 0 ? '#64748b' : '#f1f5f9'}>{m.g}</text>;
      })}
    </svg>
  );
}

function BarChartSVG({ counts }: { counts: Map<MuscleGroup, number> }) {
  const muscles = MUSCLE_GROUPS.filter(g => g !== 'Cardio' && g !== 'Mobility');
  const maxVal = Math.max(...muscles.map(g => counts.get(g) ?? 0), 1);
  const BAR_H = 14, GAP = 6, LEFT = 90, RIGHT = 20, W = 420;
  const totalH = muscles.length * (BAR_H + GAP) + 10;

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} style={{ width: '100%', height: 'auto' }}>
      {muscles.map((g, i) => {
        const val = counts.get(g) ?? 0;
        const barW = Math.max(val === 0 ? 0 : 4, (val / maxVal) * (W - LEFT - RIGHT));
        const y = i * (BAR_H + GAP) + 3;
        const color = val > 0 ? MUSCLE_GROUP_CALENDAR_COLOR[g] : '#1e293b';
        return (
          <g key={g}>
            <text x={LEFT - 6} y={y + BAR_H * 0.75} textAnchor="end" fontSize="9" fontWeight="600" fill={val === 0 ? '#475569' : '#f1f5f9'}>{g}</text>
            <rect x={LEFT} y={y} width={W - LEFT - RIGHT} height={BAR_H} rx="3" fill="#1e293b" />
            {val > 0 && <rect x={LEFT} y={y} width={barW} height={BAR_H} rx="3" fill={color} />}
            {val === 0 && <rect x={LEFT} y={y} width={3} height={BAR_H} rx="1" fill="#ef4444" />}
            <text x={LEFT + barW + 4} y={y + BAR_H * 0.75} fontSize="9" fontWeight="800" fill={val === 0 ? '#ef4444' : '#94a3b8'}>{val === 0 ? '—' : `${val}d`}</text>
          </g>
        );
      })}
    </svg>
  );
}

function WeeklyBarSVG({ weeklyData }: { weeklyData: { label: string; count: number }[] }) {
  const maxVal = Math.max(...weeklyData.map(w => w.count), 1);
  const W = 420, H = 100, BAR_W = Math.floor((W - 40) / weeklyData.length) - 4;
  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 'auto' }}>
      {weeklyData.map((w, i) => {
        const barH = Math.max(2, (w.count / maxVal) * H);
        const x = 20 + i * (BAR_W + 4);
        const y = H - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={BAR_W} height={barH} rx="2"
              fill={w.count === 0 ? '#1e293b' : '#00b4d8'} fillOpacity={w.count === 0 ? 1 : 0.85} />
            {w.count > 0 && <text x={x + BAR_W / 2} y={y - 3} textAnchor="middle" fontSize="8" fontWeight="800" fill="#00b4d8">{w.count}</text>}
            <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize="7.5" fill="#64748b">{w.label}</text>
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
  if (total === 0) return <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>No data for this period.</p>;

  const CX = 80, CY = 80, R = 60, INNER = 35;
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 160 160" style={{ width: 120, height: 120, flexShrink: 0 }}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#f1f5f9">{total}d</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {slices.filter(s => s.val > 0).map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: '#f1f5f9' }}>{s.label}</span>
            <span style={{ color: '#64748b', marginLeft: 'auto' }}>{s.val}d · {Math.round((s.val / total) * 100)}%</span>
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

  // Quick Insight Logic
  const insight = data.consistency > 85 ? 'Elite Consistency' : data.consistency > 60 ? 'Active Momentum' : 'Needs Regularity';
  const balanceInsight = data.neglectedMuscles.length < 2 ? 'Excellent Balance' : 'Focus Needed';

  return (
    <div id="print-report">
      {/* ── TOP HEADER ──────────────────────────────────────────────── */}
      <div className="pr-header">
        <div className="pr-header-left">
          <div className="pr-brand">
            <span className="pr-logo">🏋️</span>
            <span className="pr-app-name">GYM FLOW INTELLIGENCE</span>
          </div>
          <h1 className="pr-main-title">Athelete Performance Report</h1>
          <div className="pr-header-meta">
            <span>Period: <strong>Last {data.analysisDays} Days</strong></span>
            <span>Generated: <strong>{today}</strong></span>
          </div>
        </div>

        <div className="pr-header-right">
          <div className="pr-user-box">
             <div className="pr-user-name">{data.profile.name || 'Anonymous Athlete'}</div>
             <div className="pr-user-stats">
               {data.profile.age && <span>Age {data.profile.age} &middot; </span>}
               {data.profile.weight && <span>{data.profile.weight}{data.profile.weightUnit} &middot; </span>}
               {bmi && <span>BMI {bmi.toFixed(1)}</span>}
             </div>
          </div>
          <div className="pr-insights-strip">
             <span className="pr-insight-tag">{insight}</span>
             <span className="pr-insight-tag">{balanceInsight}</span>
          </div>
        </div>
      </div>

      {/* ── KPI HIGHLIGHTS ─────────────────────────────────────────── */}
      <div className="pr-kpi-row">
        <div className="pr-kpi-card">
          <div className="pr-kpi-val">{data.totalWorkouts}</div>
          <div className="pr-kpi-label">Workouts</div>
        </div>
        <div className="pr-kpi-card">
          <div className="pr-kpi-val">{data.totalSets}</div>
          <div className="pr-kpi-label">Total Sets</div>
        </div>
        <div className="pr-kpi-card">
          <div className="pr-kpi-val">{data.streak.current}d</div>
          <div className="pr-kpi-label">Current Streak</div>
        </div>
        <div className="pr-kpi-card">
          <div className="pr-kpi-val">{data.consistency}%</div>
          <div className="pr-kpi-label">Consistency</div>
        </div>
      </div>

      {/* ── BODY HEATMAP SECTION ─────────────────────────────────── */}
      <div className="pr-section-full">
        <div className="pr-card">
          <div className="pr-card-header">
            <h3 className="pr-card-title">Training Focus Heatmap</h3>
            <p className="pr-card-sub">Body-wide intensity for the last {data.analysisDays} days</p>
          </div>
          <div className="pr-card-body">
             <BodyMapFigure 
               practiceCounts={data.analysisCounts} 
               practiceWindowDays={data.analysisDays}
               selectedGroups={selectedGroups}
               onToggleGroup={() => {}}
             />
          </div>
        </div>
      </div>

      <div className="pr-dashboard-grid-v2">
        {/* ── FIRST SECTION: FOCUS & BALANCE ─────────────────────── */}
        <div className="pr-row-split">
          <div className="pr-card pr-card--half">
            <div className="pr-card-header">
              <h3 className="pr-card-title">Efficiency Radar</h3>
              <p className="pr-card-sub">Muscle group training balance</p>
            </div>
            <div className="pr-card-body pr-flex-center">
               <SpiderSVG counts={data.analysisCounts} />
            </div>
          </div>
          
          <div className="pr-card pr-card--half">
            <div className="pr-card-header">
              <h3 className="pr-card-title">Movement Patterns</h3>
              <p className="pr-card-sub">Push / Pull / Legs / Core distribution</p>
            </div>
            <div className="pr-card-body pr-flex-center">
               <PPLDonut ppl={data.ppl} />
            </div>
          </div>
        </div>

        {/* ── SECOND SECTION: VOLUME & FREQUENCY ────────────────────── */}
        <div className="pr-row-split">
          <div className="pr-card pr-card--wide">
            <div className="pr-card-header">
              <h3 className="pr-card-title">Muscle Volume Analysis</h3>
              <p className="pr-card-sub">Active training days per muscle group</p>
            </div>
            <div className="pr-card-body">
               <BarChartSVG counts={data.analysisCounts} />
            </div>
          </div>
          
          <div className="pr-card pr-card--narrow">
            <div className="pr-card-header">
              <h3 className="pr-card-title">Weekly Performance</h3>
              <p className="pr-card-sub">Session frequency over 12 weeks</p>
            </div>
            <div className="pr-card-body">
               <WeeklyBarSVG weeklyData={data.weeklyData} />
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SUMMARY ────────────────────────────────────────── */}
      <div className="pr-bottom-footer">
        <div className="pr-footer-section">
          <h4 className="pr-footer-title">Top 5 Movements</h4>
          <table className="pr-mini-table">
            <thead><tr><th>Exercise</th><th>Sess</th><th>Sets</th></tr></thead>
            <tbody>
              {data.topExercises.slice(0, 5).map((ex, i) => (
                <tr key={i}><td>{ex.name}</td><td>{ex.count}</td><td>{ex.sets}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pr-footer-section pr-footer-section--alerts">
          {data.neglectedMuscles.length > 0 && (
            <div className="pr-alert-bubble pr-alert-bubble--red">
              <strong>Neglected:</strong> {data.neglectedMuscles.join(', ')}
            </div>
          )}
          {data.warnings.length > 0 && (
            <div className="pr-alert-bubble pr-alert-bubble--orange">
              {data.warnings.slice(0, 2).map((w, i) => <div key={i}>⚠️ {w}</div>)}
            </div>
          )}
        </div>
        
        <div className="pr-footer-tag">
          <div className="pr-tag-line">GYM FLOW INTELLIGENCE &middot; Professional Athlete Dashboard</div>
          <div className="pr-tag-sub">Consistency is the bridge between goals and accomplishment.</div>
        </div>
      </div>
    </div>
  );
}

