'use client';

import MetricSlider from './MetricSlider';
import type { FilterDef, FilterRange } from './filters';
import styles from './StockScreener.module.css';

interface Props {
  def: FilterDef;
  range: FilterRange;
  onChange: (range: FilterRange) => void;
  rsiPeriod?: number;
}

export default function FilterRow({ def, range, onChange, rsiPeriod }: Props) {
  const label = def.id === 'rsi' && rsiPeriod ? `RSI (${rsiPeriod})` : def.label;

  return (
    <div className={`${styles.filterRow} ${range.enabled ? styles.filterRowOn : styles.filterRowOff}`}>
      <label className={styles.filterToggle}>
        <input
          type="checkbox"
          checked={range.enabled}
          onChange={e => onChange({ ...range, enabled: e.target.checked })}
        />
        <span className={styles.filterCheck} aria-hidden />
        <span className={styles.filterName}>{label}</span>
      </label>

      {range.enabled && (
        <div className={styles.filterSliders}>
          <MetricSlider
            label="Min"
            min={def.min}
            max={def.max}
            step={def.step}
            value={range.min}
            format={def.format}
            onChange={min => onChange({ ...range, min: Math.min(min, range.max) })}
          />
          <MetricSlider
            label="Max"
            hint={def.hint}
            min={def.min}
            max={def.max}
            step={def.step}
            value={range.max}
            format={def.format}
            onChange={max => onChange({ ...range, max: Math.max(max, range.min) })}
          />
        </div>
      )}
    </div>
  );
}
