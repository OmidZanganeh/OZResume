'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Sudoku.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────
type Board = number[][];
type BoolGrid = boolean[][];
type Phase = 'start' | 'loading' | 'playing' | 'won';

// ── Fallback puzzle (Wikipedia classic) ───────────────────────────────────────
const FALLBACK = {
  board: [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9],
  ],
  solution: [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9],
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeFixed(board: Board): BoolGrid {
  return board.map(row => row.map(v => v !== 0));
}

function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

function isComplete(board: Board, solution: Board): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] !== solution[r][c]) return false;
  return true;
}

function calcScore(mistakes: number, seconds: number): number {
  return Math.max(500, 10000 - mistakes * 500 - seconds * 2);
}

function isPeer(r: number, c: number, sr: number, sc: number): boolean {
  if (r === sr && c === sc) return false;
  return (
    r === sr ||
    c === sc ||
    (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3))
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  playerName: string;
  leaders: { name: string; score: number }[];
  onFinish: (score: number) => void;
}

export default function SudokuGame({ playerName: _p, leaders: _l, onFinish }: Props) {
  const [phase, setPhase] = useState<Phase>('start');
  const [board, setBoard] = useState<Board>([]);
  const [solution, setSolution] = useState<Board>([]);
  const [fixed, setFixed] = useState<BoolGrid>([]);
  const [errors, setErrors] = useState<BoolGrid>(
    Array.from({ length: 9 }, () => Array(9).fill(false))
  );
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Win detection
  useEffect(() => {
    if (phase !== 'playing' || board.length === 0 || solution.length === 0) return;
    if (isComplete(board, solution)) {
      setPhase('won');
      onFinish(calcScore(mistakes, elapsed));
    }
  }, [board, phase, solution, mistakes, elapsed, onFinish]);

  const startGame = useCallback(async () => {
    setPhase('loading');
    setElapsed(0);
    setMistakes(0);
    setSelected(null);

    let data = FALLBACK;
    try {
      const res = await fetch('/api/sudoku');
      if (res.ok) {
        const json = await res.json();
        if (json.board && json.solution) data = json;
      }
    } catch { /* use fallback */ }

    setBoard(cloneBoard(data.board));
    setSolution(data.solution);
    setFixed(makeFixed(data.board));
    setErrors(Array.from({ length: 9 }, () => Array(9).fill(false)));
    setPhase('playing');
    setTimeout(() => containerRef.current?.focus(), 50);
  }, []);

  const enterNumber = useCallback((num: number) => {
    if (phase !== 'playing' || !selected) return;
    const [r, c] = selected;
    if (fixed[r]?.[c]) return;

    setBoard(prev => {
      const nb = cloneBoard(prev);
      nb[r][c] = num;
      return nb;
    });

    if (num === 0) {
      setErrors(prev => {
        const ne = prev.map(row => [...row]);
        ne[r][c] = false;
        return ne;
      });
    } else if (solution[r][c] !== num) {
      setMistakes(m => m + 1);
      setErrors(prev => {
        const ne = prev.map(row => [...row]);
        ne[r][c] = true;
        return ne;
      });
    } else {
      setErrors(prev => {
        const ne = prev.map(row => [...row]);
        ne[r][c] = false;
        return ne;
      });
    }
  }, [phase, selected, fixed, solution]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (phase !== 'playing') return;
    if (e.key >= '1' && e.key <= '9') { e.preventDefault(); enterNumber(parseInt(e.key)); }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); enterNumber(0); }
    if (!selected) return;
    const [r, c] = selected;
    if (e.key === 'ArrowUp'    && r > 0) { e.preventDefault(); setSelected([r - 1, c]); }
    if (e.key === 'ArrowDown'  && r < 8) { e.preventDefault(); setSelected([r + 1, c]); }
    if (e.key === 'ArrowLeft'  && c > 0) { e.preventDefault(); setSelected([r, c - 1]); }
    if (e.key === 'ArrowRight' && c < 8) { e.preventDefault(); setSelected([r, c + 1]); }
  }, [phase, selected, enterNumber]);

  // ── Start screen ────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className={styles.startPane}>
        <span className={styles.bigEmoji}>🔢</span>
        <h2 className={styles.gameTitle}>Sudoku</h2>
        <p className={styles.desc}>
          Fill the 9&times;9 grid so every row, column, and 3&times;3 box contains
          the digits 1–9.
        </p>
        <ul className={styles.ruleList}>
          <li>Click a cell then type a number, or use the numpad below</li>
          <li>Arrow keys to navigate between cells</li>
          <li>Wrong entries count as mistakes (−500 pts each)</li>
          <li>Time costs −2 pts per second</li>
        </ul>
        <button className={styles.startBtn} onClick={startGame}>Start Game</button>
      </div>
    );
  }

  if (phase === 'loading') {
    return <div className={styles.loading}>⏳ Loading puzzle…</div>;
  }

  // ── Playing / Won ────────────────────────────────────────────────────────────
  return (
    <div
      className={styles.game}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: 'none' }}
    >
      {/* Stats bar */}
      <div className={styles.statsBar}>
        <span className={styles.stat}>⏱ {formatTime(elapsed)}</span>
        <span className={styles.stat}>❌ {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}</span>
        <span className={styles.stat}>🏆 {calcScore(mistakes, elapsed)} pts</span>
      </div>

      {/* Won banner */}
      {phase === 'won' && (
        <div className={styles.wonBanner}>
          🎉 Puzzle solved in {formatTime(elapsed)} with {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}!
          <br />
          <span className={styles.scoreNote}>Score: {calcScore(mistakes, elapsed)} pts</span>
        </div>
      )}

      {/* Grid */}
      <div className={styles.gridWrap}>
        <div className={styles.grid}>
          {board.map((row, r) =>
            row.map((val, c) => {
              const isSelected = selected?.[0] === r && selected?.[1] === c;
              const isPeerCell = selected ? isPeer(r, c, selected[0], selected[1]) : false;
              const isSameNum = !isSelected && selected !== null && val !== 0 && val === board[selected[0]][selected[1]];
              const isFixed = fixed[r]?.[c];
              const isError = errors[r]?.[c];

              const cls = [
                styles.cell,
                isSelected   ? styles.cellSelected : '',
                isPeerCell   ? styles.cellPeer     : '',
                isSameNum    ? styles.cellSameNum  : '',
                isFixed      ? styles.cellFixed    : styles.cellEditable,
                isError      ? styles.cellError    : '',
                (c + 1) % 3 === 0 && c < 8 ? styles.boxRight  : '',
                (r + 1) % 3 === 0 && r < 8 ? styles.boxBottom : '',
              ].filter(Boolean).join(' ');

              return (
                <div
                  key={`${r}-${c}`}
                  className={cls}
                  onClick={() => { if (phase === 'playing') setSelected([r, c]); }}
                >
                  {val !== 0 ? val : ''}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Number pad */}
      <div className={styles.numPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            className={styles.numBtn}
            onClick={() => enterNumber(n)}
            disabled={phase !== 'playing'}
          >
            {n}
          </button>
        ))}
        <button
          className={`${styles.numBtn} ${styles.numBtnClear}`}
          onClick={() => enterNumber(0)}
          disabled={phase !== 'playing'}
        >
          ✕
        </button>
      </div>

      {phase === 'won' && (
        <button className={styles.playAgainBtn} onClick={startGame}>Play Again</button>
      )}
    </div>
  );
}
