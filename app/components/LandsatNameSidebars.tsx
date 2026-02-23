'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './LandsatNameSidebars.module.css';

/** One row: Omid Zanganeh. Images in public/name/: O.jpg, M.jpg, I.jpg, D.jpg; Z.jpg, A1.jpg, N1.jpg, G.jpg, A2.jpg, N2.jpg, E.jpg, H.jpg */
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
        width={48}
        height={48}
        className={styles.letterImg}
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function LandsatNameSidebars() {
  return (
    <aside className={styles.bottomStrip} aria-hidden>
      <div className={styles.bottomRow}>
        {ALL_LETTERS.map(({ imageKey, displayLetter }, i) => (
          <LetterSlot key={`${imageKey}-${i}`} imageKey={imageKey} displayLetter={displayLetter} />
        ))}
      </div>
    </aside>
  );
}
