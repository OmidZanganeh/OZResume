'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './LandsatNameSidebars.module.css';

/** All letters on left: Omid + Zanganeh. Images in public/name/: O.jpg, M.jpg, I.jpg, D.jpg; Z.jpg, A1.jpg, N1.jpg, G.jpg, A2.jpg, N2.jpg, E.jpg, H.jpg */
const ALL_LETTERS = [
  { imageKey: 'O', displayLetter: 'O' },
  { imageKey: 'M', displayLetter: 'M' },
  { imageKey: 'I', displayLetter: 'I' },
  { imageKey: 'D', displayLetter: 'D' },
  { imageKey: 'Z', displayLetter: 'Z' },
  { imageKey: 'A1', displayLetter: 'A' },
  { imageKey: 'N1', displayLetter: 'N' },
  { imageKey: 'G', displayLetter: 'G' },
  { imageKey: 'A2', displayLetter: 'A' },
  { imageKey: 'N2', displayLetter: 'N' },
  { imageKey: 'E', displayLetter: 'E' },
  { imageKey: 'H', displayLetter: 'H' },
] as const;

const SCROLL_BASE = 280;
const LETTER_STEP = 110; // 12 letters appear one by one

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

const PARALLAX_RATE = 0.1; // strip moves 10% of scroll (lag effect)

export default function LandsatNameSidebars() {
  const scrollY = useScrollY();
  const stripVisible = scrollY > SCROLL_BASE;
  const parallaxY = scrollY * PARALLAX_RATE;

  return (
    <aside
      className={`${styles.strip} ${styles.left} ${stripVisible ? styles.visible : ''}`}
      style={{
        transform: `translateY(calc(-50% + ${parallaxY}px)) translateX(${stripVisible ? 0 : -20}px)`,
      }}
      aria-hidden
    >
      <div className={styles.letters}>
        {ALL_LETTERS.map(({ imageKey, displayLetter }, i) => (
          <LetterSlot
            key={`${imageKey}-${i}`}
            imageKey={imageKey}
            displayLetter={displayLetter}
            visible={scrollY >= SCROLL_BASE + i * LETTER_STEP}
          />
        ))}
      </div>
    </aside>
  );
}
