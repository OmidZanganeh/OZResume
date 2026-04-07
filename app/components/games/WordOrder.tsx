'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './WordOrder.module.css';

/* ── Word list: common English words of varying lengths ── */
const WORDS = [
  'apple','brave','chess','dance','eagle','flame','globe','happy','igloo','joker',
  'knife','lemon','magic','noble','ocean','pride','queen','river','smoke','tiger',
  'ultra','vivid','witch','xenon','yacht','zebra','angel','blaze','crane','dream',
  'event','frost','grace','hinge','ivory','jazzy','karma','lunar','mercy','nerve',
  'olive','pixel','quota','rally','storm','torch','unity','vigor','waltz','xerox',
  'yield','zonal','album','bench','civil','depot','elbow','fable','giant','honor',
  'inbox','jewel','knack','label','major','ninja','opera','piano','quest','radar',
  'solar','table','under','valve','waste','exact','young','zippy','aloft','blend',
  'crisp','delta','elder','fiery','grasp','hover','imply','jumbo','kings','lusty',
  'metro','niche','onset','perch','quirk','robin','swift','truce','usher','vault',
  'words','xenon','zesty','balmy','cello','dingo','elite','finch','groan','hulk',
  'irony','joust','kneel','latch','mango','notch','odder','plumb','qualm','regal',
  'snack','tithe','unfed','verge','whelp','expel','yearn','zoned','abbot','boxer',
  'camel','dwell','ember','fjord','gloom','haste','imbue','jelly','kayak','lyric',
  'mourn','nymph','ozone','pluck','quell','rivet','sling','trawl','untie','venom',
  'world','expat','yikes','zingy','afoot','brood','cinch','dross','envoy','flute',
  'gusto','hedge','impel','jaunt','knave','llama','maxim','north','outdo','plaza',
  'quaff','rebut','skulk','tapir','umbra','vicar','whirl','expel','yeoman','zonal',
  'pixel','realm','scone','tepid','unwed','vixen','woken','exert','yodel','zilch',
  // longer words for variety
  'bridge','castle','famine','garden','hamlet','island','jungle','kettle','lander',
  'marble','narwhal','ocelot','parrot','quartz','rocket','saddle','tundra','uglier',
  'velvet','walrus','xyster','yankee','zephyr','absent','battle','candle','danger',
  'enigma','falcon','goblin','harbor','insect','jigsaw','kitten','lizard','muffin',
  'noodle','oolong','puffin','quiver','robber','silver','tunnel','unfold','victim',
  'wander','zealot','answer','bisect','cobalt','donkey','effect','factor','gravel',
  'hunter','impact','jockey','kosher','llamas','method','nectar','origin','pencil',
  'quarry','rescue','sphinx','turnip','unload','vector','weasel','exodus','yearly',
  'zipper',
];

const MAX_GUESSES = 10;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function compareAlpha(guess: string, secret: string): 'before' | 'after' | 'correct' {
  if (guess === secret) return 'correct';
  return guess < secret ? 'after' : 'before';
}

function scoreFromGuesses(guesses: number): number {
  if (guesses <= 0) return 0;
  // Fewer guesses = higher score: 1→1000, 2→850, 3→700 ... 10→100
  const scores = [1000, 850, 700, 575, 460, 360, 270, 190, 140, 100];
  return scores[Math.min(guesses - 1, scores.length - 1)];
}

interface GuessEntry {
  word: string;
  result: 'before' | 'after' | 'correct';
}

interface Props {
  playerName: string;
  leaders: { name: string; score: number }[];
  onFinish: (score: number) => void;
}

export default function WordOrder({ playerName, leaders: _leaders, onFinish }: Props) {
  const [secret, setSecret] = useState('');
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'start' | 'playing' | 'won' | 'lost'>('start');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startGame = useCallback(() => {
    setSecret(pickRandom(WORDS));
    setGuesses([]);
    setInput('');
    setError('');
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus();
  }, [phase]);

  const handleGuess = useCallback(() => {
    const g = input.trim().toLowerCase();
    if (!g) return;
    if (!/^[a-z]+$/.test(g)) { setError('Letters only please.'); return; }
    if (guesses.some(e => e.word === g)) { setError('Already guessed that one.'); return; }
    setError('');

    const result = compareAlpha(g, secret);
    const newGuesses = [...guesses, { word: g, result }];
    setGuesses(newGuesses);
    setInput('');

    if (result === 'correct') {
      setPhase('won');
      onFinish(scoreFromGuesses(newGuesses.length));
    } else if (newGuesses.length >= MAX_GUESSES) {
      setPhase('lost');
      onFinish(0);
    }
  }, [input, guesses, secret, onFinish]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGuess();
  }, [handleGuess]);

  /* ── START SCREEN ── */
  if (phase === 'start') {
    return (
      <div className={styles.startPane}>
        <div className={styles.titleBlock}>
          <span className={styles.bigEmoji}>🔤</span>
          <h2 className={styles.gameTitle}>Word Order</h2>
        </div>
        <p className={styles.desc}>
          I'm thinking of a secret word. After each guess I'll tell you whether
          the secret word comes <strong>before</strong> or <strong>after</strong> yours
          alphabetically. Use it like a compass to zero in on the answer.
        </p>
        <ul className={styles.ruleList}>
          <li>Up to <strong>{MAX_GUESSES} guesses</strong></li>
          <li>Word can be <strong>any length</strong></li>
          <li>Fewer guesses = higher score</li>
        </ul>
        <button className={styles.startBtn} onClick={startGame}>Start Game</button>
      </div>
    );
  }

  const remaining = MAX_GUESSES - guesses.length;
  const lastGuess = guesses[guesses.length - 1];

  return (
    <div className={styles.game}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.guessCount}>
          Guess {guesses.length + (phase === 'playing' ? 1 : 0)} / {MAX_GUESSES}
        </span>
        <span className={`${styles.remaining} ${remaining <= 3 ? styles.remainingWarn : ''}`}>
          {remaining} left
        </span>
      </div>

      {/* Hint banner */}
      {phase === 'playing' && lastGuess && (
        <div className={`${styles.hint} ${lastGuess.result === 'before' ? styles.hintBefore : styles.hintAfter}`}>
          {lastGuess.result === 'before' ? (
            <><span className={styles.hintArrow}>⬆</span> The secret word comes <strong>BEFORE</strong> &ldquo;{lastGuess.word}&rdquo;</>
          ) : (
            <><span className={styles.hintArrow}>⬇</span> The secret word comes <strong>AFTER</strong> &ldquo;{lastGuess.word}&rdquo;</>
          )}
        </div>
      )}
      {phase === 'playing' && guesses.length === 0 && (
        <div className={styles.hintEmpty}>
          Make your first guess — any word!
        </div>
      )}

      {/* Won / Lost banner */}
      {phase === 'won' && (
        <div className={styles.wonBanner}>
          🎉 Correct! &ldquo;<strong>{secret}</strong>&rdquo; — solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!
          <br />
          <span className={styles.scoreNote}>Score: {scoreFromGuesses(guesses.length)} pts</span>
        </div>
      )}
      {phase === 'lost' && (
        <div className={styles.lostBanner}>
          😞 Out of guesses. The word was &ldquo;<strong>{secret}</strong>&rdquo;.
        </div>
      )}

      {/* Input row */}
      {phase === 'playing' && (
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
            onKeyDown={handleKey}
            placeholder="Type a word…"
            maxLength={30}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className={styles.guessBtn} onClick={handleGuess} disabled={!input.trim()}>
            Guess
          </button>
        </div>
      )}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {/* Guess history */}
      {guesses.length > 0 && (
        <div className={styles.history}>
          <p className={styles.historyLabel}>Your guesses:</p>
          <div className={styles.guessList}>
            {[...guesses].reverse().map((g, i) => (
              <div key={i} className={`${styles.guessRow} ${g.result === 'correct' ? styles.rowCorrect : g.result === 'before' ? styles.rowBefore : styles.rowAfter}`}>
                <span className={styles.guessWord}>{g.word}</span>
                <span className={styles.guessHint}>
                  {g.result === 'correct' ? '✓ correct' : g.result === 'before' ? '⬆ secret is before this' : '⬇ secret is after this'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Play again (end state) */}
      {(phase === 'won' || phase === 'lost') && (
        <button className={styles.playAgainBtn} onClick={startGame}>Play Again</button>
      )}

      {/* Alphabet ruler — shows where guesses land */}
      {guesses.length > 0 && phase === 'playing' && (
        <div className={styles.ruler}>
          <span className={styles.rulerLabel}>A</span>
          <div className={styles.rulerTrack}>
            {guesses.filter(g => g.result !== 'correct').map((g, i) => {
              const pos = ((g.word.charCodeAt(0) - 97) / 25) * 100;
              return (
                <div key={i} className={`${styles.rulerMark} ${g.result === 'before' ? styles.markBefore : styles.markAfter}`}
                  style={{ left: `${pos}%` }} title={g.word} />
              );
            })}
          </div>
          <span className={styles.rulerLabel}>Z</span>
        </div>
      )}
    </div>
  );
}
