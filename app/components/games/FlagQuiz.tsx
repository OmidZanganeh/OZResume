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

const ROUNDS = 10;
const TIME_LIMIT = 10;

function flagUrl(code: string) {
  return `https://flagcdn.com/w160/${code}.png`;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeChoices(correct: typeof COUNTRIES[number], all: typeof COUNTRIES): string[] {
  const distractors = shuffle(all.filter(c => c.name !== correct.name)).slice(0, 3);
  return shuffle([correct, ...distractors]).map(c => c.name);
}

function calcPoints(timeLeft: number): number {
  return 500 + Math.round((timeLeft / TIME_LIMIT) * 500);
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
  const [lastPts, setLastPts] = useState(0);
  const [order] = useState(() => shuffle(COUNTRIES).slice(0, ROUNDS));
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);

  const scoreRef = useRef(0);
  const medals = ['🥇', '🥈', '🥉'];
  const current = order[round];
  const answered = selected !== null || timedOut;

  const initRound = useCallback((r: number) => {
    setChoices(makeChoices(order[r], COUNTRIES));
    setSelected(null);
    setTimedOut(false);
    setTimeLeft(TIME_LIMIT);
    setLastPts(0);
  }, [order]);

  useEffect(() => {
    if (started) initRound(round);
  }, [started, round, initRound]);

  useEffect(() => {
    if (!started || answered) return;
    if (timeLeft <= 0) { setTimedOut(true); return; }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [started, answered, timeLeft]);

  const handleAnswer = (choice: string) => {
    if (answered) return;
    setSelected(choice);
    const pts = choice === current.name ? calcPoints(timeLeft) : 0;
    setLastPts(pts);
    scoreRef.current += pts;
    setScore(scoreRef.current);
  };

  const next = () => {
    if (round + 1 >= ROUNDS) {
      onFinish(scoreRef.current);
    } else {
      setRound(r => r + 1);
    }
  };

  const getChoiceState = (choice: string): 'correct' | 'wrong' | 'neutral' | 'idle' => {
    if (!answered) return 'idle';
    if (choice === current.name) return 'correct';
    if (choice === selected) return 'wrong';
    return 'neutral';
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
          A flag appears — pick the correct country from 4 choices.<br />
          Answer faster for bonus points. <strong>{ROUNDS} flags</strong>, max 1000 pts each.
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
                <span>{l.score}</span>
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
        <span className={styles.progress}>Flag {round + 1} / {ROUNDS}</span>
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
          className={styles.flagImg}
        />
      </div>

      {/* Choices */}
      <div className={styles.choices}>
        {choices.map(choice => {
          const state = getChoiceState(choice);
          return (
            <button
              key={choice}
              className={`${styles.choice} ${styles[state]}`}
              onClick={() => handleAnswer(choice)}
              disabled={answered}
            >
              {state === 'correct' && '✓ '}
              {state === 'wrong' && '✗ '}
              {choice}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {answered && (
        <div className={styles.feedback}>
          {timedOut && !selected ? (
            <span className={styles.feedbackTimeout}>⏱ Time&apos;s up! The answer was <strong>{current.name}</strong></span>
          ) : selected === current.name ? (
            <span className={styles.feedbackCorrect}>🎉 Correct! <strong>+{lastPts} pts</strong>{lastPts === 1000 ? ' — Perfect speed!' : ''}</span>
          ) : (
            <span className={styles.feedbackWrong}>❌ It was <strong>{current.name}</strong></span>
          )}
          <button className={styles.nextBtn} onClick={next}>
            {round + 1 >= ROUNDS ? '[ See Results ]' : '[ Next Flag → ]'}
          </button>
        </div>
      )}
    </div>
  );
}
