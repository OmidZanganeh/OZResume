'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './SkillBar.module.css';

export default function SkillBar({ label, level }: { label: string; level: number }) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth(level), 100);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [level]);

  return (
    <div ref={ref} className={styles.row}>
      <span className={styles.label}>{label}</span>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${width}%` }} />
      </div>
      <span className={styles.pct}>{level}%</span>
    </div>
  );
}
