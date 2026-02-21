'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './SkillRadar.module.css';

const SKILLS = [
  { label: 'GIS & Spatial',    value: 95, angle: -90  },
  { label: 'Coding',            value: 88, angle: -30  },
  { label: 'AI & Automation',  value: 82, angle:  30  },
  { label: 'SQL & Data',       value: 75, angle:  90  },
  { label: 'Remote Sensing',   value: 85, angle: 150  },
  { label: 'Fiber Networks',   value: 80, angle: 210  },
];

const CX = 200, CY = 200, R = 140;
const LEVELS = [0.25, 0.5, 0.75, 1];

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function pt(angle: number, r: number) {
  return {
    x: CX + r * Math.cos(toRad(angle)),
    y: CY + r * Math.sin(toRad(angle)),
  };
}

function polygonPoints(prog: number) {
  return SKILLS
    .map(s => {
      const p = pt(s.angle, (s.value / 100) * R * prog);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

function bgPoints(level: number) {
  return SKILLS
    .map(s => { const p = pt(s.angle, R * level); return `${p.x},${p.y}`; })
    .join(' ');
}

// Offset label position to avoid overlapping the polygon
function labelPos(angle: number) {
  const pad = 28;
  const p = pt(angle, R + pad);
  let anchor: 'start' | 'middle' | 'end' = 'middle';
  if (p.x < CX - 10) anchor = 'end';
  else if (p.x > CX + 10) anchor = 'start';
  return { x: p.x, y: p.y, anchor };
}

type Props = { compact?: boolean };

export default function SkillRadar({ compact = false }: Props) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          let start: number | null = null;
          const duration = 1100;
          const step = (ts: number) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            // Ease out cubic
            setProgress(1 - Math.pow(1 - p, 3));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <svg viewBox="0 0 400 400" className={styles.svg}>
        {/* Background grid rings */}
        {LEVELS.map((lvl, i) => (
          <polygon
            key={i}
            points={bgPoints(lvl)}
            className={styles.bgPoly}
          />
        ))}

        {/* Axis lines */}
        {SKILLS.map((s, i) => {
          const end = pt(s.angle, R);
          return (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={end.x} y2={end.y}
              className={styles.axisLine}
            />
          );
        })}

        {/* Skill polygon */}
        <polygon
          points={polygonPoints(progress)}
          className={styles.skillPoly}
        />

        {/* Skill dots */}
        {SKILLS.map((s, i) => {
          const p = pt(s.angle, (s.value / 100) * R * progress);
          return (
            <circle key={i} cx={p.x} cy={p.y} r={4} className={styles.dot} />
          );
        })}

        {/* Labels */}
        {SKILLS.map((s, i) => {
          const { x, y, anchor } = labelPos(s.angle);
          return (
            <text key={i} x={x} y={y} textAnchor={anchor} className={styles.label}>
              {s.label}
            </text>
          );
        })}

        {/* Value labels (shown at full progress) */}
        {progress > 0.8 && SKILLS.map((s, i) => {
          const p = pt(s.angle, (s.value / 100) * R * progress - 14);
          return (
            <text key={i} x={p.x} y={p.y + 4} textAnchor="middle" className={styles.valueTip}>
              {s.value}
            </text>
          );
        })}
      </svg>

      {/* Legend (hidden in compact/spider-only mode) */}
      {!compact && (
      <div className={styles.legend}>
        {SKILLS.map((s, i) => (
          <div key={i} className={styles.legendItem}>
            <span className={styles.legendBar} style={{ width: `${s.value * 0.9}%` }} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendVal}>{s.value}</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
