'use client';

import { RotateCcw } from 'lucide-react';
import FilterRow from './FilterRow';
import {
  FILTER_DEFS, RSI_PERIODS, ALL_SECTORS,
  DEFAULT_SCREENER_STATE, isDefaultState, enabledFilterCount,
} from './filters';
import type { ScreenerState } from './filters';
import type { Sector } from './types';
import styles from './StockScreener.module.css';

interface Props {
  state: ScreenerState;
  onChange: (state: ScreenerState) => void;
  isHistorical?: boolean;
}

export default function FilterSidebar({ state, onChange, isHistorical }: Props) {
  const setFilter = (id: typeof FILTER_DEFS[number]['id'], range: ScreenerState['filters'][typeof id]) => {
    onChange({ ...state, filters: { ...state.filters, [id]: range } });
  };

  const toggleSector = (sector: Sector) => {
    const has = state.sectors.includes(sector);
    const sectors = has
      ? state.sectors.filter(s => s !== sector)
      : [...state.sectors, sector];
    onChange({ ...state, sectors });
  };

  const activeCount = enabledFilterCount(state);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHead}>
        <div>
          <h2 className={styles.sidebarTitle}>Screening Filters</h2>
          <span className={styles.activeCount}>{activeCount} active</span>
        </div>
        <button
          type="button"
          className={styles.resetBtn}
          onClick={() => onChange(DEFAULT_SCREENER_STATE)}
          disabled={isDefaultState(state)}
          title="Reset all filters"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {isHistorical && (
        <p className={styles.historicalNote}>
          Filters apply to <strong>past</strong> values at the selected date.
        </p>
      )}

      <div className={styles.rsiPeriodBlock}>
        <span className={styles.rsiPeriodLabel}>RSI Period</span>
        <div className={styles.rsiPeriodBtns}>
          {RSI_PERIODS.map(p => (
            <button
              key={p}
              type="button"
              className={`${styles.rsiPeriodBtn} ${state.rsiPeriod === p ? styles.rsiPeriodBtnActive : ''}`}
              onClick={() => onChange({ ...state, rsiPeriod: p })}
            >
              {p}
            </button>
          ))}
        </div>
        <p className={styles.sliderHint}>Standard lookbacks — shorter = more reactive</p>
      </div>

      <div className={styles.filterList}>
        {FILTER_DEFS.map(def => (
          <FilterRow
            key={def.id}
            def={def}
            range={state.filters[def.id]}
            rsiPeriod={def.id === 'rsi' ? state.rsiPeriod : undefined}
            onChange={r => setFilter(def.id, r)}
          />
        ))}
      </div>

      <div className={`${styles.filterRow} ${state.sectorFilterEnabled ? styles.filterRowOn : styles.filterRowOff}`}>
        <label className={styles.filterToggle}>
          <input
            type="checkbox"
            checked={state.sectorFilterEnabled}
            onChange={e => onChange({ ...state, sectorFilterEnabled: e.target.checked })}
          />
          <span className={styles.filterCheck} aria-hidden />
          <span className={styles.filterName}>Sector</span>
        </label>
        {state.sectorFilterEnabled && (
          <div className={styles.sectorChips}>
            {ALL_SECTORS.map(sector => (
              <button
                key={sector}
                type="button"
                className={`${styles.sectorChip} ${state.sectors.includes(sector) ? styles.sectorChipOn : ''}`}
                onClick={() => toggleSector(sector)}
              >
                {sector}
              </button>
            ))}
            {state.sectors.length === 0 && (
              <p className={styles.sectorHint}>Select one or more sectors</p>
            )}
          </div>
        )}
      </div>

      <div className={styles.legend}>
        <p className={styles.legendTitle}>Tip</p>
        <p className={styles.legendTip}>Toggle off any filter you don&apos;t want applied. Disabled filters are ignored.</p>
      </div>
    </aside>
  );
}
