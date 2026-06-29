'use client';

import { ALL_SECTORS } from './codeFilterCatalog';
import { CODE_FILTER_GUIDE } from './codeFilterGuide';
import styles from './StockScreener.module.css';

export default function CodeFilterGuidePane() {
  return (
    <div className={styles.codeFilterGuidePane}>
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
  );
}
