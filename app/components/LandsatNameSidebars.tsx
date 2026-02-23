'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import styles from './LandsatNameSidebars.module.css';

/** Letters for "Omid" (left) and "Zanganeh" (right). Images live in public/name/: O.png, M.png, etc. */
const OMID = ['O', 'M', 'I', 'D'] as const;
const ZANGANEH = ['Z', 'A', 'N', 'G', 'A', 'N', 'E', 'H'] as const;

function LetterSlot({ letter }: { letter: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={styles.letterWrap}>
        <span className={styles.letterFallback}>{letter}</span>
      </div>
    );
  }
  return (
    <div className={styles.letterWrap}>
      <Image
        src={`/name/${letter}.png`}
        alt={`${letter} (Landsat)`}
        width={80}
        height={80}
        className={styles.letterImg}
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function useScrollUpVisible() {
  const [visible, setVisible] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setVisible(y < lastY.current && y > 60);
        lastY.current = y;
        ticking = false;
      });
    };
    lastY.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return visible;
}

export default function LandsatNameSidebars() {
  const show = useScrollUpVisible();

  return (
    <>
      <aside className={`${styles.strip} ${styles.left} ${show ? styles.visible : ''}`} aria-hidden>
        <div className={styles.letters}>
          {OMID.map((letter) => (
            <LetterSlot key={letter} letter={letter} />
          ))}
        </div>
      </aside>
      <aside className={`${styles.strip} ${styles.right} ${show ? styles.visible : ''}`} aria-hidden>
        <div className={styles.letters}>
          {ZANGANEH.map((letter, i) => (
            <LetterSlot key={`${letter}-${i}`} letter={letter} />
          ))}
        </div>
      </aside>
    </>
  );
}
