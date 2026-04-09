'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './TypeRacer.module.css';

const TEXTS = [
  'NDVI equals NIR minus Red divided by NIR plus Red. Values near one indicate dense healthy vegetation.',
  'Kriging uses semivariograms to model spatial autocorrelation and perform optimal linear unbiased interpolation.',
  'A spatial join transfers attributes between layers based on geometric relationships like intersection or proximity.',
  'LiDAR generates dense point clouds by measuring the time for laser pulses to return from the ground surface.',
  'Remote sensing uses electromagnetic radiation to extract land cover, vegetation, and urban area information.',
  'The haversine formula calculates great-circle distances between two points on a sphere using latitude and longitude.',
  'Python and ArcPy enable batch geoprocessing, automating tasks like reprojecting, clipping, and spatial joining.',
  'A geodatabase stores geographic features, attributes, topology rules, and spatial relationships in one container.',
  'Raster data represents space as a grid of cells where each cell holds a single value like elevation or temperature.',
  'Vector data uses points, lines, and polygons to represent discrete geographic features with precise boundaries.',
];

const ROUNDS = 3;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  playerName: string;
  leaders: { name: string; score: number }[];
  onFinish: (score: number) => void;
}

export default function TypeRacer({ playerName, leaders, onFinish }: Props) {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [texts] = useState(() => shuffle(TEXTS).slice(0, ROUNDS));
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [roundDone, setRoundDone] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const medals = ['🥇', '🥈', '🥉'];
  const target = texts[round] ?? '';

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    return stopTimer;
  }, [stopTimer]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (!startTime && val.length === 1) {
      const now = Date.now();
      setStartTime(now);
      timerRef.current = setInterval(() => {
        const elapsedMin = (Date.now() - now) / 60000;
        const wordsTyped = val.length / 5;
        setLiveWpm(Math.round(wordsTyped / elapsedMin));
      }, 300);
    }

    // Only allow correct characters (no errors allowed — classic strict mode)
    if (!target.startsWith(val)) return;

    setTyped(val);

    if (val === target) {
      stopTimer();
      const elapsed = (Date.now() - (startTime ?? Date.now())) / 60000;
      const wpm = Math.round((target.length / 5) / elapsed);
      setWpmHistory(prev => [...prev, wpm]);
      setRoundDone(true);
      setLiveWpm(wpm);
    }
  };

  const nextRound = () => {
    setTyped('');
    setStartTime(null);
    setLiveWpm(0);
    setRoundDone(false);
    if (round + 1 >= ROUNDS) {
      const avg = Math.round(wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length);
      onFinish(avg);
    } else {
      setRound(r => r + 1);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  if (!started) {
    return (
      <div className={styles.startPane}>
        <p className={styles.desc}>
          Type the GIS sentence exactly as shown — no errors allowed.<br />
          <strong>{ROUNDS} rounds</strong>. Your score is average WPM (words per minute).
        </p>
        <button className={styles.startBtn} onClick={() => { setStarted(true); setTimeout(() => inputRef.current?.focus(), 80); }}>
          [ Start Typing ]
        </button>
        {leaders.length > 0 && (
          <div className={styles.miniBoard}>
            <p className={styles.miniBoardTitle}>🏆 Top WPM</p>
            {leaders.map((l, i) => (
              <div key={i} className={styles.miniBoardRow}>
                <span>{medals[i]} {l.name}</span>
                <span>{l.score} wpm</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render text with per-character coloring
  const chars = target.split('').map((ch, i) => {
    let cls = styles.charPending;
    if (i < typed.length) cls = styles.charDone;
    else if (i === typed.length) cls = styles.charCursor;
    return <span key={i} className={cls}>{ch}</span>;
  });

  const pct = Math.round((typed.length / target.length) * 100);

  return (
    <div className={styles.game}>
      <div className={styles.gameHeader}>
        <span className={styles.roundLabel}>Round {round + 1}/{ROUNDS}</span>
        <span className={styles.wpmBadge}>⌨ {liveWpm} wpm</span>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>

      <div className={styles.textDisplay}>{chars}</div>

      <input
        ref={inputRef}
        className={styles.input}
        value={typed}
        onChange={handleInput}
        disabled={roundDone}
        placeholder={round === 0 && !startTime ? 'Start typing to begin the timer…' : ''}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      <div className={`${styles.roundResult} ${!roundDone ? styles.roundResultHidden : ''}`}>
        <span>✅ {liveWpm} WPM</span>
        <button className={styles.nextBtn} onClick={nextRound}>
          {round + 1 >= ROUNDS ? '[ See Final Score ]' : '[ Next Round → ]'}
        </button>
      </div>

      {wpmHistory.length > 0 && (
        <div className={styles.history}>
          {wpmHistory.map((w, i) => (
            <span key={i} className={styles.historyItem}>R{i + 1}: {w} wpm</span>
          ))}
        </div>
      )}
    </div>
  );
}
