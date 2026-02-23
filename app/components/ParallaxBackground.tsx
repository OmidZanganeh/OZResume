'use client';

import { useState, useEffect } from 'react';
import styles from './ParallaxBackground.module.css';

/** Scroll-driven parallax rate: 0 = fixed, 0.35 = moves at 35% of scroll speed (lag) */
const PARALLAX_RATE = 0.35;

function useScrollY() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setScrollY(window.scrollY);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return scrollY;
}

export default function ParallaxBackground() {
  const scrollY = useScrollY();
  const offset = -scrollY * PARALLAX_RATE;

  return (
    <div
      className={styles.parallaxBg}
      style={{ transform: `translate3d(0, ${offset}px, 0)` }}
      aria-hidden
    />
  );
}
