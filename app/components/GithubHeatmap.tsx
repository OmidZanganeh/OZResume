'use client';
import { useEffect, useState } from 'react';
import styles from './GithubHeatmap.module.css';

interface Contribution { date: string; count: number; level: 0 | 1 | 2 | 3 | 4; }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function GithubHeatmap({ username = 'OmidZanganeh' }: { username?: string }) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`)
      .then(r => r.json())
      .then(data => {
        setContributions(data.contributions ?? []);
        setTotal(data.total?.lastYear ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [username]);

  if (loading) return <div className={styles.loading}>Loading GitHub activity…</div>;
  if (!contributions.length) return null;

  // Group into weeks (Sunday-first columns)
  const weeks: Contribution[][] = [];
  let week: Contribution[] = [];

  // Pad first week with nulls if needed
  const firstDay = new Date(contributions[0].date).getDay();
  for (let i = 0; i < firstDay; i++) week.push({ date: '', count: 0, level: 0 });

  for (const c of contributions) {
    week.push(c);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) weeks.push(week);

  // Get month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const firstReal = w.find(d => d.date);
    if (firstReal) {
      const m = new Date(firstReal.date).getMonth();
      if (m !== lastMonth) { monthLabels.push({ label: MONTHS[m], col: wi }); lastMonth = m; }
    }
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.titleRow}>
        <span className={styles.title}>GitHub Activity</span>
        <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer" className={styles.ghLink}>
          @{username} ↗
        </a>
        <span className={styles.totalBadge}>{total} contributions in the last year</span>
      </div>

      <div className={styles.grid}>
        {/* Month labels */}
        <div className={styles.monthRow}>
          {monthLabels.map((m, i) => (
            <span key={i} className={styles.monthLabel} style={{ gridColumnStart: m.col + 1 }}>
              {m.label}
            </span>
          ))}
        </div>

        {/* Contribution cells */}
        <div className={styles.cells}>
          {weeks.map((week, wi) => (
            <div key={wi} className={styles.weekCol}>
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`${styles.cell} ${styles[`level${day.level}`]} ${!day.date ? styles.empty : ''}`}
                  title={day.date ? `${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        {[0,1,2,3,4].map(l => <div key={l} className={`${styles.cell} ${styles[`level${l}`]}`} />)}
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  );
}
