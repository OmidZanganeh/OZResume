'use client';

import { Save, Trash2 } from 'lucide-react';
import type { SavedCodeFilterStore } from './savedCodeFilters';
import styles from './StockScreener.module.css';

interface Props {
  store: SavedCodeFilterStore;
  saveName: string;
  onSaveNameChange: (name: string) => void;
  onSave: () => void;
  canSave: boolean;
  onLoad: (expression: string) => void;
  onDelete: (id: string) => void;
}

export default function CodeFilterSavedPane({
  store,
  saveName,
  onSaveNameChange,
  onSave,
  canSave,
  onLoad,
  onDelete,
}: Props) {
  return (
    <div className={styles.codeFilterSavedPane}>
      <div className={styles.codeFilterSaveRow}>
        <input
          type="text"
          className={styles.codeFilterSaveInput}
          value={saveName}
          onChange={e => onSaveNameChange(e.target.value)}
          placeholder="Name this filter (e.g. Breakout + volume)"
          aria-label="Saved filter name"
          onKeyDown={e => {
            if (e.key === 'Enter') onSave();
          }}
        />
        <button
          type="button"
          className={styles.codeFilterSaveBtn}
          onClick={onSave}
          disabled={!canSave}
          title={canSave ? 'Save current expression' : 'Fix expression on Screen tab first'}
        >
          <Save size={14} aria-hidden />
          Save
        </button>
      </div>

      {store.saved.length === 0 ? (
        <p className={styles.codeFilterSavedEmpty}>
          No saved filters yet. Write an expression on the Screen tab, then save it here.
        </p>
      ) : (
        <ul className={styles.codeFilterSavedList}>
          {store.saved.map(item => (
            <li key={item.id} className={styles.codeFilterSavedItem}>
              <button
                type="button"
                className={styles.codeFilterSavedLoad}
                onClick={() => onLoad(item.expression)}
                title={item.expression}
              >
                <span className={styles.codeFilterSavedName}>{item.name}</span>
                <code className={styles.codeFilterSavedExpr}>{item.expression}</code>
              </button>
              <button
                type="button"
                className={styles.codeFilterSavedDelete}
                onClick={() => onDelete(item.id)}
                aria-label={`Delete saved filter ${item.name}`}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
