'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './LandsatNameSidebars.module.css';

const ANCHOR_ID = 'languages-section';
const BOTTOM_THRESHOLD = 120; // px from bottom to consider "at end"

/** Row 1: Omid. Row 2: Zanganeh. Images in public/name/: O.jpg, M.jpg, I.jpg, D.jpg; Z.jpg, A1.jpg, N1.jpg, G.jpg, A2.jpg, N2.jpg, E.jpg, H.jpg */
const OMID = [
  { imageKey: 'O', displayLetter: 'O' },
  { imageKey: 'M', displayLetter: 'M' },
  { imageKey: 'I', displayLetter: 'I' },
  { imageKey: 'D', displayLetter: 'D' },
] as const;
const ZANGANEH = [
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
const LETTER_STEP = 110;
/** Parallax: subtle so letters stay on screen (was 0.1, made them fly off) */
const PARALLAX_RATE = 0.025;

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

function useScrollYAndAtBottom() {
  const [scrollY, setScrollY] = useState(0);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      setScrollY(y);
      const doc = document.documentElement;
      setAtBottom(y + window.innerHeight >= doc.scrollHeight - BOTTOM_THRESHOLD);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { scrollY, atBottom };
}

function useAnchorRect(atBottom: boolean) {
  const [rect, setRect] = useState<{ bottom: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!atBottom) {
      setRect(null);
      return;
    }
    const el = document.getElementById(ANCHOR_ID);
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ bottom: r.bottom, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [atBottom]);

  return rect;
}

export default function LandsatNameSidebars() {
  const { scrollY, atBottom } = useScrollYAndAtBottom();
  const anchorRect = useAnchorRect(atBottom);
  const stripVisible = scrollY > SCROLL_BASE;
  const parallaxY = scrollY * PARALLAX_RATE;

  const isDocked = atBottom && anchorRect !== null;

  return (
    <aside
      className={`${styles.strip} ${styles.left} ${stripVisible ? styles.visible : ''} ${isDocked ? styles.docked : ''}`}
      style={
        isDocked && anchorRect
          ? {
              top: anchorRect.bottom + 10,
              left: anchorRect.left,
              width: anchorRect.width,
              maxWidth: anchorRect.width,
              transform: 'none',
            }
          : {
              transform: `translateY(calc(-50% + ${parallaxY}px)) translateX(${stripVisible ? 0 : -20}px)`,
            }
      }
      aria-hidden
    >
      <div className={styles.letters}>
        <div className={styles.column}>
          {OMID.map(({ imageKey, displayLetter }, i) => (
            <LetterSlot
              key={imageKey}
              imageKey={imageKey}
              displayLetter={displayLetter}
              visible={scrollY >= SCROLL_BASE + i * LETTER_STEP}
            />
          ))}
        </div>
        <div className={styles.column}>
          {ZANGANEH.map(({ imageKey, displayLetter }, i) => (
            <LetterSlot
              key={`${imageKey}-${i}`}
              imageKey={imageKey}
              displayLetter={displayLetter}
              visible={scrollY >= SCROLL_BASE + (OMID.length + i) * LETTER_STEP}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
