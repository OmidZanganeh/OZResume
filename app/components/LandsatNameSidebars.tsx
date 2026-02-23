'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
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

function useSidebarsVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(window.scrollY > 80);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  return visible;
}

export default function LandsatNameSidebars() {
  const show = useSidebarsVisible();

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
