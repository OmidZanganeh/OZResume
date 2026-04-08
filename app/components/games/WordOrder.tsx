'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './WordOrder.module.css';

/* ── Word list: common everyday English words (no jargon) ── */
const WORDS = [
  // 5-letter
  'about','above','actor','again','agree','anger','ankle','apple','arrow','aside',
  'baker','beard','below','bench','berry','birth','black','blade','blank','blast',
  'blend','blind','block','blood','bloom','blown','blunt','board','bonus','boost',
  'brave','bread','break','brick','bride','brief','bring','broad','broke','brown',
  'brush','build','burst','buyer','cabin','carry','catch','cause','chain','chair',
  'chalk','chaos','charm','chart','chase','cheap','check','cheek','chess','child',
  'chunk','civic','claim','class','clean','clear','click','cliff','climb','clock',
  'close','cloth','cloud','clown','coast','color','coral','count','court','cover',
  'crack','craft','crash','cream','creek','crime','crisp','cross','crowd','cruel',
  'crush','curve','daily','dance','decay','depth','devil','dirty','draft','drain',
  'drama','dream','dress','drink','drive','Dutch','eager','early','earth','email',
  'empty','enemy','enjoy','enter','equal','error','essay','event','every','exact',
  'extra','faith','false','fancy','fault','feast','fence','fetch','fever','fiber',
  'field','fight','final','first','flame','flash','flesh','float','flood','floor',
  'flour','focal','force','forge','found','frame','fraud','fresh','front','fruit',
  'funny','ghost','given','glass','grace','grade','grain','grand','grant','graph',
  'grasp','grass','greet','grief','grind','group','grove','grown','guard','guide',
  'guild','gusto','habit','happy','harsh','heard','heart','heavy','hence','honor',
  'horse','house','human','hurry','image','inbox','inner','input','judge','juice',
  'jumbo','kneel','label','large','laser','laugh','layer','learn','leave','legal',
  'lemon','level','light','limit','liver','local','logic','loose','lower','loyal',
  'lucky','lunch','magic','major','maple','march','match','medal','mercy','merge',
  'metal','might','minor','mirth','mixed','money','month','moral','motor','mouse',
  'mouth','moved','music','nerve','never','night','noise','north','novel','nurse',
  'occur','other','outer','owned','owner','ozone','paint','panel','paper','patch',
  'pause','peace','pearl','penny','phase','phone','photo','piano','pilot','pitch',
  'place','plain','plane','plant','plate','plaza','point','power','press','print',
  'prior','probe','proof','proud','prove','punch','pupil','purse','queen','query',
  'quick','quiet','quota','quote','radio','raise','ranch','range','rapid','reach',
  'ready','realm','rebel','refer','reign','relax','repay','reset','robin','rocky',
  'round','route','royal','ruler','rural','saint','salad','sauce','scale','scope',
  'score','scout','sense','serve','seven','shape','share','sharp','shell','shift',
  'shine','shirt','shock','shoot','short','shout','sight','silly','since','skill',
  'skull','slant','slash','sleep','slide','slope','small','smart','smell','smile',
  'smoke','snake','solid','solve','sorry','speak','speed','spend','spice','spike',
  'spine','split','spoon','sport','spray','squad','stack','staff','stage','stain',
  'stand','stark','start','stays','steam','steel','steep','stone','store','storm',
  'strip','stuck','study','style','sugar','suite','super','sweet','swift','sword',
  'table','taste','teach','teeth','tempo','tense','thank','thick','thing','think',
  'third','thorn','three','threw','throw','thumb','tight','timer','title','today',
  'token','touch','tower','track','trade','train','trait','trial','tribe','trick',
  'tried','truck','truly','trust','truth','tutor','twice','twist','under','union',
  'until','upper','urban','valid','value','valve','venue','video','viral','visit',
  'vital','vivid','vocal','voice','voted','watch','water','weave','wedge','weird',
  'where','while','white','whole','world','worse','worst','worth','write','wrong',
  'yeast','yield','young','youth','zebra',
  // 6-letter
  'absent','anyone','around','castle','beauty','before','broken','button','camera',
  'candle','carbon','carpet','casual','cattle','center','circle','clever','closet',
  'coffee','coming','corner','cotton','course','create','danger','decide','desert',
  'dinner','divide','doctor','dollar','donkey','double','dragon','during','easily',
  'elegant','empire','enable','ending','engine','enough','escape','estate','evolve',
  'falter','family','farmer','faster','father','female','finger','flower','follow',
  'forest','formal','foster','friend','frozen','future','garden','gentle','golden',
  'gothic','gravel','hammer','handle','happen','harbor','health','helper','hidden',
  'higher','honest','hunter','impact','insect','island','jigsaw','kitten','knight',
  'ladder','launch','latest','leader','legend','lesson','letter','listen','lizard',
  'manage','margin','market','master','mellow','modern','monkey','mother','muffin',
  'murder','mutual','narrow','nature','notice','noodle','number','object','office',
  'orange','origin','pardon','parrot','pencil','person','pillow','pirate','planet',
  'player','pocket','police','portal','potato','pretty','prison','profit','purple',
  'rabbit','raisin','random','reason','record','rescue','result','ribbon','rocket',
  'rubber','saddle','sample','screen','season','secret','settle','should','simple',
  'silver','sister','slowly','social','spoken','spring','square','statue','stream',
  'street','strong','summer','symbol','talent','target','theory','throat','through',
  'toward','travel','tunnel','turban','unfold','unique','unless','useful','valley',
  'victim','village','vision','wander','winter','wooden','yearly','yellow','zealot',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function compareAlpha(guess: string, secret: string): 'before' | 'after' | 'correct' {
  if (guess === secret) return 'correct';
  return guess < secret ? 'after' : 'before';
}

function scoreFromGuesses(guesses: number): number {
  if (guesses <= 0) return 0;
  // Fewer guesses = higher score, no hard cap: 1→1000, -80 per extra, floor 50
  return Math.max(50, 10000 - (guesses - 1) * 80);
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
  const [phase, setPhase] = useState<'start' | 'playing' | 'won'>('start');
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
          I&rsquo;m thinking of a secret word. After each guess I&rsquo;ll tell you whether
          the secret word comes <strong>before</strong> or <strong>after</strong> yours
          alphabetically. Your guesses stack above and below the input to show
          the narrowing range — close in from both sides!
        </p>
        <ul className={styles.ruleList}>
          <li>No guess limit — take as many as you need</li>
          <li>Fewer guesses = higher score</li>
          <li>Guess any word you like</li>
        </ul>
        <button className={styles.startBtn} onClick={startGame}>Start Game</button>
      </div>
    );
  }

  // TOP ZONE: guesses where secret is AFTER (these are too early alphabetically — closer to A)
  // Sorted ascending → earliest letters at top, tightest (largest) sits at bottom nearest the input
  const upperBounds = guesses
    .filter(g => g.result === 'after')
    .sort((a, b) => a.word.localeCompare(b.word));
  // BOTTOM ZONE: guesses where secret is BEFORE (these are too late alphabetically — closer to Z)
  // Sorted ascending → tightest (smallest of the too-late words) sits nearest the input
  const lowerBounds = guesses
    .filter(g => g.result === 'before')
    .sort((a, b) => a.word.localeCompare(b.word));

  return (
    <div className={styles.game}>
      {/* Counter */}
      <div className={styles.header}>
        <span className={styles.guessCount}>
          {guesses.length === 0 ? 'No guesses yet' : `${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}`}
        </span>
        {phase === 'playing' && guesses.length > 0 && (
          <span className={styles.scorePreview}>
            Current score: {scoreFromGuesses(guesses.length + 1)} pts if next is correct
          </span>
        )}
      </div>

      {/* Won banner */}
      {phase === 'won' && (
        <div className={styles.wonBanner}>
          🎉 Correct! &ldquo;<strong>{secret}</strong>&rdquo; in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!
          <br />
          <span className={styles.scoreNote}>Score: {scoreFromGuesses(guesses.length)} pts</span>
        </div>
      )}

      {/* ── SANDWICH LAYOUT ── */}
      <div className={styles.sandwich}>

        {/* TOP ZONE — too early (secret is AFTER these, closer to A end) */}
        <div className={`${styles.zone} ${styles.zoneTop}`}>
          {upperBounds.length === 0 ? (
            <span className={styles.zoneEmpty}>↓ Words that come before the secret will appear here</span>
          ) : (
            upperBounds.map((g, i) => (
              <div key={i} className={`${styles.chip} ${styles.chipAfter}`}>
                <span className={styles.chipArrow}>↓</span>
                <span className={styles.chipWord}>{g.word}</span>
              </div>
            ))
          )}
        </div>

        {/* DIVIDER + INPUT */}
        <div className={styles.inputZone}>
          <div className={styles.dividerLabel}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>secret word is somewhere between</span>
            <span className={styles.dividerLine} />
          </div>

          {phase === 'playing' ? (
            <>
              <div className={styles.inputRow}>
                <input
                  ref={inputRef}
                  className={styles.input}
                  value={input}
                  onChange={e => setInput(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                  onKeyDown={handleKey}
                  placeholder={guesses.length === 0 ? 'Type any word to start…' : 'Type your next guess…'}
                  maxLength={30}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button className={styles.guessBtn} onClick={handleGuess} disabled={!input.trim()}>
                  Guess
                </button>
              </div>
              {error && <p className={styles.errorMsg}>{error}</p>}
            </>
          ) : (
            <button className={styles.playAgainBtn} onClick={startGame}>Play Again</button>
          )}
        </div>

        {/* BOTTOM ZONE — too late (secret is BEFORE these, closer to Z end) */}
        <div className={`${styles.zone} ${styles.zoneBottom}`}>
          {lowerBounds.length === 0 ? (
            <span className={styles.zoneEmpty}>↑ Words that come after the secret will appear here</span>
          ) : (
            lowerBounds.map((g, i) => (
              <div key={i} className={`${styles.chip} ${styles.chipBefore}`}>
                <span className={styles.chipArrow}>↑</span>
                <span className={styles.chipWord}>{g.word}</span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
