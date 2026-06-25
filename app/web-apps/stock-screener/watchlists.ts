'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface Watchlist {
  id: string;
  name: string;
  tickers: string[];
  updatedAt: string;
}

export interface WatchlistStore {
  activeId: string;
  lists: Watchlist[];
}

const STORAGE_KEY = 'stock-screener-watchlists-v1';

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `wl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultStore(): WatchlistStore {
  const id = newId();
  return {
    activeId: id,
    lists: [
      {
        id,
        name: 'My Watchlist',
        tickers: [],
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}

export function loadWatchlists(): WatchlistStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WatchlistStore;
    if (!parsed?.lists?.length || !parsed.activeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWatchlists(store: WatchlistStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota or disabled
  }
}

export type ViewMode = 'universe' | 'watchlist';

export function useWatchlists() {
  const [store, setStore] = useState<WatchlistStore>(() => loadWatchlists() ?? createDefaultStore());

  useEffect(() => {
    saveWatchlists(store);
  }, [store]);

  const active =
    store.lists.find(l => l.id === store.activeId) ?? store.lists[0]!;

  const activeTickers = useMemo(() => new Set(active.tickers), [active.tickers]);

  const setActiveId = useCallback((id: string) => {
    setStore(prev => ({ ...prev, activeId: id }));
  }, []);

  const createList = useCallback((name: string) => {
    const trimmed = name.trim() || 'Watchlist';
    const id = newId();
    setStore(prev => ({
      activeId: id,
      lists: [
        ...prev.lists,
        { id, name: trimmed, tickers: [], updatedAt: new Date().toISOString() },
      ],
    }));
    return id;
  }, []);

  const renameList = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStore(prev => ({
      ...prev,
      lists: prev.lists.map(l =>
        l.id === id ? { ...l, name: trimmed, updatedAt: new Date().toISOString() } : l,
      ),
    }));
  }, []);

  const deleteList = useCallback((id: string) => {
    setStore(prev => {
      if (prev.lists.length <= 1) {
        return createDefaultStore();
      }
      const lists = prev.lists.filter(l => l.id !== id);
      const activeId = prev.activeId === id ? lists[0]!.id : prev.activeId;
      return { activeId, lists };
    });
  }, []);

  const addTicker = useCallback((ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setStore(prev => ({
      ...prev,
      lists: prev.lists.map(l => {
        if (l.id !== prev.activeId) return l;
        if (l.tickers.includes(t)) return l;
        return {
          ...l,
          tickers: [...l.tickers, t],
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const removeTicker = useCallback((ticker: string) => {
    setStore(prev => ({
      ...prev,
      lists: prev.lists.map(l => {
        if (l.id !== prev.activeId) return l;
        return {
          ...l,
          tickers: l.tickers.filter(x => x !== ticker),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const toggleTicker = useCallback((ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (active.tickers.includes(t)) removeTicker(t);
    else addTicker(t);
  }, [active.tickers, addTicker, removeTicker]);

  const isInActive = useCallback(
    (ticker: string) => active.tickers.includes(ticker),
    [active.tickers],
  );

  return {
    store,
    active,
    activeTickers,
    setActiveId,
    createList,
    renameList,
    deleteList,
    addTicker,
    removeTicker,
    toggleTicker,
    isInActive,
  };
}
