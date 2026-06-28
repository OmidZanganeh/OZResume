'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Code2, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import FilterRow from './FilterRow';
import CodeFilterPanel from './CodeFilterPanel';
import {
  ALL_SECTORS,
  DEFAULT_SCREENER_STATE,
  FILTER_CATEGORIES,
  FILTER_DEFS,
  activeMetricFilterIds,
  codeFilterError,
  disableFilter,
  enableFilter,
  enabledFilterCount,
  filtersByCategory,
  inactiveMetricFilterIds,
  isCodeFilterActive,
  isDefaultState,
} from './filters';
import type { FilterId, FilterMode, ScreenerState } from './filters';
import type { Sector } from './types';
import styles from './StockScreener.module.css';

interface Props {
  state: ScreenerState;
  onChange: (state: ScreenerState) => void;
  isHistorical?: boolean;
}

export default function FilterBar({ state, onChange, isHistorical }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  const activeIds = activeMetricFilterIds(state);
  const inactiveIds = inactiveMetricFilterIds(state);
  const activeCount = enabledFilterCount(state);
  const codeErr = codeFilterError(state);
  const codeActive = isCodeFilterActive(state);

  const setFilter = (id: FilterId, range: ScreenerState['filters'][FilterId]) => {
    onChange({ ...state, filters: { ...state.filters, [id]: range } });
  };

  const setMode = (mode: FilterMode) => {
    onChange({ ...state, filterMode: mode });
  };

  const toggleSector = (sector: Sector) => {
    const has = state.sectors.includes(sector);
    const sectors = has
      ? state.sectors.filter(s => s !== sector)
      : [...state.sectors, sector];
    onChange({ ...state, sectors });
  };

  const addFilter = (id: FilterId) => {
    onChange(enableFilter(state, id));
    setPickerOpen(false);
    setPickerQuery('');
  };

  const addSectorFilter = () => {
    onChange({ ...state, sectorFilterEnabled: true });
    setPickerOpen(false);
    setPickerQuery('');
  };

  const removeSectorFilter = () => {
    onChange({ ...state, sectorFilterEnabled: false, sectors: [] });
  };

  const filteredPickerGroups = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return FILTER_CATEGORIES.map(cat => {
      const items = filtersByCategory(cat.id).filter(def => {
        if (state.filters[def.id]?.enabled) return false;
        if (!q) return true;
        return (
          def.label.toLowerCase().includes(q) ||
          def.explanation.toLowerCase().includes(q)
        );
      });
      return { ...cat, items };
    }).filter(g => g.items.length > 0);
  }, [pickerQuery, state.filters]);

  const showSectorInPicker = !state.sectorFilterEnabled && (
    !pickerQuery.trim() || 'sector'.includes(pickerQuery.trim().toLowerCase())
  );

  useEffect(() => {
    if (!pickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) setPickerQuery('');
  }, [pickerOpen]);

  const canAddMore = inactiveIds.length > 0 || !state.sectorFilterEnabled;
  const isVisual = state.filterMode === 'visual';

  return (
    <section className={styles.filterBar} aria-label="Screening filters">
      <div className={styles.filterBarHead}>
        <div className={styles.filterBarTitleGroup}>
          <h2 className={styles.filterBarTitle}>Filters</h2>
          {activeCount > 0 && (
            <span className={styles.filterBarCount}>{activeCount} active</span>
          )}
          {state.filterMode === 'code' && codeErr && (
            <span className={styles.filterBarCountWarn}>Syntax error</span>
          )}
        </div>

        <div className={styles.filterModeTabs} role="tablist" aria-label="Filter mode">
          <button
            type="button"
            role="tab"
            aria-selected={isVisual}
            className={`${styles.filterModeTab} ${isVisual ? styles.filterModeTabActive : ''}`}
            onClick={() => setMode('visual')}
          >
            <SlidersHorizontal size={14} aria-hidden />
            Sliders
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isVisual}
            className={`${styles.filterModeTab} ${!isVisual ? styles.filterModeTabActive : ''}`}
            onClick={() => setMode('code')}
          >
            <Code2 size={14} aria-hidden />
            Code
          </button>
        </div>

        {isVisual && (
          <div className={styles.filterBarActions}>
            <div className={styles.addFilterWrap} ref={pickerRef}>
              <button
                type="button"
                className={styles.addFilterBtn}
                onClick={() => setPickerOpen(v => !v)}
                disabled={!canAddMore}
                aria-expanded={pickerOpen}
                aria-haspopup="listbox"
              >
                <Plus size={14} />
                Add filter
              </button>

              {pickerOpen && canAddMore && (
                <div className={styles.filterPicker} role="listbox">
                  <div className={styles.filterPickerSearch}>
                    <Search size={14} aria-hidden />
                    <input
                      type="search"
                      className={styles.filterPickerInput}
                      placeholder="Search filters…"
                      value={pickerQuery}
                      onChange={e => setPickerQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {showSectorInPicker && (
                    <div className={styles.filterPickerGroup}>
                      <p className={styles.filterPickerGroupLabel}>Fundamental</p>
                      <button
                        type="button"
                        className={styles.filterPickerItem}
                        onClick={addSectorFilter}
                      >
                        <span className={styles.filterPickerItemLabel}>Sector</span>
                        <span className={styles.filterPickerItemHint}>Industry group</span>
                      </button>
                    </div>
                  )}

                  {filteredPickerGroups.map(group => (
                    <div key={group.id} className={styles.filterPickerGroup}>
                      <p className={styles.filterPickerGroupLabel}>{group.label}</p>
                      {group.items.map(def => (
                        <button
                          key={def.id}
                          type="button"
                          className={styles.filterPickerItem}
                          onClick={() => addFilter(def.id)}
                        >
                          <span className={styles.filterPickerItemLabel}>{def.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}

                  {!showSectorInPicker && filteredPickerGroups.length === 0 && (
                    <p className={styles.filterPickerEmpty}>No matching filters</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          className={styles.filterResetBtn}
          onClick={() => onChange(DEFAULT_SCREENER_STATE)}
          disabled={isDefaultState(state)}
          title="Clear all filters"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {isVisual ? (
        <>
          {isHistorical && (
            <p className={styles.filterBarNote}>
              Filters use the latest reported fundamentals for the selected timeline date (plus weekly prices).
            </p>
          )}

          {activeCount === 0 ? (
            <p className={styles.filterBarEmpty}>
              No filters applied — use <strong>Add filter</strong> or switch to <strong>Code</strong> mode.
            </p>
          ) : (
            <div className={styles.activeFilterGrid}>
              {state.sectorFilterEnabled && (
                <div className={styles.activeFilterCard}>
                  <div className={styles.activeFilterCardHead}>
                    <span className={styles.activeFilterCardTitle}>Sector</span>
                    <button
                      type="button"
                      className={styles.activeFilterRemove}
                      onClick={removeSectorFilter}
                      aria-label="Remove sector filter"
                    >
                      <X size={14} />
                    </button>
                  </div>
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
                  </div>
                  {state.sectors.length === 0 && (
                    <p className={styles.sectorHint}>Pick one or more sectors</p>
                  )}
                </div>
              )}

              {activeIds.map(id => {
                const def = FILTER_DEFS.find(d => d.id === id)!;
                return (
                  <div key={id} className={styles.activeFilterCard}>
                    <FilterRow
                      def={def}
                      range={state.filters[id]}
                      onChange={r => setFilter(id, r)}
                      onRemove={() => onChange(disableFilter(state, id))}
                      compact
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <CodeFilterPanel
          expression={state.codeExpression}
          onChange={expr => onChange({ ...state, codeExpression: expr })}
          isHistorical={isHistorical}
        />
      )}

      {state.filterMode === 'code' && codeActive && (
        <p className={styles.filterBarNote}>
          Code mode replaces slider filters. Switch to Sliders to use range controls again.
        </p>
      )}
    </section>
  );
}
