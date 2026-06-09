import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SelectedContent } from './appStore';

export type WatchlistKind = 'live' | 'movie' | 'series' | 'episode';

export interface WatchlistEntry {
  key: string;
  scope: string;
  kind: WatchlistKind;
  entityId: string;
  title: string;
  subtitle?: string;
  image?: string;
  rating?: number | string;
  year?: string;
  episodeUrl?: string;
  addedAt: number;
  data: SelectedContent | Record<string, unknown> | null;
}

type WatchlistState = {
  entries: WatchlistEntry[];
};

type WatchlistActions = {
  addFavorite: (entry: Omit<WatchlistEntry, 'addedAt'>) => void;
  removeFavorite: (key: string) => void;
  toggleFavorite: (entry: Omit<WatchlistEntry, 'addedAt'>) => void;
  isFavorite: (key: string) => boolean;
  getFavoritesForScope: (scope: string) => WatchlistEntry[];
  clearScope: (scope: string) => void;
};

type WatchlistStore = WatchlistState & WatchlistActions;

function normalizeEntries(entries: unknown): WatchlistEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.filter(Boolean).map((entry) => migrateEntry(entry as WatchlistEntry));
}

function migrateEntry(entry: WatchlistEntry): WatchlistEntry {
  const scopeParts = String(entry.scope || '').split('::');
  if (scopeParts.length >= 3) {
    return entry;
  }

  const legacyScope = `${scopeParts[0] || 'default'}::${scopeParts[1] || 'guest'}::primary`;
  return {
    ...entry,
    scope: legacyScope,
    key: buildWatchlistKey(legacyScope, entry.kind, entry.entityId)
  };
}

export const buildWatchlistScope = (
  portalCode?: string | null,
  username?: string | null,
  profileId?: string | null
): string => (
  `${String(portalCode || 'default')}::${String(username || 'guest').trim().toLowerCase()}::${String(profileId || 'primary')}`
);

export const buildWatchlistKey = (
  scope: string,
  kind: WatchlistKind,
  entityId: string | number
): string => `${scope}::${kind}::${String(entityId)}`;

const safeStorage = {
  getItem(name: string) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string) {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
  },
  removeItem(name: string) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
  }
};

const watchlistStorage = createJSONStorage(() => safeStorage);

const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addFavorite: (entry) => {
        set((state) => {
          const currentEntries = normalizeEntries(state.entries);
          const withoutExisting = currentEntries.filter((item) => item.key !== entry.key);
          return {
            entries: [
              { ...entry, addedAt: Date.now() },
              ...withoutExisting
            ]
          };
        });
      },

      removeFavorite: (key) => {
        set((state) => ({
          entries: normalizeEntries(state.entries).filter((item) => item.key !== key)
        }));
      },

      toggleFavorite: (entry) => {
        const exists = normalizeEntries(get().entries).some((item) => item.key === entry.key);
        if (exists) {
          get().removeFavorite(entry.key);
          return;
        }

        get().addFavorite(entry);
      },

      isFavorite: (key) => normalizeEntries(get().entries).some((item) => item.key === key),

      getFavoritesForScope: (scope) => (
        normalizeEntries(get().entries)
          .filter((item) => item.scope === scope)
          .sort((a, b) => b.addedAt - a.addedAt)
      ),

      clearScope: (scope) => {
        set((state) => ({
          entries: normalizeEntries(state.entries).filter((item) => item.scope !== scope)
        }));
      }
    }),
    {
      name: 'smartifly-lg-watchlist-v1',
      version: 2,
      storage: watchlistStorage,
      migrate: (persistedState) => ({
        ...(persistedState as WatchlistState),
        entries: normalizeEntries((persistedState as WatchlistState | null)?.entries)
      }),
      partialize: (state) => ({
        entries: state.entries
      })
    }
  )
);

export default useWatchlistStore;
