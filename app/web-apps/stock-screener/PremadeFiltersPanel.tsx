'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Play } from 'lucide-react';
import {
  PREMADE_FILTER_CATEGORIES,
  premadeFiltersByCategory,
  type PremadeFilter,
} from './premadeFilters';
import styles from '../StockScreener.module.css';

interface Props {
  activeExpression: string;
  onApply: (expression: string) => void;
}

export default function PremadeFiltersPanel({ activeExpression, onApply }: Props) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['volume', 'breakout', 'technical']),
  );

  const toggleCategory = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = (filter: PremadeFilter) => {
    onApply(filter.expression);
  };

  return (
    <div className={styles.premadeFilters}>
      <button
        type="button"
        className={styles.premadeFiltersToggle}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <Layers size={15} aria-hidden />
        Strategy presets ({PREMADE_FILTER_CATEGORIES.reduce((n, c) => n + premadeFiltersByCategory(c.id).length, 0)})
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <>
          <p className={styles.premadeFiltersIntro}>
            One-click screens using live Finnhub metrics and weekly-derived RSI, MACD, and compression
            factors. Click <strong>Apply</strong> on a preset — weekly presets need symbols with loaded
            weekly history (most of the universe after cache warm).
          </p>

          {PREMADE_FILTER_CATEGORIES.map(cat => {
            const filters = premadeFiltersByCategory(cat.id);
            const catOpen = expanded.has(cat.id);
            return (
              <section key={cat.id} className={styles.premadeCategory}>
                <button
                  type="button"
                  className={styles.premadeCategoryHead}
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={catOpen}
                >
                  <span className={styles.premadeCategoryTitle}>{cat.label}</span>
                  <span className={styles.premadeCategoryHint}>{cat.hint}</span>
                  {catOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {catOpen && (
                  <ul className={styles.premadeList}>
                    {filters.map(filter => {
                      const isActive = activeExpression.trim() === filter.expression.trim();
                      return (
                        <li key={filter.id} className={styles.premadeItem}>
                          <div className={styles.premadeItemBody}>
                            <div className={styles.premadeItemHead}>
                              <span className={styles.premadeItemName}>{filter.name}</span>
                              {filter.requiresWeekly && (
                                <span className={styles.premadeWeeklyBadge}>weekly</span>
                              )}
                              {isActive && (
                                <span className={styles.premadeActiveBadge}>active</span>
                              )}
                            </div>
                            <p className={styles.premadeItemDesc}>{filter.description}</p>
                            <code className={styles.premadeItemExpr}>{filter.expression}</code>
                          </div>
                          <button
                            type="button"
                            className={styles.premadeApplyBtn}
                            onClick={() => handleApply(filter)}
                            title="Apply this preset to the table"
                          >
                            <Play size={13} aria-hidden />
                            Apply
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
