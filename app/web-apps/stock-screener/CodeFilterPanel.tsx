'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Play,
  Save,
  Terminal,
  Trash2,
} from 'lucide-react';
import { parseFilterExpression } from './filterExpression';
import {
  ALL_SECTORS,
  CODE_FIELD_CATEGORIES,
  CODE_FILTER_EXAMPLES,
  CODE_FILTER_FIELD_DOCS,
  fieldsByCategory,
} from './codeFilterCatalog';
import { CODE_FILTER_GUIDE } from './codeFilterGuide';
import { useSavedCodeFilters } from './savedCodeFilters';
import styles from './StockScreener.module.css';

interface Props {
  expression: string;
  appliedExpression: string;
  onChange: (expression: string) => void;
  onApply: () => void;
  applyPending?: boolean;
  isHistorical?: boolean;
}

export default function CodeFilterPanel({
  expression,
  appliedExpression,
  onChange,
  onApply,
  applyPending = false,
  isHistorical,
}: Props) {
  const [guideOpen, setGuideOpen] = useState(true);
  const [refOpen, setRefOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedOpen, setSavedOpen] = useState(true);
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

  return (
    <div className={styles.codeFilterPanel}>
      <div className={styles.codeFilterHead}>
        <Terminal size={15} aria-hidden />
        <span>
          Filter any table column — metrics, sector, ticker, name, historical returns, pattern similarity
        </span>
      </div>

      <button
        type="button"
        className={styles.codeFilterGuideToggle}
        onClick={() => setGuideOpen(v => !v)}
        aria-expanded={guideOpen}
      >
        <BookOpen size={15} aria-hidden />
        {CODE_FILTER_GUIDE.title}
        {guideOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {guideOpen && (
        <div className={styles.codeFilterGuide}>
          <p className={styles.codeFilterGuideIntro}>{CODE_FILTER_GUIDE.intro}</p>

          <h3 className={styles.codeFilterGuideHeading}>Quick start</h3>
          <ol className={styles.codeFilterGuideSteps}>
            {CODE_FILTER_GUIDE.steps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h3 className={styles.codeFilterGuideHeading}>Syntax</h3>
          <div className={styles.codeFilterSyntaxGrid}>
            {CODE_FILTER_GUIDE.syntax.map(row => (
              <div key={row.example} className={styles.codeFilterSyntaxCard}>
                <code className={styles.codeFilterSyntaxExample}>{row.example}</code>
                <span className={styles.codeFilterSyntaxLabel}>{row.label}</span>
                {row.note && <span className={styles.codeFilterSyntaxNote}>{row.note}</span>}
              </div>
            ))}
          </div>

          <h3 className={styles.codeFilterGuideHeading}>Tips</h3>
          <ul className={styles.codeFilterGuideTips}>
            {CODE_FILTER_GUIDE.tips.map(tip => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>

          <p className={styles.codeFilterGuideFoot}>
            Sectors: {ALL_SECTORS.join(', ')} · Saved filters are stored in this browser only.
          </p>
        </div>
      )}

      {isHistorical && (
        <p className={styles.filterBarNote}>
          Metrics reflect the selected timeline date. Use <code>retNow</code>, <code>retTarget</code>, and{' '}
          <code>priceThen</code> for historical-only columns.
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

      <div className={styles.codeFilterSaveRow}>
        <input
          type="text"
          className={styles.codeFilterSaveInput}
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          placeholder="Filter name (e.g. Value + momentum)"
          aria-label="Saved filter name"
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
          }}
        />
        <button
          type="button"
          className={styles.codeFilterSaveBtn}
          onClick={handleSave}
          disabled={!isValid}
          title={isValid ? 'Save this expression' : 'Fix expression before saving'}
        >
          <Save size={14} aria-hidden />
          Save
        </button>
      </div>

      {store.saved.length > 0 && (
        <>
          <button
            type="button"
            className={styles.codeFilterCheatToggle}
            onClick={() => setSavedOpen(v => !v)}
            aria-expanded={savedOpen}
          >
            <Bookmark size={14} aria-hidden />
            Saved filters ({store.saved.length})
            {savedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {savedOpen && (
            <ul className={styles.codeFilterSavedList}>
              {store.saved.map(item => (
                <li key={item.id} className={styles.codeFilterSavedItem}>
                  <button
                    type="button"
                    className={styles.codeFilterSavedLoad}
                    onClick={() => onChange(item.expression)}
                    title={item.expression}
                  >
                    <span className={styles.codeFilterSavedName}>{item.name}</span>
                    <code className={styles.codeFilterSavedExpr}>{item.expression}</code>
                  </button>
                  <button
                    type="button"
                    className={styles.codeFilterSavedDelete}
                    onClick={() => deleteFilter(item.id)}
                    aria-label={`Delete saved filter ${item.name}`}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className={styles.codeFilterExamples}>
        <span className={styles.codeFilterExamplesLabel}>Examples (click to use):</span>
        {CODE_FILTER_EXAMPLES.map(ex => (
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
        className={styles.codeFilterCheatToggle}
        onClick={() => setRefOpen(v => !v)}
        aria-expanded={refOpen}
      >
        {refOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Full field reference ({CODE_FILTER_FIELD_DOCS.length} columns)
      </button>

      {refOpen && (
        <div className={styles.codeFilterCheat}>
          {CODE_FIELD_CATEGORIES.map(cat => {
            const fields = fieldsByCategory(cat.id);
            if (fields.length === 0) return null;
            return (
              <section key={cat.id} className={styles.codeFilterRefSection}>
                <h4 className={styles.codeFilterRefHeading}>{cat.label}</h4>
                <table className={styles.codeFilterCheatTable}>
                  <thead>
                    <tr>
                      <th>Field id</th>
                      <th>Label</th>
                      <th>Aliases</th>
                      <th>Unit</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(field => (
                      <tr key={field.id}>
                        <td><code>{field.id}</code></td>
                        <td>{field.label}</td>
                        <td>
                          {field.aliases.map(a => (
                            <code key={a} className={styles.codeFilterAliasChip}>{a}</code>
                          ))}
                        </td>
                        <td>{field.unit}</td>
                        <td><code>{field.example}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
          <p className={styles.codeFilterCheatFoot}>
            Operators: <code>&gt;</code> <code>&gt;=</code> <code>&lt;</code> <code>&lt;=</code>{' '}
            <code>=</code> <code>!=</code> · Logic: <code>&amp;</code> / <code>&amp;&amp;</code> (AND),{' '}
            <code>|</code> / <code>||</code> (OR) · Text: <code>sector = Tech</code>,{' '}
            <code>ticker in (AAPL, MSFT)</code>, <code>name contains Apple</code> or{' '}
            <code>name contains &quot;Apple Inc&quot;</code>.
          </p>
        </div>
      )}
    </div>
  );
}
