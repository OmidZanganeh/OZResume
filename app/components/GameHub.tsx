'use client';
import { useState, useEffect } from 'react';
import styles from './GameHub.module.css';
import WordDrop from './games/WordDrop';
import FlagQuiz from './games/FlagQuiz';
import TypeRacer from './games/TypeRacer';
import WordOrder from './games/WordOrder';
import SudokuGame from './games/Sudoku';
import FlappyBird from './games/FlappyBird';

type Game = 'worddrop' | 'flagquiz' | 'typeracer' | 'wordorder' | 'sudoku' | 'flappy';
type LeaderEntry = { name: string; score: number };
type Screen = 'lobby' | 'playing' | 'result';

const GAMES = [
  {
    id: 'worddrop' as Game,
    emoji: '🌧️',
    title: 'Word Drop',
    desc: 'Type falling GIS terms before they hit the ground. One miss = game over.',
  },
  {
    id: 'flagquiz' as Game,
    emoji: '🚩',
    title: 'Flag Quiz',
    desc: 'Identify the country from its flag. Answer fast for bonus points. 10 flags.',
  },
  {
    id: 'typeracer' as Game,
    emoji: '⌨️',
    title: 'Type Racer',
    desc: 'Type GIS sentences as fast as possible. Score = average WPM over 3 rounds.',
  },
  {
    id: 'wordorder' as Game,
    emoji: '🔤',
    title: 'Word Order',
    desc: 'Guess the secret word — after each try you\'ll learn if it comes before or after yours alphabetically.',
  },
  {
    id: 'sudoku' as Game,
    emoji: '🔢',
    title: 'Sudoku',
    desc: 'Fill the 9×9 grid so every row, column, and box contains 1–9. Fewer mistakes + faster = higher score.',
  },
  {
    id: 'flappy' as Game,
    emoji: '🐦',
    title: 'Flappy SPLAT!',
    desc: 'Flap through neon pipes. Space or tap to fly. Each pipe = 100 pts.',
  },
];

const SCORE_LABELS: Record<Game, string> = {
  worddrop: 'pts',
  flagquiz: 'pts',
  typeracer: 'wpm',
  wordorder: 'pts',
  sudoku: 'pts',
  flappy: 'pts',
};

async function fetchLeaders(game: Game): Promise<LeaderEntry[]> {
  try {
    const res = await fetch(`/api/leaderboard?game=${game}`);
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function postScore(name: string, score: number, game: Game): Promise<LeaderEntry[]> {
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, game }),
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default function GameHub({ onClose }: { onClose: () => void }) {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [playerName, setPlayerName] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [activeTab, setActiveTab] = useState<Game>('worddrop');
  const [allLeaders, setAllLeaders] = useState<Record<Game, LeaderEntry[]>>({
    worddrop: [], flagquiz: [], typeracer: [], wordorder: [], sudoku: [], flappy: [],
  });
  const [lastScore, setLastScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchLeaders('worddrop'),
      fetchLeaders('flagquiz'),
      fetchLeaders('typeracer'),
      fetchLeaders('wordorder'),
      fetchLeaders('sudoku'),
      fetchLeaders('flappy'),
    ]).then(([wd, fq, tr, wo, su, fl]) => {
      setAllLeaders({ worddrop: wd, flagquiz: fq, typeracer: tr, wordorder: wo, sudoku: su, flappy: fl });
    });
  }, []);

  const startGame = (game: Game) => {
    if (!playerName.trim()) return;
    setSelectedGame(game);
    setLastScore(0);
    setIsNewRecord(false);
    setScreen('playing');
  };

  const handleFinish = async (score: number) => {
    setLastScore(score);
    setScreen('result');
    if (playerName.trim() && score > 0 && selectedGame) {
      setSaving(true);
      const updated = await postScore(playerName.trim(), score, selectedGame);
      setSaving(false);
      if (updated.length > 0) {
        setAllLeaders(prev => ({ ...prev, [selectedGame]: updated }));
        setIsNewRecord(updated.some(l => l.name === playerName.trim() && l.score === score));
      }
    }
  };

  const medals = ['🥇', '🥈', '🥉'];
  const currentLeaders = allLeaders[activeTab];
  const gameMeta = GAMES.find(g => g.id === selectedGame);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>// GIS Arcade</span>
        </div>

        {/* ── LOBBY ── */}
        {screen === 'lobby' && (
          <div className={styles.lobby}>
            <div className={styles.nameRow}>
              <input
                className={styles.nameInput}
                placeholder="Type your name here…"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={20}
                autoFocus
              />
              {!playerName.trim() && (
                <span className={styles.nameHint}>← enter your name first</span>
              )}
            </div>

            <div className={styles.gameCards}>
              {GAMES.map(g => (
                <button
                  key={g.id}
                  className={`${styles.gameCard} ${!playerName.trim() ? styles.gameCardLocked : ''}`}
                  onClick={() => {
                    if (!playerName.trim()) {
                      const input = document.querySelector('input[maxlength="20"]') as HTMLInputElement;
                      input?.focus();
                    } else {
                      startGame(g.id);
                    }
                  }}
                >
                  <span className={styles.gameEmoji}>{!playerName.trim() ? '🔒' : g.emoji}</span>
                  <span className={styles.gameCardTitle}>{g.title}</span>
                  <span className={styles.gameCardDesc}>
                    {!playerName.trim() ? 'Enter your name to unlock' : g.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Leaderboard tabs */}
            <div className={styles.leaderSection}>
              <div className={styles.leaderTabs}>
                {GAMES.map(g => (
                  <button
                    key={g.id}
                    className={`${styles.leaderTab} ${activeTab === g.id ? styles.leaderTabActive : ''}`}
                    onClick={() => setActiveTab(g.id)}
                  >
                    {g.emoji} {g.title}
                  </button>
                ))}
              </div>
              <div className={styles.leaderBoard}>
                {currentLeaders.length === 0 && (
                  <p className={styles.noScores}>No scores yet — be the first!</p>
                )}
                {currentLeaders.map((l, i) => (
                  <div key={i} className={styles.leaderRow}>
                    <span>{medals[i]} <strong>{l.name}</strong></span>
                    <span className={styles.leaderScore}>{l.score} {SCORE_LABELS[activeTab]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PLAYING ── */}
        {screen === 'playing' && selectedGame && (
          <div className={styles.playing}>
            <div className={styles.playingHeader}>
              <button className={styles.backBtn} onClick={() => setScreen('lobby')}>
                ← Back
              </button>
              <span className={styles.playingTitle}>
                {gameMeta?.emoji} {gameMeta?.title}
              </span>
              <span className={styles.playingPlayer}>👤 {playerName}</span>
            </div>

            {selectedGame === 'worddrop' && (
              <WordDrop
                playerName={playerName}
                leaders={allLeaders.worddrop}
                onFinish={handleFinish}
              />
            )}
            {selectedGame === 'flagquiz' && (
              <FlagQuiz
                playerName={playerName}
                leaders={allLeaders.flagquiz}
                onFinish={handleFinish}
              />
            )}
            {selectedGame === 'typeracer' && (
              <TypeRacer
                playerName={playerName}
                leaders={allLeaders.typeracer}
                onFinish={handleFinish}
              />
            )}
            {selectedGame === 'wordorder' && (
              <WordOrder
                playerName={playerName}
                leaders={allLeaders.wordorder}
                onFinish={handleFinish}
              />
            )}
            {selectedGame === 'sudoku' && (
              <SudokuGame
                playerName={playerName}
                leaders={allLeaders.sudoku}
                onFinish={handleFinish}
              />
            )}
            {selectedGame === 'flappy' && (
              <FlappyBird
                playerName={playerName}
                leaders={allLeaders.flappy}
                onFinish={handleFinish}
              />
            )}
          </div>
        )}

        {/* ── RESULT ── */}
        {screen === 'result' && selectedGame && (
          <div className={styles.result}>
            {isNewRecord && <p className={styles.newRecord}>🎉 New High Score!</p>}
            <p className={styles.resultTitle}>
              {lastScore > 0 && (selectedGame === 'wordorder' || selectedGame === 'sudoku')
                ? '🎉 You Got It!'
                : selectedGame === 'flappy'
                  ? `💥 SPLAT! — ${lastScore} pts`
                  : 'GAME OVER'}
            </p>
            <p className={styles.resultScore}>
              {playerName} · <strong>{lastScore}</strong> {SCORE_LABELS[selectedGame]}
            </p>

            {saving && <p className={styles.savingText}>Saving score…</p>}

            {!saving && allLeaders[selectedGame].length > 0 && (
              <div className={styles.resultBoard}>
                <p className={styles.resultBoardTitle}>🏆 {gameMeta?.title} Leaderboard</p>
                {allLeaders[selectedGame].map((l, i) => (
                  <div
                    key={i}
                    className={`${styles.leaderRow} ${l.name === playerName && l.score === lastScore ? styles.leaderHighlight : ''}`}
                  >
                    <span>{medals[i]} <strong>{l.name}</strong></span>
                    <span className={styles.leaderScore}>{l.score} {SCORE_LABELS[selectedGame]}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.resultActions}>
              <button className={styles.actionBtn} onClick={() => startGame(selectedGame)}>
                [ Play Again ]
              </button>
              <button className={styles.actionBtnGhost} onClick={() => setScreen('lobby')}>
                [ Change Game ]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
