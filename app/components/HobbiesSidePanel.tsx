'use client';
import styles from './HobbiesSidePanel.module.css';

const HOBBIES = [
  { label: 'Volleyball',      emoji: '🏐' },
  { label: 'Pickleball',      emoji: '🏓' },
  { label: 'Soccer',          emoji: '⚽' },
  { label: 'Workout',         emoji: '🏋️' },
  { label: 'Video Games',     emoji: '🎮' },
  { label: 'Movies & Series', emoji: '🎬' },
  { label: 'Traveling',       emoji: '✈️' },
];

const LIFE = [
  { label: 'Sleep',   pct: 30, color: '#8a9ab5' },
  { label: 'Work',    pct: 27, color: '#b5936a' },
  { label: 'Hobbies', pct: 33, color: '#7aab8a' },
  { label: 'Other',   pct: 10, color: '#c8c4bc' },
];

function buildConic() {
  let deg = 0;
  return LIFE.map(s => {
    const start = deg;
    deg += s.pct * 3.6;
    return `${s.color} ${start.toFixed(1)}deg ${deg.toFixed(1)}deg`;
  }).join(', ');
}

export default function HobbiesSidePanel() {
  const conic = buildConic();

  return (
    <div className={styles.wrap}>
      {/* ── Hobbies ── */}
      <h2 className={styles.title}>Hobbies</h2>
      <div className={styles.pills}>
        {HOBBIES.map((h, i) => (
          <span key={i} className={styles.pill}>
            {h.emoji} {h.label}
          </span>
        ))}
      </div>

      {/* ── Life Balance ── */}
      <h2 className={styles.title} style={{ marginTop: '22px' }}>Life Balance</h2>
      <div className={styles.donutRow}>
        <div className={styles.donut} style={{ background: `conic-gradient(${conic})` }}>
          <div className={styles.donutHole}>
            <span className={styles.donutText}>24h</span>
          </div>
        </div>
        <ul className={styles.legend}>
          {LIFE.map((s, i) => (
            <li key={i} className={styles.legendItem}>
              <span className={styles.dot} style={{ background: s.color }} />
              <span className={styles.legendLabel}>{s.label}</span>
              <span className={styles.legendPct}>{s.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
