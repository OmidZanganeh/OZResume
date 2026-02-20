'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './BoredGame.module.css';

const WORDS = [
  'python', 'arcgis', 'sql', 'raster', 'vector', 'datum', 'lidar',
  'geojson', 'shapefile', 'crs', 'projection', 'topology', 'spatial',
  'fiber', 'network', 'azure', 'automation', 'bore', 'rfp', 'gis',
  'remote', 'sensing', 'tropomi', 'omaha', 'lincoln', 'olsson',
  'geodatabase', 'reclassify', 'buffer', 'overlay', 'interpolate',
  'csharp', 'deeplearn', 'toolbox', 'workflow', 'kernel', 'pixel',
];

const COLS = 10;
const TICK_MS = 1400;
const SPEED_UP = 0.93;

type FallingWord = {
  id: number;
  word: string;
  col: number;
  row: number;
};

let idCounter = 0;

export default function BoredGame({ onClose }: { onClose: () => void }) {
  const [words, setWords] = useState<FallingWord[]>([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(TICK_MS);
  const inputRef = useRef<HTMLInputElement>(null);
  const roundRef = useRef(0);

  const clearIntervals = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
  };

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 700);
  };

  const spawnWord = useCallback(() => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const col = Math.floor(Math.random() * COLS);
    setWords(prev => {
      const colTaken = prev.some(w => w.col === col && w.row < 2);
      const finalCol = colTaken ? (col + 1) % COLS : col;
      return [...prev, { id: idCounter++, word, col: finalCol, row: 0 }];
    });
  }, []);

  const tick = useCallback(() => {
    setWords(prev => {
      const next: FallingWord[] = [];
      let lost = 0;
      for (const w of prev) {
        if (w.row >= 9) { lost++; }
        else { next.push({ ...w, row: w.row + 1 }); }
      }
      if (lost > 0) {
        setLives(l => {
          const nl = l - lost;
          if (nl <= 0) {
            setGameOver(true);
            clearIntervals();
          }
          return Math.max(0, nl);
        });
        setCombo(0);
        showFlash('💥 Missed!');
      }
      return next;
    });
    roundRef.current++;
    if (roundRef.current % 8 === 0) {
      speedRef.current = Math.max(300, speedRef.current * SPEED_UP);
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = setInterval(tick, speedRef.current);
      }
    }
  }, []);

  const startGame = () => {
    setWords([]);
    setInput('');
    setScore(0);
    setLives(3);
    setGameOver(false);
    setCombo(0);
    setFlash(null);
    speedRef.current = TICK_MS;
    roundRef.current = 0;
    idCounter = 0;
    setStarted(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (!started || gameOver) return;
    spawnWord();
    tickRef.current = setInterval(tick, speedRef.current);
    spawnRef.current = setInterval(spawnWord, 2200);
    return clearIntervals;
  }, [started, gameOver, tick, spawnWord]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toLowerCase();
    setInput(val);
    const match = words.find(w => w.word === val);
    if (match) {
      setWords(prev => prev.filter(w => w.id !== match.id));
      setInput('');
      setCombo(c => c + 1);
      const pts = 10 + (combo >= 2 ? combo * 5 : 0);
      setScore(s => s + pts);
      showFlash(combo >= 2 ? `🔥 x${combo + 1} COMBO! +${pts}` : `✓ +${pts}`);
    }
  };

  const ROWS = 10;
  const grid: (FallingWord | null)[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null)
  );
  words.forEach(w => {
    if (w.row < ROWS && w.col < COLS) grid[w.row][w.col] = w;
  });

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <div className={styles.header}>
          <span className={styles.titleGame}>// GIS Word Drop</span>
          <div className={styles.hud}>
            <span className={styles.hudItem}>❤️ {'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, 3 - lives))}</span>
            <span className={styles.hudItem}>Score: <strong>{score}</strong></span>
            {combo >= 2 && <span className={styles.comboTag}>🔥 x{combo}</span>}
          </div>
        </div>

        {flash && <div className={styles.flash}>{flash}</div>}

        {!started ? (
          <div className={styles.startScreen}>
            <p className={styles.startText}>
              GIS words fall from the sky.<br />
              Type them before they hit the ground.<br />
              Miss 3 and it&apos;s game over.
            </p>
            <button className={styles.startBtn} onClick={startGame}>
              [ Start Game ]
            </button>
          </div>
        ) : gameOver ? (
          <div className={styles.startScreen}>
            <p className={styles.gameOverText}>GAME OVER</p>
            <p className={styles.finalScore}>Final Score: <strong>{score}</strong></p>
            <button className={styles.startBtn} onClick={startGame}>
              [ Play Again ]
            </button>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {grid.map((row, ri) => (
                <div key={ri} className={styles.row}>
                  {row.map((cell, ci) => (
                    <div key={ci} className={styles.cell}>
                      {cell && (
                        <span
                          className={`${styles.word} ${cell.row >= 7 ? styles.danger : cell.row >= 4 ? styles.warn : ''}`}
                        >
                          {cell.word}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              <div className={styles.ground} />
            </div>

            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={handleInput}
              placeholder="type a word and press enter..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
