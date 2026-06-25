'use client';

import { useCallback, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatAsOfDate, daysAgoToDate } from './timelineDate';
import { HISTORY_DAYS, HISTORY_STEP_DAYS } from './types';
import styles from './StockScreener.module.css';

interface Props {
  daysAgo: number;
  onChange: (daysAgo: number) => void;
}

function snapDaysAgo(days: number): number {
  if (days <= 0) return 0;
  const snapped = Math.round(days / HISTORY_STEP_DAYS) * HISTORY_STEP_DAYS;
  return Math.min(HISTORY_DAYS, Math.max(HISTORY_STEP_DAYS, snapped));
}

export default function DateTimeline({ daysAgo, onChange }: Props) {
  const [dragPos, setDragPos] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const isToday = daysAgo <= 0 && dragPos === null;
  const sliderPos = dragPos ?? (HISTORY_DAYS - daysAgo);
  const displayDaysAgo = HISTORY_DAYS - sliderPos;
  const pct = (sliderPos / HISTORY_DAYS) * 100;

  const commitSlider = useCallback((pos: number) => {
    draggingRef.current = false;
    setDragPos(null);
    const next = HISTORY_DAYS - pos;
    onChange(next <= 0 ? 0 : snapDaysAgo(next));
  }, [onChange]);

  const shift = (delta: number) => {
    const next = Math.min(HISTORY_DAYS, Math.max(0, daysAgo + delta));
    onChange(next <= 0 ? 0 : snapDaysAgo(next));
  };

  return (
    <div className={styles.dateBar}>
      <div className={styles.dateBarTop}>
        <div className={styles.dateBarLabel}>
          <Calendar size={15} className={styles.dateBarIcon} />
          <span>Screen as of</span>
          <strong className={styles.dateBarValue}>{formatAsOfDate(displayDaysAgo)}</strong>
          {displayDaysAgo > 0 && (
            <span className={styles.dateBarHint}>
              — weekly closing prices; growth shows change to today
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
          step={HISTORY_STEP_DAYS}
          value={sliderPos}
          onPointerDown={() => { draggingRef.current = true; }}
          onInput={e => {
            if (!draggingRef.current) return;
            setDragPos(parseInt((e.target as HTMLInputElement).value, 10));
          }}
          onPointerUp={e => commitSlider(parseInt((e.target as HTMLInputElement).value, 10))}
          onPointerCancel={e => commitSlider(parseInt((e.target as HTMLInputElement).value, 10))}
          onKeyUp={e => {
            if (e.key === 'Enter') commitSlider(parseInt((e.target as HTMLInputElement).value, 10));
          }}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
          aria-label="Screening date — drag left for up to 10 years ago, right for today"
        />
        <span className={styles.dateBound}>Today</span>
      </div>
    </div>
  );
}