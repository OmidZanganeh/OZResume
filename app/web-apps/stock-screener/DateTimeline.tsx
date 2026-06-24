'use client';

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatAsOfDate, daysAgoToDate } from './historical';
import { HISTORY_DAYS } from './types';
import styles from './StockScreener.module.css';

interface Props {
  daysAgo: number;
  onChange: (daysAgo: number) => void;
}

export default function DateTimeline({ daysAgo, onChange }: Props) {
  const isToday = daysAgo <= 0;
  const sliderPos = HISTORY_DAYS - daysAgo;
  const pct = (sliderPos / HISTORY_DAYS) * 100;

  const shift = (delta: number) => {
    onChange(Math.min(HISTORY_DAYS, Math.max(0, daysAgo + delta)));
  };

  return (
    <div className={styles.dateBar}>
      <div className={styles.dateBarTop}>
        <div className={styles.dateBarLabel}>
          <Calendar size={15} className={styles.dateBarIcon} />
          <span>Screen as of</span>
          <strong className={styles.dateBarValue}>{formatAsOfDate(daysAgo)}</strong>
          {!isToday && (
            <span className={styles.dateBarHint}>
              — past prices from Finnhub return windows; growth shows change to today
            </span>
          )}
        </div>
        <div className={styles.dateBarActions}>
          <button type="button" className={styles.dateStepBtn} onClick={() => shift(30)} disabled={daysAgo >= HISTORY_DAYS} title="30 days earlier">
            <ChevronLeft size={14} /> 1 mo
          </button>
          <button
            type="button"
            className={styles.dateTodayBtn}
            onClick={() => onChange(0)}
            disabled={isToday}
          >
            Today
          </button>
          <button type="button" className={styles.dateStepBtn} onClick={() => shift(-30)} disabled={daysAgo <= 0} title="30 days later">
            1 mo <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className={styles.dateSliderWrap}>
        <span className={styles.dateBound}>{daysAgoToDate(HISTORY_DAYS).getFullYear()}</span>
        <input
          type="range"
          className={styles.dateSlider}
          min={0}
          max={HISTORY_DAYS}
          step={1}
          value={sliderPos}
          onChange={e => onChange(HISTORY_DAYS - parseInt(e.target.value, 10))}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
          aria-label="Screening date — drag left for up to 1 year ago, right for today"
        />
        <span className={styles.dateBound}>Today</span>
      </div>
    </div>
  );
}
