'use client';

import { RotateCcw } from 'lucide-react';
import MetricSlider from './MetricSlider';
import type { ScreenerFilters } from './types';
import { DEFAULT_FILTERS } from './types';
import styles from './StockScreener.module.css';

interface Props {
  filters: ScreenerFilters;
  onChange: (filters: ScreenerFilters) => void;
  isHistorical?: boolean;
}

export default function FilterSidebar({ filters, onChange, isHistorical }: Props) {
  const set = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const isDefault =
    filters.maxPe === DEFAULT_FILTERS.maxPe &&
    filters.minEpsGrowth === DEFAULT_FILTERS.minEpsGrowth &&
    filters.maxDebtEquity === DEFAULT_FILTERS.maxDebtEquity &&
    filters.maxRsi === DEFAULT_FILTERS.maxRsi;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHead}>
        <h2 className={styles.sidebarTitle}>Screening Filters</h2>
        <button
          type="button"
          className={styles.resetBtn}
          onClick={() => onChange(DEFAULT_FILTERS)}
          disabled={isDefault}
          title="Reset all filters"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {isHistorical && (
        <p className={styles.historicalNote}>
          Sliders filter <strong>past</strong> P/E, EPS, D/E &amp; RSI — not today&apos;s values.
        </p>
      )}

      <MetricSlider
        label="Max P/E Ratio"
        hint="Lower values favor value stocks"
        min={0}
        max={100}
        step={1}
        value={filters.maxPe}
        format={v => v.toFixed(0)}
        onChange={v => set('maxPe', v)}
      />

      <MetricSlider
        label="Min EPS Growth (%)"
        hint="Minimum year-over-year earnings growth"
        min={-20}
        max={100}
        step={1}
        value={filters.minEpsGrowth}
        format={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
        onChange={v => set('minEpsGrowth', v)}
      />

      <MetricSlider
        label="Max Debt-to-Equity"
        hint="Cap leverage — lower is more conservative"
        min={0}
        max={5}
        step={0.1}
        value={filters.maxDebtEquity}
        format={v => v.toFixed(1)}
        onChange={v => set('maxDebtEquity', v)}
      />

      <MetricSlider
        label="RSI Threshold (Max)"
        hint="Filter out overbought names (RSI > 70)"
        min={0}
        max={100}
        step={1}
        value={filters.maxRsi}
        format={v => v.toFixed(0)}
        onChange={v => set('maxRsi', v)}
      />

      <div className={styles.legend}>
        <p className={styles.legendTitle}>Color guide</p>
        <ul>
          <li><span className={styles.legendDotGood} /> Favorable signal</li>
          <li><span className={styles.legendDotWarn} /> Caution</li>
          <li><span className={styles.legendDotBad} /> Unfavorable</li>
        </ul>
      </div>
    </aside>
  );
}
