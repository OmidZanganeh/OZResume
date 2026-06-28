'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';
import {
  ALIAS_CHEATSHEET,
  CODE_FILTER_EXAMPLES,
  parseFilterExpression,
} from './filterExpression';
import { CODE_FILTER_GUIDE, FULL_METRIC_ALIASES } from './codeFilterGuide';
import styles from './StockScreener.module.css';

interface Props {
  expression: string;
  onChange: (expression: string) => void;
  isHistorical?: boolean;
}

export default function CodeFilterPanel({ expression, onChange, isHistorical }: Props) {
  const [guideOpen, setGuideOpen] = useState(true);
  const [cheatOpen, setCheatOpen] = useState(false);

  const parsed = useMemo(() => parseFilterExpression(expression), [expression]);
  const hasExpr = expression.trim().length > 0;
  const isValid = hasExpr && !parsed.error && parsed.ast != null;

  return (
    <div className={styles.codeFilterPanel}>
      <div className={styles.codeFilterHead}>
        <Terminal size={15} aria-hidden />
        <span>Write conditions with metric names, numbers, and <code>&amp;</code> / <code>|</code></span>
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
        </div>
      )}

      {isHistorical && (
        <p className={styles.filterBarNote}>
          Metrics reflect the selected timeline date (fundamentals + weekly prices).
        </p>
      )}

      <textarea
        className={`${styles.codeFilterInput} ${parsed.error ? styles.codeFilterInputError : ''}`}
        value={expression}
        onChange={e => onChange(e.target.value)}
        placeholder="PE > 10 & 52W > 55"
        spellCheck={false}
        rows={3}
        aria-label="Code filter expression"
        aria-invalid={Boolean(parsed.error)}
        aria-describedby="code-filter-status"
      />

      <div className={styles.codeFilterMeta} id="code-filter-status">
        {parsed.error && (
          <span className={styles.codeFilterError}>
            <AlertCircle size={14} aria-hidden />
            {parsed.error}
          </span>
        )}
        {!parsed.error && isValid && (
          <span className={styles.codeFilterOk}>
            <CheckCircle2 size={14} aria-hidden />
            Expression valid — filtering universe
          </span>
        )}
        {!hasExpr && (
          <span className={styles.codeFilterHint}>
            Use <strong>&amp;</strong> for AND, <strong>|</strong> for OR, parentheses for grouping
          </span>
        )}
      </div>

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
        onClick={() => setCheatOpen(v => !v)}
        aria-expanded={cheatOpen}
      >
        {cheatOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Full metric alias list
      </button>

      {cheatOpen && (
        <div className={styles.codeFilterCheat}>
          <table className={styles.codeFilterCheatTable}>
            <thead>
              <tr>
                <th>Alias</th>
                <th>Metric</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {FULL_METRIC_ALIASES.map(row => (
                <tr key={row.alias}>
                  <td><code>{row.alias}</code></td>
                  <td>{row.metric}</td>
                  <td>{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className={styles.codeFilterCheatTable}>
            <thead>
              <tr>
                <th>More aliases</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {ALIAS_CHEATSHEET.map(row => (
                <tr key={row.alias}>
                  <td><code>{row.alias}</code></td>
                  <td>{row.field}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.codeFilterCheatFoot}>
            Operators: <code>&gt;</code> <code>&gt;=</code> <code>&lt;</code> <code>&lt;=</code>{' '}
            <code>=</code> <code>!=</code> · Logic: <code>&amp;</code> / <code>&amp;&amp;</code> (AND),{' '}
            <code>|</code> / <code>||</code> (OR) · Any slider metric id also works (e.g.{' '}
            <code>peRatio &gt; 15</code>, <code>priceChange52w &gt; 30</code>).
          </p>
        </div>
      )}
    </div>
  );
}
