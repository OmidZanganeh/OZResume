'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import styles from './LandsatNameSidebars.module.css';

const LETTER_SIZE = 48;
const GAP = 6;
const NAME_GAP = 28; // space between "Omid" and "Zanganeh"
const SCROLL_END = 700; // scroll range over which letters move from scattered to row

/** Scattered start positions (left %, top %) — left and right sides */
const START_POSITIONS = [
  { left: 4, top: 12 },
  { left: 7, top: 38 },
  { left: 3, top: 62 },
  { left: 6, top: 88 },
  { left: 93, top: 18 },
  { left: 96, top: 42 },
  { left: 91, top: 68 },
  { left: 95, top: 8 },
  { left: 92, top: 52 },
  { left: 97, top: 78 },
  { left: 94, top: 32 },
  { left: 90, top: 92 },
];

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

function getEndXCenters(viewportWidth: number): number[] {
  if (viewportWidth <= 0) return [];
  const centerX = viewportWidth / 2;
  const omidWidth = 4 * LETTER_SIZE + 3 * GAP;
  const zanganehWidth = 8 * LETTER_SIZE + 7 * GAP;
  const totalWidth = omidWidth + NAME_GAP + zanganehWidth;
  const startX = centerX - totalWidth / 2;
  const startOmid = startX + LETTER_SIZE / 2;
  const startZanganeh = startX + omidWidth + NAME_GAP + LETTER_SIZE / 2;
  const xs: number[] = [];
  for (let i = 0; i < 4; i++) xs.push(startOmid + i * (LETTER_SIZE + GAP));
  for (let i = 0; i < 8; i++) xs.push(startZanganeh + i * (LETTER_SIZE + GAP));
  return xs;
}

function LetterSlot({
  imageKey,
  displayLetter,
  style,
}: {
  imageKey: string;
  displayLetter: string;
  style: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={styles.letterWrap} style={style}>
        <span className={styles.letterFallback}>{displayLetter}</span>
      </div>
    );
  }
  return (
    <div className={styles.letterWrap} style={style}>
      <Image
        src={`/name/${imageKey}.jpg`}
        alt={`${displayLetter} (Landsat)`}
        width={LETTER_SIZE}
        height={LETTER_SIZE}
        className={styles.letterImg}
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function LandsatNameSidebars() {
  const [scrollY, setScrollY] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      setScrollY(window.scrollY);
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, []);

  const progress = Math.min(1, Math.max(0, scrollY / SCROLL_END));
  const endY = size.h - 36;
  const endXs = useMemo(() => getEndXCenters(size.w), [size.w]);

  return (
    <aside className={styles.scatterWrap} aria-hidden>
      <div
        className={styles.bottomBar}
        style={{ opacity: progress }}
        aria-hidden
      />
      {ALL_LETTERS.map(({ imageKey, displayLetter }, i) => {
        const start = START_POSITIONS[i];
        const startX = (start.left / 100) * size.w;
        const startY = (start.top / 100) * size.h;
        const endX = endXs[i] ?? size.w / 2;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        return (
          <LetterSlot
            key={`${imageKey}-${i}`}
            imageKey={imageKey}
            displayLetter={displayLetter}
            style={{
              position: 'fixed',
              left: x,
              top: y,
              width: LETTER_SIZE,
              height: LETTER_SIZE,
              transform: 'translate(-50%, -50%)',
              transition: progress < 1 ? 'none' : 'left 0.4s ease, top 0.4s ease',
              zIndex: 5,
            }}
          />
        );
      })}
    </aside>
  );
}
