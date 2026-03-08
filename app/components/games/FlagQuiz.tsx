'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './FlagQuiz.module.css';

const COUNTRIES = [
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇫🇷', name: 'France' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇯🇵', name: 'Japan' },
  { flag: '🇨🇳', name: 'China' },
  { flag: '🇧🇷', name: 'Brazil' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇷🇺', name: 'Russia' },
  { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇲🇽', name: 'Mexico' },
  { flag: '🇰🇷', name: 'South Korea' },
  { flag: '🇮🇹', name: 'Italy' },
  { flag: '🇪🇸', name: 'Spain' },
  { flag: '🇸🇦', name: 'Saudi Arabia' },
  { flag: '🇿🇦', name: 'South Africa' },
  { flag: '🇳🇬', name: 'Nigeria' },
  { flag: '🇪🇬', name: 'Egypt' },
  { flag: '🇹🇷', name: 'Turkey' },
  { flag: '🇦🇷', name: 'Argentina' },
  { flag: '🇮🇩', name: 'Indonesia' },
  { flag: '🇵🇰', name: 'Pakistan' },
  { flag: '🇵🇭', name: 'Philippines' },
  { flag: '🇻🇳', name: 'Vietnam' },
  { flag: '🇹🇭', name: 'Thailand' },
  { flag: '🇰🇪', name: 'Kenya' },
  { flag: '🇸🇪', name: 'Sweden' },
  { flag: '🇳🇴', name: 'Norway' },
  { flag: '🇮🇷', name: 'Iran' },
  { flag: '🇵🇹', name: 'Portugal' },
  { flag: '🇬🇷', name: 'Greece' },
  { flag: '🇵🇱', name: 'Poland' },
  { flag: '🇨🇴', name: 'Colombia' },
  { flag: '🇺🇦', name: 'Ukraine' },
  { flag: '🇳🇱', name: 'Netherlands' },
  { flag: '🇸🇬', name: 'Singapore' },
  { flag: '🇲🇾', name: 'Malaysia' },
  { flag: '🇮🇱', name: 'Israel' },
  { flag: '🇨🇭', name: 'Switzerland' },
  { flag: '🇧🇪', name: 'Belgium' },
  { flag: '🇦🇹', name: 'Austria' },
  { flag: '🇩🇰', name: 'Denmark' },
  { flag: '🇫🇮', name: 'Finland' },
  { flag: '🇳🇿', name: 'New Zealand' },
  { flag: '🇨🇿', name: 'Czech Republic' },
  { flag: '🇭🇺', name: 'Hungary' },
  { flag: '🇷🇴', name: 'Romania' },
  { flag: '🇧🇬', name: 'Bulgaria' },
];

const ROUNDS = 10;
const TIME_LIMIT = 10;

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
        <div className={styles.flagPreview}>🏳️ 🏴 🚩 🏁</div>
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

      {/* Flag */}
      <div className={styles.flagWrap}>
        <span className={styles.flagEmoji}>{current.flag}</span>
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
