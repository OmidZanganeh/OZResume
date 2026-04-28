import { useEffect, useState } from 'react';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import type { MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUP_CALENDAR_COLOR } from './calendarMuscleColors';

const CX = 250, CY = 220, R = 150;
const LEVELS = [0.25, 0.5, 0.75, 1];

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function pt(angle: number, r: number) {
  return {
    x: CX + r * Math.cos(toRad(angle)),
    y: CY + r * Math.sin(toRad(angle)),
  };
}

type Props = {
  counts: Map<MuscleGroup, number>;
};

export function MuscleSpider({ counts }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      // Ease out cubic
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [counts]);

  // Filter out non-bodyweight groups to match report
  const targetGroups = MUSCLE_GROUPS.filter(g => g !== 'Cardio' && g !== 'Mobility');
  const maxVal = Math.max(...targetGroups.map(g => counts.get(g) ?? 0), 1);
  
  const muscles = targetGroups
    .map(g => ({ g, val: counts.get(g) ?? 0 }))
    .sort((a, b) => b.val - a.val)
    .map((m, i) => {
      const score = m.val / maxVal;
      const angle = -90 + (360 / targetGroups.length) * i;
      return {
        label: m.g,
        score,
        val: m.val,
        angle,
        color: MUSCLE_GROUP_CALENDAR_COLOR[m.g] || '#94a3b8'
      };
    });

  const polygonPoints = muscles
    .map(m => {
      const p = pt(m.angle, m.score * R * progress);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="muscle-spider">
      <svg viewBox="0 0 500 460" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        {/* Background grid rings */}
        {LEVELS.map((lvl, i) => (
          <polygon
            key={i}
            points={muscles.map(m => { const p = pt(m.angle, R * lvl); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ')}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray={i === 3 ? "0" : "4 4"}
          />
        ))}

        {/* Axis lines */}
        {muscles.map((m, i) => {
          const end = pt(m.angle, R);
          return (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={end.x.toFixed(1)} y2={end.y.toFixed(1)}
              stroke="#334155"
              strokeWidth="1"
              opacity={0.4}
            />
          );
        })}

        {/* Main polygon */}
        <polygon
          points={polygonPoints}
          fill="#00b4d820"
          stroke="#00b4d8"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Point dots */}
        {progress > 0.8 && muscles.map((m, i) => {
          const p = pt(m.angle, m.score * R * progress);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={5}
              fill={m.color}
              stroke="#fff"
              strokeWidth="1.5"
              style={{ opacity: (progress - 0.8) * 5 }}
            />
          );
        })}

        {/* Labels */}
        {muscles.map((m, i) => {
          const pad = 25;
          const p = pt(m.angle, R + pad);
          let anchor: 'start' | 'middle' | 'end' = 'middle';
          if (p.x < CX - 20) anchor = 'end';
          else if (p.x > CX + 20) anchor = 'start';
          
          return (
            <text 
              key={i} 
              x={p.x} 
              y={p.y + 4} 
              textAnchor={anchor} 
              fontSize="11" 
              fontWeight="600"
              fill={m.val === 0 ? "var(--gf-text-dim)" : "var(--gf-text)"}
              style={{ opacity: m.val === 0 ? 0.6 : 1 }}
            >
              {m.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
