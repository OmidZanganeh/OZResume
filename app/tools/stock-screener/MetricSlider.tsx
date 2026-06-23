'use client';

import styles from './StockScreener.module.css';

interface Props {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

export default function MetricSlider({
  label, hint, min, max, step, value, format, onChange,
}: Props) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.sliderBlock}>
      <div className={styles.sliderHead}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue}>{format(value)}</span>
      </div>
      {hint && <p className={styles.sliderHint}>{hint}</p>}
      <div className={styles.sliderTrackWrap}>
        <input
          type="range"
          className={styles.sliderInput}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
          aria-label={label}
        />
        <div className={styles.sliderBounds}>
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </div>
      </div>
    </div>
  );
}
