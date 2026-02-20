'use client';
import styles from './HobbiesSection.module.css';

const HOBBIES = [
  { label: 'Volleyball',      emoji: '🏐', size: 76, angle: -90  },
  { label: 'Pickleball',      emoji: '🏓', size: 70, angle: -38  },
  { label: 'Soccer',          emoji: '⚽', size: 65, angle:  13  },
  { label: 'Workout',         emoji: '🏋️', size: 68, angle:  64  },
  { label: 'Video Games',     emoji: '🎮', size: 68, angle: 116  },
  { label: 'Movies & Series', emoji: '🎬', size: 64, angle: 167  },
  { label: 'Traveling',       emoji: '✈️', size: 72, angle: 218  },
];

const LIFE = [
  { label: 'Sleep',   pct: 30, color: '#8a9ab5' },
  { label: 'Work',    pct: 27, color: '#b5936a' },
  { label: 'Hobbies', pct: 33, color: '#7aab8a' },
  { label: 'Other',   pct: 10, color: '#c8c4bc' },
];

const R_FULL = 112;
const CX_FULL = 160; const CY_FULL = 160;

const R_COMPACT = 118;
const CX_COMPACT = 170; const CY_COMPACT = 170;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function buildConic() {
  let deg = 0;
  return LIFE.map(s => {
    const start = deg;
    deg += s.pct * 3.6;
    return `${s.color} ${start.toFixed(1)}deg ${deg.toFixed(1)}deg`;
  }).join(', ');
}

type Props = { compact?: boolean };

export default function HobbiesSection({ compact = false }: Props) {
  const conic = buildConic();
  const R = compact ? R_COMPACT : R_FULL;
  const CX = compact ? CX_COMPACT : CX_FULL;
  const CY = compact ? CY_COMPACT : CY_FULL;
  const bubbleScale = compact ? 0.95 : 1;
  const bubbleSizes = HOBBIES.map(h => Math.round(h.size * bubbleScale));

  return (
    <section className={`${styles.section} ${compact ? styles.compact : ''}`}>
      {!compact && <h2 className={styles.sectionTitle}>Interests &amp; Balance</h2>}

      <div className={styles.grid}>
        {/* ── Hobby Bubbles ── */}
        <div className={styles.bubblesWrap}>
          <p className={styles.subLabel}>Hobbies</p>
          <div className={`${styles.bubblesContainer} ${compact ? styles.bubblesCompact : ''}`}>
            {/* SVG connector lines */}
            <svg className={styles.lines} viewBox={compact ? '0 0 340 340' : '0 0 320 320'}>
              {HOBBIES.map((h, i) => {
                const cx = CX + R * Math.cos(toRad(h.angle));
                const cy = CY + R * Math.sin(toRad(h.angle));
                return (
                  <line
                    key={i}
                    x1={CX} y1={CY} x2={cx} y2={cy}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.18"
                    strokeDasharray="3 3"
                    className={styles.connectorLine}
                  />
                );
              })}
            </svg>

            {/* Center bubble */}
            <div className={`${styles.centerBubble} ${compact ? styles.centerCompact : ''}`}>
              <span>Hobbies</span>
            </div>

            {/* Hobby bubbles */}
            {HOBBIES.map((h, i) => {
              const sz = bubbleSizes[i];
              const cx = CX + R * Math.cos(toRad(h.angle));
              const cy = CY + R * Math.sin(toRad(h.angle));
              const labelAbove = i % 2 === 0;
              return (
                <div
                  key={i}
                  className={styles.hobbyBubble}
                  style={{
                    width: sz,
                    height: sz,
                    left: cx - sz / 2,
                    top:  cy - sz / 2,
                    animationDelay: `${i * 0.25}s`,
                  }}
                >
                  {labelAbove ? (
                    <>
                      <span className={styles.hobbyLabel}>{h.label}</span>
                      <span className={styles.hobbyEmoji}>{h.emoji}</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.hobbyEmoji}>{h.emoji}</span>
                      <span className={styles.hobbyLabel}>{h.label}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Life Balance Donut ── */}
        <div className={`${styles.donutWrap} ${compact ? styles.donutCompact : ''}`}>
          <p className={styles.subLabel}>Life Balance</p>
          <div className={styles.donutChart} style={{ background: `conic-gradient(${conic})` }}>
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
