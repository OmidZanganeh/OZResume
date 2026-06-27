'use client';

import { X } from 'lucide-react';
import MetricSlider from './MetricSlider';
import type { FilterDef, FilterRange } from './filters';
import styles from './StockScreener.module.css';

interface Props {
  def: FilterDef;
  range: FilterRange;
  onChange: (range: FilterRange) => void;
  /** Compact bar mode — no checkbox; always shows sliders. */
  compact?: boolean;
  onRemove?: () => void;
}

export default function FilterRow({ def, range, onChange, compact, onRemove }: Props) {
  if (compact) {
    return (
      <>
        <div className={styles.activeFilterCardHead}>
          <span className={styles.activeFilterCardTitle}>{def.label}</span>
          {onRemove && (
            <button
              type="button"
              className={styles.activeFilterRemove}
              onClick={onRemove}
              aria-label={`Remove ${def.label} filter`}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className={styles.filterSlidersCompact}>
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
            min={def.min}
            max={def.max}
            step={def.step}
            value={range.max}
            format={def.format}
            onChange={max => onChange({ ...range, max: Math.max(max, range.min) })}
          />
        </div>
      </>
    );
  }

  return (
    <div className={`${styles.filterRow} ${range.enabled ? styles.filterRowOn : styles.filterRowOff}`}>
      <label className={styles.filterToggle}>
        <input
          type="checkbox"
          checked={range.enabled}
          onChange={e => onChange({ ...range, enabled: e.target.checked })}
        />
        <span className={styles.filterCheck} aria-hidden />
        <span className={styles.filterName}>{def.label}</span>
      </label>

      <p className={styles.filterExplanation}>{def.explanation}</p>

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
