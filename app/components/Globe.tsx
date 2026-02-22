'use client';

import { useEffect, useRef } from 'react';
import styles from './Globe.module.css';

type Props = { position?: 'left' | 'right' };

export default function Globe({ position = 'right' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) el.setAttribute('data-reduced-motion', 'true');
  }, []);

  return (
    <div ref={containerRef} className={`${styles.wrapper} ${position === 'left' ? styles.left : styles.right}`} aria-hidden>
      <div className={styles.globe}>
        <svg className={styles.sphere} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Latitude lines */}
          <ellipse cx="50" cy="50" rx="50" ry="8" className={styles.lat} />
          <ellipse cx="50" cy="50" rx="48" ry="16" className={styles.lat} />
          <ellipse cx="50" cy="50" rx="43" ry="22" className={styles.lat} />
          <ellipse cx="50" cy="50" rx="35" ry="26" className={styles.lat} />
          <ellipse cx="50" cy="50" rx="25" ry="28" className={styles.lat} />
          <ellipse cx="50" cy="50" rx="14" ry="29" className={styles.lat} />
          {/* Longitude arcs (vertical half-ellipses) */}
          <path d="M 50 5 A 50 50 0 0 1 50 95" className={styles.lon} />
          <path d="M 50 5 A 50 50 0 0 0 50 95" className={styles.lon} />
          <path d="M 50 8 A 47 47 0 0 1 50 92" className={styles.lon} />
          <path d="M 50 8 A 47 47 0 0 0 50 92" className={styles.lon} />
          <path d="M 50 15 A 40 40 0 0 1 50 85" className={styles.lon} />
          <path d="M 50 15 A 40 40 0 0 0 50 85" className={styles.lon} />
          <path d="M 50 25 A 30 30 0 0 1 50 75" className={styles.lon} />
          <path d="M 50 25 A 30 30 0 0 0 50 75" className={styles.lon} />
        </svg>
      </div>
    </div>
  );
}
