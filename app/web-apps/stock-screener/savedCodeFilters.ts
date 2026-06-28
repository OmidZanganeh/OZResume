'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SavedCodeFilter {
  id: string;
  name: string;
  expression: string;
  updatedAt: string;
}

export interface SavedCodeFilterStore {
  saved: SavedCodeFilter[];
}

const STORAGE_KEY = 'stock-screener-code-filters-v1';

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadSavedCodeFilters(): SavedCodeFilterStore {
  if (typeof window === 'undefined') return { saved: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { saved: [] };
    const parsed = JSON.parse(raw) as SavedCodeFilterStore;
    if (!Array.isArray(parsed?.saved)) return { saved: [] };
    return parsed;
  } catch {
    return { saved: [] };
  }
}

export function persistSavedCodeFilters(store: SavedCodeFilterStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota
  }
}

export function useSavedCodeFilters() {
  const [store, setStore] = useState<SavedCodeFilterStore>(() => loadSavedCodeFilters());

  useEffect(() => {
    persistSavedCodeFilters(store);
  }, [store]);

  const saveFilter = useCallback((name: string, expression: string) => {
    const trimmedName = name.trim() || 'My filter';
    const trimmedExpr = expression.trim();
    if (!trimmedExpr) return null;

    const existing = store.saved.find(
      s => s.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (existing) {
      setStore(prev => ({
        saved: prev.saved.map(s =>
          s.id === existing.id
            ? { ...s, expression: trimmedExpr, updatedAt: new Date().toISOString() }
            : s,
        ),
      }));
      return existing.id;
    }

    const id = newId();
    setStore(prev => ({
      saved: [
        {
          id,
          name: trimmedName,
          expression: trimmedExpr,
          updatedAt: new Date().toISOString(),
        },
        ...prev.saved,
      ],
    }));
    return id;
  }, [store.saved]);

  const deleteFilter = useCallback((id: string) => {
    setStore(prev => ({
      saved: prev.saved.filter(s => s.id !== id),
    }));
  }, []);

  const renameFilter = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStore(prev => ({
      saved: prev.saved.map(s =>
        s.id === id ? { ...s, name: trimmed, updatedAt: new Date().toISOString() } : s,
      ),
    }));
  }, []);

  return { store, saveFilter, deleteFilter, renameFilter };
}
