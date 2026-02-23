'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './LandsatNameSidebars.module.css';

/** Left: Omid. Right: Zanganeh. Images in public/name/: O.jpg, M.jpg, I.jpg, D.jpg; Z.jpg, A1.jpg, N1.jpg, G.jpg, A2.jpg, N2.jpg, E.jpg, H.jpg */
const OMID = ['O', 'M', 'I', 'D'] as const;
const ZANGANEH = ['Z', 'A1', 'N1', 'G', 'A2', 'N2', 'E', 'H'] as const;

const SCROLL_BASE = 80;
const LEFT_STEP = 70;   // 4 letters: appear at 80, 150, 220, 290
const RIGHT_STEP = 50;  // 8 letters: appear at 80, 130, 180, ...

function LetterSlot({
  imageKey,
  displayLetter,
  visible,
}: {
  imageKey: string;
  displayLetter: string;
  visible: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const wrapClass = `${styles.letterWrap} ${visible ? styles.letterVisible : ''}`;
  if (failed) {
    return (
      <div className={wrapClass}>
        <span className={styles.letterFallback}>{displayLetter}</span>
      </div>
    );
  }
  return (
    <div className={wrapClass}>
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

export default function LandsatNameSidebars() {
  const scrollY = useScrollY();
  const stripVisible = scrollY > SCROLL_BASE;

  return (
    <>
      <aside className={`${styles.strip} ${styles.left} ${stripVisible ? styles.visible : ''}`} aria-hidden>
        <div className={styles.letters}>
          {OMID.map((letter, i) => (
            <LetterSlot
              key={letter}
              imageKey={letter}
              displayLetter={letter}
              visible={scrollY >= SCROLL_BASE + i * LEFT_STEP}
            />
          ))}
        </div>
      </aside>
      <aside className={`${styles.strip} ${styles.right} ${stripVisible ? styles.visible : ''}`} aria-hidden>
        <div className={styles.letters}>
          {ZANGANEH.map((key, i) => (
            <LetterSlot
              key={`${key}-${i}`}
              imageKey={key}
              displayLetter={key.replace(/\d$/, '')}
              visible={scrollY >= SCROLL_BASE + i * RIGHT_STEP}
            />
          ))}
        </div>
      </aside>
    </>
  );
}
