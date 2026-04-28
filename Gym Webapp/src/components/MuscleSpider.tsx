import { useEffect, useRef, useState } from 'react';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import type { MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUP_CALENDAR_COLOR } from './calendarMuscleColors';

const CX = 250, CY = 220, R = 165;
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
  const ref = useRef<HTMLDivElement>(null);

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
  }, [counts]); // Re-animate if data changes

  const maxVal = Math.max(...Array.from(counts.values()), 1);
  const muscles = MUSCLE_GROUPS
    .map(g => ({ g, val: counts.get(g) ?? 0 }))
    .sort((a, b) => b.val - a.val)
    .map((m, i) => {
      const score = Math.min(100, (m.val / maxVal) * 100);
      return {
        label: m.g,
        score,
        originalValue: m.val,
        angle: -90 + (360 / MUSCLE_GROUPS.length) * i,
        color: MUSCLE_GROUP_CALENDAR_COLOR[m.g] || '#94a3b8'
      };
    });

  const polygonPoints = muscles
    .map(m => {
      const p = pt(m.angle, (m.score / 100) * R * progress);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <div ref={ref} className="muscle-spider">
      <svg viewBox="0 0 500 460" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        {/* Background grid rings */}
        {LEVELS.map((lvl, i) => (
          <polygon
            key={i}
            points={muscles.map(m => { const p = pt(m.angle, R * lvl); return `${p.x},${p.y}`; }).join(' ')}
            fill="none"
            stroke="var(--gf-border)"
            strokeWidth="1"
            strokeDasharray={i === 3 ? "0" : "4 4"}
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {muscles.map((m, i) => {
          const end = pt(m.angle, R);
          return (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={end.x} y2={end.y}
              stroke="var(--gf-border)"
              strokeWidth="1"
              opacity={0.3}
            />
          );
        })}

        {/* Skill polygon */}
        <polygon
          points={polygonPoints}
          fill="var(--gf-accent)"
          fillOpacity={0.25}
          stroke="var(--gf-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data dots */}
        {muscles.map((m, i) => {
          const p = pt(m.angle, (m.score / 100) * R * progress);
          if (m.score === 0 && progress < 1) return null;
          return (
            <circle 
              key={i} 
              cx={p.x} 
              cy={p.y} 
              r={3} 
              fill={m.color}
              stroke="#fff"
              strokeWidth="1"
            />
          );
        })}

        {/* Labels */}
        {muscles.map((m, i) => {
          const pad = 24;
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
              fill={m.originalValue === 0 ? "var(--gf-text-dim)" : "var(--gf-text)"}
              style={{ opacity: m.originalValue === 0 ? 0.6 : 1 }}
            >
              {m.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
