'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './FlagQuiz.module.css';

const COUNTRIES = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'fr', name: 'France' },
  { code: 'de', name: 'Germany' },
  { code: 'jp', name: 'Japan' },
  { code: 'cn', name: 'China' },
  { code: 'br', name: 'Brazil' },
  { code: 'in', name: 'India' },
  { code: 'ru', name: 'Russia' },
  { code: 'au', name: 'Australia' },
  { code: 'ca', name: 'Canada' },
  { code: 'mx', name: 'Mexico' },
  { code: 'kr', name: 'South Korea' },
  { code: 'it', name: 'Italy' },
  { code: 'es', name: 'Spain' },
  { code: 'sa', name: 'Saudi Arabia' },
  { code: 'za', name: 'South Africa' },
  { code: 'ng', name: 'Nigeria' },
  { code: 'eg', name: 'Egypt' },
  { code: 'tr', name: 'Turkey' },
  { code: 'ar', name: 'Argentina' },
  { code: 'id', name: 'Indonesia' },
  { code: 'pk', name: 'Pakistan' },
  { code: 'ph', name: 'Philippines' },
  { code: 'vn', name: 'Vietnam' },
  { code: 'th', name: 'Thailand' },
  { code: 'ke', name: 'Kenya' },
  { code: 'se', name: 'Sweden' },
  { code: 'no', name: 'Norway' },
  { code: 'ir', name: 'Iran' },
  { code: 'pt', name: 'Portugal' },
  { code: 'gr', name: 'Greece' },
  { code: 'pl', name: 'Poland' },
  { code: 'co', name: 'Colombia' },
  { code: 'ua', name: 'Ukraine' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'sg', name: 'Singapore' },
  { code: 'my', name: 'Malaysia' },
  { code: 'il', name: 'Israel' },
  { code: 'ch', name: 'Switzerland' },
  { code: 'be', name: 'Belgium' },
  { code: 'at', name: 'Austria' },
  { code: 'dk', name: 'Denmark' },
  { code: 'fi', name: 'Finland' },
  { code: 'nz', name: 'New Zealand' },
  { code: 'cz', name: 'Czech Republic' },
  { code: 'hu', name: 'Hungary' },
  { code: 'ro', name: 'Romania' },
  { code: 'bg', name: 'Bulgaria' },
  { code: 'cl', name: 'Chile' },
];

const TIME_LIMIT = 12;

function flagUrl(code: string) {
  return `https://flagcdn.com/w160/${code}.png`;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function calcPoints(timeLeft: number): number {
  return 500 + Math.round((timeLeft / TIME_LIMIT) * 500);
}

// Check if user answer matches target (case-insensitive, trimmed, allow common aliases)
function isMatch(userInput: string, countryName: string): boolean {
  const a = userInput.trim().toLowerCase();
  const b = countryName.toLowerCase();
  if (a === b) return true;
  // Common short aliases
  const aliases: Record<string, string[]> = {
    'united states': ['usa', 'us', 'america', 'united states of america'],
    'united kingdom': ['uk', 'england', 'britain', 'great britain'],
    'south korea': ['korea'],
    'saudi arabia': ['saudi'],
    'south africa': ['rsa'],
    'new zealand': ['nz', 'kiwi'],
    'czech republic': ['czechia', 'czech'],
    'iran': ['persia'],
  };
  const alts = aliases[b] || [];
  return alts.includes(a);
}

interface Props {
  playerName: string;
  leaders: { name: string; score: number }[];
  onFinish: (score: number) => void;
}

export default function FlagQuiz({ playerName, leaders, onFinish }: Props) {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'timeout'>('idle');
  const [lastPts, setLastPts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameOver, setGameOver] = useState(false);
  const [order] = useState(() => shuffle(COUNTRIES));
  const scoreRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const medals = ['🥇', '🥈', '🥉'];
  const answered = status !== 'idle';

  const current = order[round % order.length];

  const endGame = useCallback(() => {
    setGameOver(true);
    onFinish(scoreRef.current);
  }, [onFinish]);

  // Timer
  useEffect(() => {
    if (!started || answered || gameOver) return;
    if (timeLeft <= 0) {
      setStatus('timeout');
      setTimeout(() => endGame(), 1200);
      return;
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [started, answered, gameOver, timeLeft, endGame]);

  const handleSubmit = () => {
    if (answered || !input.trim()) return;
    if (isMatch(input, current.name)) {
      const pts = calcPoints(timeLeft);
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setLastPts(pts);
      setStatus('correct');
    } else {
      setStatus('wrong');
      setTimeout(() => endGame(), 1400);
    }
  };

  const nextFlag = () => {
    setRound(r => r + 1);
    setInput('');
    setStatus('idle');
    setTimeLeft(TIME_LIMIT);
    setLastPts(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (status === 'correct') nextFlag();
      else handleSubmit();
    }
  };

  if (!started) {
    return (
      <div className={styles.startPane}>
        <div className={styles.flagPreviewRow}>
          {['us', 'jp', 'br', 'ng'].map(code => (
            <img key={code} src={flagUrl(code)} alt={code} className={styles.flagPreviewImg} />
          ))}
        </div>
        <p className={styles.desc}>
          A flag appears — <strong>type the country name</strong> and press Enter.<br />
          Answer faster for bonus points.<br />
          <strong>One wrong answer = game over!</strong> How far can you go?
        </p>
        <button className={styles.startBtn} onClick={() => setStarted(true)}>
          [ Start Quiz ]
        </button>
        {leaders.length > 0 && (
          <div className={styles.miniBoard}>
            <p className={styles.miniBoardTitle}>🏆 Top Scores</p>
            {leaders.map((l, i) => (
              <div key={i} className={styles.miniBoardRow}>
                <span>{medals[i]} {l.name}</span>
                <span><strong>{l.score}</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.game}>
      <div className={styles.gameHeader}>
        <span className={styles.progress}>Flag #{round + 1}</span>
        <span className={styles.scoreDisplay}>Score: <strong>{score}</strong></span>
      </div>

      {/* Timer bar */}
      <div className={styles.timerTrack}>
        <div
          className={`${styles.timerBar} ${timeLeft <= 3 ? styles.timerBarDanger : ''}`}
          style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
        />
      </div>
      <div className={styles.timerLabel}>
        {answered ? '' : `${timeLeft}s`}
      </div>

      {/* Flag image */}
      <div className={styles.flagWrap}>
        <img
          src={flagUrl(current.code)}
          alt="Guess this flag"
          className={`${styles.flagImg} ${status === 'correct' ? styles.flagCorrect : status === 'wrong' || status === 'timeout' ? styles.flagWrong : ''}`}
        />
      </div>

      {/* Text input */}
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={`${styles.typeInput} ${status === 'correct' ? styles.typeInputCorrect : status === 'wrong' || status === 'timeout' ? styles.typeInputWrong : ''}`}
          value={input}
          onChange={e => { if (!answered) setInput(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="Type country name…"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={answered}
        />
        {!answered && (
          <button className={styles.submitBtn} onClick={handleSubmit}>→</button>
        )}
      </div>

      {/* Feedback */}
      {answered && (
        <div className={styles.feedback}>
          {status === 'timeout' ? (
            <span className={styles.feedbackTimeout}>⏱ Time&apos;s up! It was <strong>{current.name}</strong></span>
          ) : status === 'correct' ? (
            <span className={styles.feedbackCorrect}>
              🎉 Correct! <strong>+{lastPts} pts</strong>
              {lastPts >= 900 ? ' — Lightning fast! ⚡' : ''}
            </span>
          ) : (
            <span className={styles.feedbackWrong}>
              ❌ It was <strong>{current.name}</strong> — Game over!
            </span>
          )}
          {status === 'correct' && (
            <button className={styles.nextBtn} onClick={nextFlag}>
              [ Next Flag → ]
            </button>
          )}
        </div>
      )}
    </div>
  );
}
