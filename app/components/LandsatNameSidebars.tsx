'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './LandsatNameSidebars.module.css';

/** One row: Omid Zanganeh. Each letter links to its Landsat location (decimal lat, lon). */
const ALL_LETTERS = [
  { imageKey: 'O', displayLetter: 'O', place: 'Crater Lake, Oregon', lat: 42.9361, lon: -122.1013 },
  { imageKey: 'M', displayLetter: 'M', place: 'Potomac River', lat: 38.7756, lon: -78.4020 },
  { imageKey: 'I', displayLetter: 'I', place: 'Holuhraun Ice Field, Iceland', lat: 64.8531, lon: -16.8270 },
  { imageKey: 'D', displayLetter: 'D', place: 'Lake Tandou, Australia', lat: -32.6216, lon: 142.0726 },
  { imageKey: 'Z', displayLetter: 'Z', place: 'Mohammed Boudiaf, Algeria', lat: 34.9887, lon: 4.3891 },
  { imageKey: 'A1', displayLetter: 'A', place: 'Lake Mjøsa, Norway', lat: 60.7646, lon: 10.9453 },
  { imageKey: 'N1', displayLetter: 'N', place: 'Yapacani, Bolivia', lat: -17.3083, lon: -63.8886 },
  { imageKey: 'G', displayLetter: 'G', place: 'Fonte Boa, Amazonas', lat: -2.4419, lon: -66.2788 },
  { imageKey: 'A2', displayLetter: 'A', place: 'Yukon Delta, Alaska', lat: 62.5549, lon: -164.9362 },
  { imageKey: 'N2', displayLetter: 'N', place: 'São Miguel do Araguaia, Brazil', lat: -12.9456, lon: -50.4950 },
  { imageKey: 'E', displayLetter: 'E', place: 'Sea of Okhotsk', lat: 54.7140, lon: 136.5723 },
  { imageKey: 'H', displayLetter: 'H', place: 'Southwestern Kyrgyzstan', lat: 40.2343, lon: 71.2397 },
] as const;

function mapsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps?q=${lat},${lon}&z=6&t=k`;
}

function LetterSlot({
  imageKey,
  displayLetter,
  place,
  lat,
  lon,
}: {
  imageKey: string;
  displayLetter: string;
  place: string;
  lat: number;
  lon: number;
}) {
  const [failed, setFailed] = useState(false);
  const wrap = (
    <>
      <div className={styles.letterInner}>
        {failed ? (
          <span className={styles.letterFallback}>{displayLetter}</span>
        ) : (
          <Image
            src={`/name/${imageKey}.jpg`}
            alt={`${displayLetter} (Landsat – ${place})`}
            width={48}
            height={48}
            className={styles.letterImg}
            unoptimized
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <span className={styles.letterLabel}>{displayLetter}</span>
    </>
  );
  return (
    <a
      href={mapsUrl(lat, lon)}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.letterWrap}
      title={place}
    >
      {wrap}
    </a>
  );
}

const OMID = ALL_LETTERS.slice(0, 4);
const ZANGANEH = ALL_LETTERS.slice(4);

export default function LandsatNameSidebars() {
  return (
    <aside className={styles.bottomStrip} aria-hidden>
      <div className={styles.bottomRow}>
        <div className={styles.nameGroup}>
          {OMID.map(({ imageKey, displayLetter, place, lat, lon }, i) => (
            <LetterSlot
              key={`${imageKey}-${i}`}
              imageKey={imageKey}
              displayLetter={displayLetter}
              place={place}
              lat={lat}
              lon={lon}
            />
          ))}
        </div>
        <span className={styles.nameGap} aria-hidden />
        <div className={styles.nameGroup}>
          {ZANGANEH.map(({ imageKey, displayLetter, place, lat, lon }, i) => (
            <LetterSlot
              key={`${imageKey}-${i}`}
              imageKey={imageKey}
              displayLetter={displayLetter}
              place={place}
              lat={lat}
              lon={lon}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
