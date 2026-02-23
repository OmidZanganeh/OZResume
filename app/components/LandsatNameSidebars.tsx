'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import styles from './LandsatNameSidebars.module.css';

/** Left: Omid. Right: Zanganeh. Images in public/name/: O.jpg, M.jpg, I.jpg, D.jpg; Z.jpg, A1.jpg, N1.jpg, G.jpg, A2.jpg, N2.jpg, E.jpg, H.jpg */
const OMID = ['O', 'M', 'I', 'D'] as const;
const ZANGANEH = ['Z', 'A1', 'N1', 'G', 'A2', 'N2', 'E', 'H'] as const;

function LetterSlot({ imageKey, displayLetter }: { imageKey: string; displayLetter: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={styles.letterWrap}>
        <span className={styles.letterFallback}>{displayLetter}</span>
      </div>
    );
  }
  return (
    <div className={styles.letterWrap}>
      <Image
        src={`/name/${imageKey}.jpg`}
        alt={`${displayLetter} (Landsat)`}
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
            <LetterSlot key={letter} imageKey={letter} displayLetter={letter} />
          ))}
        </div>
      </aside>
      <aside className={`${styles.strip} ${styles.right} ${show ? styles.visible : ''}`} aria-hidden>
        <div className={styles.letters}>
          {ZANGANEH.map((key, i) => (
            <LetterSlot
              key={`${key}-${i}`}
              imageKey={key}
              displayLetter={key.replace(/\d$/, '')}
            />
          ))}
        </div>
      </aside>
    </>
  );
}
