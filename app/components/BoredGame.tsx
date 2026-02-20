'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './BoredGame.module.css';

const WORDS = [
  // GIS core
  'raster','vector','datum','lidar','geojson','shapefile','projection',
  'topology','spatial','buffer','overlay','interpolate','reclassify',
  'georeferencing','digitize','attribute','metadata','coordinate','elevation',
  'contour','watershed','slope','aspect','viewshed','hillshade','mosaic',
  'clip','dissolve','merge','union','intersect','erase','append','relate',
  'domain','subtype','feature','basemap','tile','portal','geocode','centroid',
  'extent','symbology','legend','graticule','parallels','meridian','equator',
  'latitude','longitude','azimuth','bearing','cadastral','parcel','cadastre',
  'geostatistics','kriging','thiessen','voronoi','tin','dem','dsm','dtm',
  'orthorectify','photogrammetry','parallax','stereo','aerial','drone','uav',
  'multispectral','hyperspectral','infrared','pointcloud','voxel',
  // Remote sensing
  'tropomi','sentinel','landsat','modis','ndvi','ndwi','savi','evi',
  'classification','spectral','temporal','composite','calibration',
  'radiance','reflectance','emissivity','albedo','backscatter','coherence',
  'interferometry','sar','insar','phenology','biomass','canopy','impervious',
  // Coding & data
  'python','csharp','sql','arcpy','pandas','numpy','geopandas','shapely',
  'fiona','rasterio','gdal','ogr','pyproj','folium','leaflet','mapbox',
  'geotiff','netcdf','hdf','csv','json','xml','api','rest','graphql',
  'boolean','integer','string','query','schema','index','function','class',
  'loop','array','dictionary','module','variable','parameter','algorithm',
  // AI & Azure
  'azure','gemini','neural','model','token','prompt','agent','classify',
  'embedding','inference','training','pipeline','llm','ocr','grounding',
  // Telecom / Fiber
  'fiber','network','rfp','bore','telecom','cable','conduit','splice',
  'splitter','manhole','handhole','strand','attachment','pole','duct',
  'route','span','riser','trench','directional','pullbox','closure',
  // Places & orgs
  'olsson','omaha','lincoln','nebraska','arcgis','qgis','autocad','envi',
  'tableau','github','smartsheet','postgresql','sqlserver',
];

const COLS = 6;
const TICK_MS = 1400;
const SPEED_UP = 0.93;

type FallingWord = { id: number; word: string; col: number; row: number };
type LeaderEntry = { name: string; score: number };

let idCounter = 0;

async function fetchLeaders(): Promise<LeaderEntry[]> {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function postScore(name: string, score: number): Promise<LeaderEntry[]> {
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default function BoredGame({ onClose }: { onClose: () => void }) {
  const [screen, setScreen] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [words, setWords] = useState<FallingWord[]>([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(TICK_MS);
  const inputRef = useRef<HTMLInputElement>(null);
  const roundRef = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    fetchLeaders().then(setLeaders);
  }, []);

  const clearIntervals = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
  };

  const showFlash = (msg: string) => {
    setFlash(null);
    setTimeout(() => setFlash(msg), 10);
    setTimeout(() => setFlash(null), 750);
  };

  const endGame = useCallback(async (finalScore: number) => {
    clearIntervals();
    setScreen('gameover');
    if (playerName.trim() && finalScore > 0) {
      setSaving(true);
      const updated = await postScore(playerName.trim(), finalScore);
      setSaving(false);
      if (updated.length > 0) {
        setLeaders(updated);
        setIsNewRecord(updated.some(l => l.name === playerName.trim() && l.score === finalScore));
      }
    }
  }, [playerName]);

  const spawnWord = useCallback(() => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWords(prev => {
      const usedCols = prev.filter(w => w.row < 2).map(w => w.col);
      let col = Math.floor(Math.random() * COLS);
      let tries = 0;
      while (usedCols.includes(col) && tries < COLS) { col = (col + 1) % COLS; tries++; }
      return [...prev, { id: idCounter++, word, col, row: 0 }];
    });
  }, []);

  const tick = useCallback(() => {
    setWords(prev => {
      const next: FallingWord[] = [];
      let lost = 0;
      for (const w of prev) {
        if (w.row >= 9) lost++;
        else next.push({ ...w, row: w.row + 1 });
      }
      if (lost > 0) {
        setLives(l => {
          const nl = l - lost;
          if (nl <= 0) {
            setTimeout(() => endGame(scoreRef.current), 50);
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
      speedRef.current = Math.max(320, speedRef.current * SPEED_UP);
    }
  }, [endGame]);

  const startGame = () => {
    if (!playerName.trim()) return;
    setWords([]);
    setInput('');
    setScore(0);
    scoreRef.current = 0;
    setLives(3);
    setCombo(0);
    setFlash(null);
    setIsNewRecord(false);
    speedRef.current = TICK_MS;
    roundRef.current = 0;
    idCounter = 0;
    setScreen('playing');
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  useEffect(() => {
    if (screen !== 'playing') return;
    spawnWord();
    tickRef.current = setInterval(tick, speedRef.current);
    spawnRef.current = setInterval(spawnWord, 2400);
    return clearIntervals;
  }, [screen, tick, spawnWord]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toLowerCase();
    setInput(val);
    const match = words.find(w => w.word === val);
    if (match) {
      setWords(prev => prev.filter(w => w.id !== match.id));
      setInput('');
      setCombo(c => c + 1);
      const pts = 10 + (combo >= 2 ? combo * 5 : 0);
      setScore(s => { scoreRef.current = s + pts; return s + pts; });
      showFlash(combo >= 2 ? `🔥 x${combo + 1} COMBO! +${pts}` : `✓ +${pts}`);
    }
  };

  const ROWS = 10;
  const grid: (FallingWord | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  words.forEach(w => { if (w.row < ROWS && w.col < COLS) grid[w.row][w.col] = w; });

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <div className={styles.header}>
          <span className={styles.titleGame}>// GIS Word Drop</span>
          {screen === 'playing' && (
            <div className={styles.hud}>
              <span className={styles.hudItem}>{'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, 3 - lives))}</span>
              <span className={styles.hudItem}>Score: <strong>{score}</strong></span>
              {combo >= 2 && <span className={styles.comboTag}>🔥 x{combo}</span>}
            </div>
          )}
        </div>

        {flash && <div className={styles.flash} key={flash}>{flash}</div>}

        {/* ── START SCREEN ── */}
        {screen === 'start' && (
          <div className={styles.startScreen}>
            <p className={styles.startText}>
              GIS &amp; tech words fall from the sky.<br />
              Type them before they hit the ground.<br />
              Miss 3 → game over. Build combos for bonus points!
            </p>

            <input
              className={styles.nameInput}
              placeholder="Enter your name..."
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startGame()}
              maxLength={20}
              autoFocus
            />

            <button
              className={styles.startBtn}
              onClick={startGame}
              disabled={!playerName.trim()}
            >
              [ Start Game ]
            </button>

            {leaders.length > 0 && (
              <div className={styles.leaderboard}>
                <p className={styles.leaderTitle}>🏆 Global Top Scores</p>
                {leaders.map((l, i) => (
                  <div key={i} className={styles.leaderRow}>
                    <span>{medals[i]} {l.name}</span>
                    <span className={styles.leaderScore}>{l.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PLAYING ── */}
        {screen === 'playing' && (
          <>
            <div className={styles.grid}>
              {grid.map((row, ri) => (
                <div key={ri} className={styles.row}>
                  {row.map((cell, ci) => (
                    <div key={ci} className={styles.cell}>
                      {cell && (
                        <span className={`${styles.word} ${cell.row >= 7 ? styles.danger : cell.row >= 4 ? styles.warn : ''}`}>
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
              placeholder="type a word..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </>
        )}

        {/* ── GAME OVER ── */}
        {screen === 'gameover' && (
          <div className={styles.startScreen}>
            <p className={styles.gameOverText}>GAME OVER</p>
            {isNewRecord && <p className={styles.newRecord}>🎉 New High Score!</p>}
            <p className={styles.finalScore}>
              {playerName} scored <strong>{score}</strong>
            </p>

            {saving && <p className={styles.savingText}>Saving score...</p>}

            {!saving && leaders.length > 0 && (
              <div className={styles.leaderboard}>
                <p className={styles.leaderTitle}>🏆 Global Top Scores</p>
                {leaders.map((l, i) => (
                  <div
                    key={i}
                    className={`${styles.leaderRow} ${l.name === playerName && l.score === score ? styles.leaderHighlight : ''}`}
                  >
                    <span>{medals[i]} {l.name}</span>
                    <span className={styles.leaderScore}>{l.score}</span>
                  </div>
                ))}
              </div>
            )}

            <button className={styles.startBtn} onClick={() => setScreen('start')}>
              [ Play Again ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
