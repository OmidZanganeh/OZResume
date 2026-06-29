'use client';

import {
  CODE_FIELD_CATEGORIES,
  CODE_FILTER_FIELD_DOCS,
  fieldsByCategory,
} from './codeFilterCatalog';
import styles from './StockScreener.module.css';

export default function CodeFilterReferencePane() {
  return (
    <div className={styles.codeFilterRefPane}>
      <p className={styles.codeFilterRefIntro}>
        {CODE_FILTER_FIELD_DOCS.length} filterable columns. Use field ids or aliases in expressions.
      </p>
      {CODE_FIELD_CATEGORIES.map(cat => {
        const fields = fieldsByCategory(cat.id);
        if (fields.length === 0) return null;
        return (
          <section key={cat.id} className={styles.codeFilterRefSection}>
            <h4 className={styles.codeFilterRefHeading}>{cat.label}</h4>
            <div className={styles.codeFilterRefTableWrap}>
              <table className={styles.codeFilterCheatTable}>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Label</th>
                    <th>Aliases</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map(field => (
                    <tr key={field.id}>
                      <td><code>{field.id}</code></td>
                      <td>{field.label}</td>
                      <td>
                        {field.aliases.slice(0, 4).map(a => (
                          <code key={a} className={styles.codeFilterAliasChip}>{a}</code>
                        ))}
                      </td>
                      <td><code>{field.example}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <p className={styles.codeFilterCheatFoot}>
        Operators: <code>&gt;</code> <code>&gt;=</code> <code>&lt;</code> <code>&lt;=</code>{' '}
        <code>=</code> <code>!=</code> · Logic: <code>&amp;</code> (AND), <code>|</code> (OR) ·
        Text: <code>sector = Tech</code>, <code>ticker in (AAPL, MSFT)</code>,{' '}
        <code>name contains Apple</code>.
      </p>
    </div>
  );
}
