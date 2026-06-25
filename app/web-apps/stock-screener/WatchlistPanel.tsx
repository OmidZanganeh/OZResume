'use client';

import { useState } from 'react';
import { List, Plus, Star, Trash2 } from 'lucide-react';
import type { ViewMode } from './watchlists';
import type { Watchlist, WatchlistStore } from './watchlists';
import { UNIVERSE_IDS, universeMeta, type UniverseId } from './universe';
import styles from './StockScreener.module.css';

interface Props {
  viewMode: ViewMode;
  marketUniverse: UniverseId;
  onViewModeChange: (mode: ViewMode) => void;
  onMarketUniverseChange: (id: UniverseId) => void;
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
  marketUniverse,
  onViewModeChange,
  onMarketUniverseChange,
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

  return (
    <section className={styles.watchlistPanel} aria-label="Watchlists">
      <div className={styles.watchlistHead}>
        <List size={15} />
        <h2 className={styles.watchlistTitle}>Watchlists</h2>
      </div>

      <div className={styles.viewModeTabs} role="tablist">
        {UNIVERSE_IDS.map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={viewMode === 'universe' && marketUniverse === id}
            className={`${styles.viewModeTab} ${viewMode === 'universe' && marketUniverse === id ? styles.viewModeTabOn : ''}`}
            onClick={() => {
              onMarketUniverseChange(id);
              onViewModeChange('universe');
            }}
          >
            {universeMeta(id).shortLabel}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'watchlist'}
          className={`${styles.viewModeTab} ${viewMode === 'watchlist' ? styles.viewModeTabOn : ''}`}
          onClick={() => onViewModeChange('watchlist')}
        >
          <Star size={12} />
          Watchlist
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
            ? `Use ★ on any row in ${universeMeta(marketUniverse).shortLabel} view to add stocks here.`
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
