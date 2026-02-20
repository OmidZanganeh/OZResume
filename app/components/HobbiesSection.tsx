'use client';
import styles from './HobbiesSection.module.css';

const HOBBIES = [
  { label: 'Volleyball',      emoji: '🏐', size: 78, angle: -90,  color: '#3b82f6' },
  { label: 'Pickleball',      emoji: '🏓', size: 72, angle: -30,  color: '#8b5cf6' },
  { label: 'Soccer',          emoji: '⚽', size: 66, angle:  30,  color: '#22c55e' },
  { label: 'Video Games',     emoji: '🎮', size: 70, angle:  90,  color: '#f97316' },
  { label: 'Movies & Series', emoji: '🎬', size: 66, angle: 150,  color: '#ec4899' },
  { label: 'Traveling',       emoji: '✈️', size: 74, angle: 210,  color: '#06b6d4' },
];

const LIFE = [
  { label: 'Sleep',       pct: 30, color: '#3b82f6' },
  { label: 'Work',        pct: 27, color: '#f97316' },
  { label: 'Hobbies',     pct: 22, color: '#22c55e' },
  { label: 'Gym/Sports',  pct: 13, color: '#8b5cf6' },
  { label: 'Other',       pct:  8, color: '#a39f92' },
];

const R = 115; // orbit radius from center of 320×320 container
const CX = 160; const CY = 160;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

// Build conic-gradient string
function buildConic() {
  let deg = 0;
  return LIFE.map(s => {
    const start = deg;
    deg += s.pct * 3.6;
    return `${s.color} ${start.toFixed(1)}deg ${deg.toFixed(1)}deg`;
  }).join(', ');
}

export default function HobbiesSection() {
  const conic = buildConic();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Beyond the Code</h2>

      <div className={styles.grid}>
        {/* ── Hobby Bubbles ── */}
        <div className={styles.bubblesWrap}>
          <h3 className={styles.subTitle}>Hobbies</h3>
          <div className={styles.bubblesContainer}>
            {/* SVG connector lines */}
            <svg className={styles.lines} viewBox="0 0 320 320">
              {HOBBIES.map((h, i) => {
                const cx = CX + R * Math.cos(toRad(h.angle));
                const cy = CY + R * Math.sin(toRad(h.angle));
                return (
                  <line
                    key={i}
                    x1={CX} y1={CY}
                    x2={cx} y2={cy}
                    stroke={h.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.35"
                    strokeDasharray="4 3"
                  />
                );
              })}
            </svg>

            {/* Center bubble */}
            <div className={styles.centerBubble}>
              <span>My</span>
              <span>Hobbies</span>
            </div>

            {/* Hobby bubbles */}
            {HOBBIES.map((h, i) => {
              const cx = CX + R * Math.cos(toRad(h.angle));
              const cy = CY + R * Math.sin(toRad(h.angle));
              return (
                <div
                  key={i}
                  className={styles.hobbyBubble}
                  style={{
                    width: h.size,
                    height: h.size,
                    left: cx - h.size / 2,
                    top:  cy - h.size / 2,
                    background: h.color,
                    animationDelay: `${i * 0.3}s`,
                  }}
                >
                  <span className={styles.hobbyEmoji}>{h.emoji}</span>
                  <span className={styles.hobbyLabel}>{h.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Life Balance Donut ── */}
        <div className={styles.donutWrap}>
          <h3 className={styles.subTitle}>Life Balance</h3>
          <div className={styles.donutChart}
            style={{ background: `conic-gradient(${conic})` }}
          >
            <div className={styles.donutHole}>
              <span className={styles.donutCenter}>24h</span>
              <span className={styles.donutSub}>a day</span>
            </div>
          </div>

          <ul className={styles.legend}>
            {LIFE.map((s, i) => (
              <li key={i} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: s.color }} />
                <span className={styles.legendLabel}>{s.label}</span>
                <span className={styles.legendPct}>{s.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
