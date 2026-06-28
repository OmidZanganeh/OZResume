'use client';

import { useState } from 'react';
import { List, Plus, Star, Trash2 } from 'lucide-react';
import type { ViewMode } from './watchlists';
import type { Watchlist, WatchlistStore } from './watchlists';
import {
  UNIVERSE_IDS,
  isUniverseSelected,
  toggleUniverseInSelection,
  universeMeta,
  type UniverseId,
  type UniverseSelection,
} from './universe';
import styles from './StockScreener.module.css';

interface Props {
  viewMode: ViewMode;
  universeSelection: UniverseSelection;
  onViewModeChange: (mode: ViewMode) => void;
  onUniverseSelectionChange: (sel: UniverseSelection) => void;
  store: WatchlistStore;
  active: Watchlist;
  onSelectList: (id: string) => void;
  onCreateList: (name: string) => void;
  onRenameList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
  onRemoveTicker: (ticker: string) => void;
}

export default function WatchlistPanel({
  viewMode,
  universeSelection,
  onViewModeChange,
  onUniverseSelectionChange,
  store,
  active,
  onSelectList,
  onCreateList,
  onRenameList,
  onDeleteList,
  onRemoveTicker,
}: Props) {
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(active.name);

  const handleCreate = () => {
    const name = newName.trim() || `Watchlist ${store.lists.length + 1}`;
    onCreateList(name);
    setNewName('');
    setShowNew(false);
    onViewModeChange('watchlist');
  };

  const handleRename = () => {
    const name = renameValue.trim();
    if (name) onRenameList(active.id, name);
    setRenaming(false);
  };

  const handleUniverseToggle = (id: UniverseId, checked: boolean) => {
    onUniverseSelectionChange(toggleUniverseInSelection(universeSelection, id, checked));
    onViewModeChange('universe');
  };

  return (
    <section className={styles.watchlistPanel} aria-label="Watchlists">
      <div className={styles.watchlistHead}>
        <List size={15} />
        <h2 className={styles.watchlistTitle}>Watchlists</h2>
      </div>

      <fieldset className={styles.universeFieldset}>
        <legend className={styles.universeLegend}>Indices</legend>
        <div className={styles.universeChecks}>
          {UNIVERSE_IDS.map(id => (
            <label key={id} className={styles.universeCheck}>
              <input
                type="checkbox"
                checked={isUniverseSelected(universeSelection, id)}
                onChange={e => handleUniverseToggle(id, e.target.checked)}
              />
              <span>{universeMeta(id).shortLabel}</span>
            </label>
          ))}
        </div>
        <p className={styles.universeHint}>Check one or more — table merges tickers (deduped).</p>
      </fieldset>

      <div className={styles.viewModeTabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'watchlist'}
          className={`${styles.viewModeTab} ${styles.viewModeTabFull} ${viewMode === 'watchlist' ? styles.viewModeTabOn : ''}`}
          onClick={() => onViewModeChange('watchlist')}
        >
          <Star size={12} />
          My watchlist
          {active.tickers.length > 0 && (
            <span className={styles.watchlistTabCount}>{active.tickers.length}</span>
          )}
        </button>
      </div>

      <div className={styles.watchlistControls}>
        <select
          className={styles.watchlistSelect}
          value={active.id}
          onChange={e => onSelectList(e.target.value)}
          aria-label="Select watchlist"
        >
          {store.lists.map(list => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.tickers.length})
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.watchlistIconBtn}
          onClick={() => setShowNew(v => !v)}
          title="New watchlist"
        >
          <Plus size={15} />
        </button>
        {store.lists.length > 1 && (
          <button
            type="button"
            className={styles.watchlistIconBtn}
            onClick={() => onDeleteList(active.id)}
            title="Delete this watchlist"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {showNew && (
        <div className={styles.watchlistNewRow}>
          <input
            type="text"
            className={styles.watchlistInput}
            placeholder="Watchlist name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setShowNew(false);
            }}
          />
          <button type="button" className={styles.watchlistSmallBtn} onClick={handleCreate}>
            Add
          </button>
        </div>
      )}

      {renaming ? (
        <div className={styles.watchlistNewRow}>
          <input
            type="text"
            className={styles.watchlistInput}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
          <button type="button" className={styles.watchlistSmallBtn} onClick={handleRename}>
            Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.watchlistRenameBtn}
          onClick={() => {
            setRenameValue(active.name);
            setRenaming(true);
          }}
        >
          Rename “{active.name}”
        </button>
      )}

      {viewMode === 'watchlist' && (
        <p className={styles.watchlistHint}>
          {active.tickers.length === 0
            ? 'Use ★ on any row in the index table to add stocks here.'
            : `${active.tickers.length} stock${active.tickers.length !== 1 ? 's' : ''} — full factor table on the right.`}
        </p>
      )}

      {active.tickers.length > 0 && (
        <ul className={styles.watchlistChips}>
          {active.tickers.map(ticker => (
            <li key={ticker} className={styles.watchlistChip}>
              <span>{ticker}</span>
              <button
                type="button"
                className={styles.watchlistChipRemove}
                onClick={() => onRemoveTicker(ticker)}
                aria-label={`Remove ${ticker}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
