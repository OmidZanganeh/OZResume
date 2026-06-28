'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import {
  ALIAS_CHEATSHEET,
  CODE_FILTER_EXAMPLES,
  parseFilterExpression,
} from './filterExpression';
import styles from './StockScreener.module.css';

interface Props {
  expression: string;
  onChange: (expression: string) => void;
  isHistorical?: boolean;
}

export default function CodeFilterPanel({ expression, onChange, isHistorical }: Props) {
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
      />

      <div className={styles.codeFilterMeta}>
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
        <span className={styles.codeFilterExamplesLabel}>Examples:</span>
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
        Metric aliases &amp; syntax
      </button>

      {cheatOpen && (
        <div className={styles.codeFilterCheat}>
          <table className={styles.codeFilterCheatTable}>
            <thead>
              <tr>
                <th>Write</th>
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
            <code>=</code> <code>!=</code> · Logic: <code>&amp;</code> or <code>&amp;&amp;</code> (AND),{' '}
            <code>|</code> or <code>||</code> (OR) · Full metric names from sliders also work (e.g.{' '}
            <code>peRatio &gt; 15</code>).
          </p>
        </div>
      )}
    </div>
  );
}
