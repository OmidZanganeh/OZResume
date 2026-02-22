'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';
import styles from './ScrollFadeIn.module.css';

type Props = {
  children: ReactNode;
  /** Optional delay in ms before animation starts (stagger effect) */
  delay?: number;
  /** Minimum fraction of element visible to trigger (0–1). Default 0.08 */
  threshold?: number;
  /** Fly-in direction. Default 'up'. Use 'right' for sidebar (enters from right). */
  direction?: 'up' | 'right' | 'left';
  /** Optional class for grid placement etc. */
  className?: string;
};

export default function ScrollFadeIn({ children, delay = 0, threshold = 0.08, direction = 'up', className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const directionClass = direction === 'right' ? styles.fromRight : direction === 'left' ? styles.fromLeft : '';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        timeoutId = setTimeout(() => setVisible(true), delay);
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [delay, threshold]);

  return (
    <div
      ref={ref}
      className={`${styles.wrap} ${directionClass} ${visible ? styles.visible : ''} ${className ?? ''}`.trim()}
    >
      {children}
    </div>
  );
}
