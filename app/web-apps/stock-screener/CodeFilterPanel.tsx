'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Layers,
  PenLine,
  Play,
  Table2,
  Terminal,
} from 'lucide-react';
import { parseFilterExpression } from './filterExpression';
import { CODE_FILTER_EXAMPLES } from './codeFilterCatalog';
import { CODE_FILTER_TABS, type CodeFilterTab } from './codeFilterTabs';
import CodeFilterGuidePane from './CodeFilterGuidePane';
import CodeFilterReferencePane from './CodeFilterReferencePane';
import CodeFilterSavedPane from './CodeFilterSavedPane';
import PremadeFiltersPanel from './PremadeFiltersPanel';
import { useSavedCodeFilters } from './savedCodeFilters';
import styles from './StockScreener.module.css';

const TAB_ICONS: Record<CodeFilterTab, typeof PenLine> = {
  screen: PenLine,
  presets: Layers,
  guide: BookOpen,
  fields: Table2,
  saved: Bookmark,
};

interface Props {
  expression: string;
  appliedExpression: string;
  onChange: (expression: string) => void;
  onApply: () => void;
  onApplyPremade: (expression: string) => void;
  applyPending?: boolean;
  isHistorical?: boolean;
}

export default function CodeFilterPanel({
  expression,
  appliedExpression,
  onChange,
  onApply,
  onApplyPremade,
  applyPending = false,
  isHistorical,
}: Props) {
  const [activeTab, setActiveTab] = useState<CodeFilterTab>('screen');
  const [saveName, setSaveName] = useState('');
  const { store, saveFilter, deleteFilter } = useSavedCodeFilters();

  const parsed = useMemo(() => parseFilterExpression(expression), [expression]);
  const hasExpr = expression.trim().length > 0;
  const isValid = hasExpr && !parsed.error && parsed.ast != null;
  const isDirty = expression.trim() !== appliedExpression.trim();
  const isApplied = isValid && !isDirty;
  const canApply = isDirty && !parsed.error && (hasExpr || appliedExpression.trim().length > 0);

  const handleSave = () => {
    if (!isValid) return;
    saveFilter(saveName, expression);
    setSaveName('');
  };

  const handlePremadeApply = (expr: string) => {
    onApplyPremade(expr);
    setActiveTab('screen');
  };

  const handleLoadSaved = (expr: string) => {
    onChange(expr);
    setActiveTab('screen');
  };

  const scrollableTab = activeTab === 'presets' || activeTab === 'guide' || activeTab === 'fields' || activeTab === 'saved';

  return (
    <div className={styles.codeFilterPanel}>
      <div className={styles.codeFilterHead}>
        <Terminal size={15} aria-hidden />
        <span>Code filters — write expressions or pick a preset</span>
      </div>

      <div className={styles.codeFilterWorkspace}>
        <div className={styles.codeFilterTabBar} role="tablist" aria-label="Code filter sections">
          {CODE_FILTER_TABS.map(tab => {
            const Icon = TAB_ICONS[tab.id];
            const isActive = activeTab === tab.id;
            const badge =
              tab.id === 'saved' && store.saved.length > 0 ? store.saved.length : null;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`code-filter-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`code-filter-panel-${tab.id}`}
                className={`${styles.codeFilterTab} ${isActive ? styles.codeFilterTabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.hint}
              >
                <Icon size={13} aria-hidden />
                <span className={styles.codeFilterTabLabel}>{tab.label}</span>
                {badge != null && (
                  <span className={styles.codeFilterTabBadge}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className={`${styles.codeFilterPane} ${scrollableTab ? styles.codeFilterPaneScroll : ''}`}
          role="tabpanel"
          id={`code-filter-panel-${activeTab}`}
          aria-labelledby={`code-filter-tab-${activeTab}`}
        >
          {activeTab === 'screen' && (
            <>
              {isHistorical && (
                <p className={styles.codeFilterScreenNote}>
                  Metrics reflect the selected timeline date. Use <code>retNow</code>,{' '}
                  <code>retTarget</code>, and <code>priceThen</code> for historical-only columns.
                </p>
              )}

              <textarea
                className={`${styles.codeFilterInput} ${parsed.error ? styles.codeFilterInputError : ''}`}
                value={expression}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canApply) {
                    e.preventDefault();
                    onApply();
                  }
                }}
                placeholder="PE > 10 & 52W > 55"
                spellCheck={false}
                rows={3}
                aria-label="Code filter expression"
                aria-invalid={Boolean(parsed.error)}
                aria-describedby="code-filter-status"
              />

              <div className={styles.codeFilterApplyRow}>
                <div className={styles.codeFilterMeta} id="code-filter-status">
                  {parsed.error && (
                    <span className={styles.codeFilterError}>
                      <AlertCircle size={14} aria-hidden />
                      {parsed.error}
                    </span>
                  )}
                  {!parsed.error && isValid && isDirty && (
                    <span className={styles.codeFilterPending}>
                      <CheckCircle2 size={14} aria-hidden />
                      Valid — click Apply to filter the table
                    </span>
                  )}
                  {!parsed.error && isApplied && (
                    <span className={styles.codeFilterOk}>
                      <CheckCircle2 size={14} aria-hidden />
                      Filter applied
                    </span>
                  )}
                  {!parsed.error && !hasExpr && appliedExpression.trim() && (
                    <span className={styles.codeFilterPending}>
                      Cleared — Apply to show the full universe
                    </span>
                  )}
                  {!hasExpr && !appliedExpression.trim() && (
                    <span className={styles.codeFilterHint}>
                      Use <strong>&amp;</strong> for AND, <strong>|</strong> for OR, parentheses for grouping
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.codeFilterApplyBtn}
                  onClick={onApply}
                  disabled={!canApply || applyPending}
                  title={canApply ? 'Apply filter (Ctrl+Enter)' : 'Fix syntax or change expression to apply'}
                >
                  <Play size={14} aria-hidden />
                  {applyPending ? 'Applying…' : 'Apply filter'}
                </button>
              </div>

              <div className={styles.codeFilterExamples}>
                <span className={styles.codeFilterExamplesLabel}>Quick examples</span>
                <div className={styles.codeFilterExampleStrip}>
                  {CODE_FILTER_EXAMPLES.slice(0, 6).map(ex => (
                    <button
                      key={ex}
                      type="button"
                      className={styles.codeFilterExampleBtn}
                      onClick={() => onChange(ex)}
                      title="Use this example"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.codeFilterMoreLink}
                  onClick={() => setActiveTab('guide')}
                >
                  Syntax guide &amp; more examples →
                </button>
              </div>
            </>
          )}

          {activeTab === 'presets' && (
            <PremadeFiltersPanel
              embedded
              activeExpression={appliedExpression}
              onApply={handlePremadeApply}
            />
          )}

          {activeTab === 'guide' && <CodeFilterGuidePane />}

          {activeTab === 'fields' && <CodeFilterReferencePane />}

          {activeTab === 'saved' && (
            <CodeFilterSavedPane
              store={store}
              saveName={saveName}
              onSaveNameChange={setSaveName}
              onSave={handleSave}
              canSave={isValid}
              onLoad={handleLoadSaved}
              onDelete={deleteFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
}
