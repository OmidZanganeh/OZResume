'use client';

import { RotateCcw } from 'lucide-react';
import FilterRow from './FilterRow';
import {
  FILTER_CATEGORIES, filtersByCategory, ALL_SECTORS,
  DEFAULT_SCREENER_STATE, isDefaultState, enabledFilterCount,
} from './filters';
import type { ScreenerState, FilterId } from './filters';
import type { Sector } from './types';
import styles from './StockScreener.module.css';

interface Props {
  state: ScreenerState;
  onChange: (state: ScreenerState) => void;
  isHistorical?: boolean;
}

export default function FilterSidebar({ state, onChange, isHistorical }: Props) {
  const setFilter = (id: FilterId, range: ScreenerState['filters'][FilterId]) => {
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
    <div className={styles.filterSidebarScroll}>
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
          Historical view shows <strong>weekly prices and returns</strong> only.
          Filters always use <strong>today’s live</strong> Finnhub fundamentals.
        </p>
      )}

      {FILTER_CATEGORIES.map(cat => (
        <section key={cat.id} className={styles.filterCategory}>
          <div className={styles.categoryHead}>
            <h3 className={`${styles.categoryTitle} ${cat.id === 'fundamental' ? styles.catFundamental : styles.catTechnical}`}>
              {cat.label}
            </h3>
            <p className={styles.categoryDesc}>{cat.description}</p>
          </div>

          <div className={styles.filterList}>
            {filtersByCategory(cat.id).map(def => (
              <FilterRow
                key={def.id}
                def={def}
                range={state.filters[def.id]}
                onChange={r => setFilter(def.id, r)}
              />
            ))}
          </div>

          {cat.id === 'fundamental' && (
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
              <p className={styles.filterExplanation}>
                Limit results to one or more industries. Different sectors have different typical valuations — compare peers within the same sector for meaningful screens.
              </p>
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
          )}
        </section>
      ))}

      <div className={styles.legend}>
        <p className={styles.legendTitle}>How to use</p>
        <p className={styles.legendTip}>
          Check a filter to enable it, then set min/max. Unchecked filters are completely ignored — mix fundamental quality screens with technical momentum rules as you like.
        </p>
      </div>
    </div>
  );
}
