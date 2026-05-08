import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPerfStorage } from '../utils/storage';

export type FavoriteKind = 'live' | 'movie' | 'series' | 'episode';

export interface FavoriteEntry {
    key: string;
    scope: string;
    kind: FavoriteKind;
    entityId: string;
    title: string;
    subtitle?: string;
    image?: string;
    rating?: number | string;
    year?: string;
    episodeUrl?: string;
    addedAt: number;
    data: any;
}

interface FavoritesState {
    entries: FavoriteEntry[];
}

interface FavoritesActions {
    addFavorite: (entry: Omit<FavoriteEntry, 'addedAt'>) => void;
    removeFavorite: (key: string) => void;
    toggleFavorite: (entry: Omit<FavoriteEntry, 'addedAt'>) => void;
    isFavorite: (key: string) => boolean;
    getFavoritesForScope: (scope: string) => FavoriteEntry[];
    clearScope: (scope: string) => void;
}

type FavoritesStore = FavoritesState & FavoritesActions;

export const buildFavoritesScope = (portalId?: string | null, username?: string | null): string => (
    `${String(portalId || 'default')}::${String(username || 'guest').trim().toLowerCase()}`
);

export const buildFavoriteKey = (
    scope: string,
    kind: FavoriteKind,
    entityId: string | number
): string => `${scope}::${kind}::${String(entityId)}`;

const favoritesStorage = createJSONStorage(() =>
    createPerfStorage('smartifly-shared-favorites-v1', 400)
);

const useFavoritesStore = create<FavoritesStore>()(
    persist(
        (set, get) => ({
            entries: [],

            addFavorite: (entry) => {
                set((state) => {
                    const withoutExisting = state.entries.filter((item) => item.key !== entry.key);
                    return {
                        entries: [
                            { ...entry, addedAt: Date.now() },
                            ...withoutExisting,
                        ],
                    };
                });
            },

            removeFavorite: (key) => {
                set((state) => ({
                    entries: state.entries.filter((item) => item.key !== key),
                }));
            },

            toggleFavorite: (entry) => {
                const exists = get().entries.some((item) => item.key === entry.key);
                if (exists) {
                    get().removeFavorite(entry.key);
                    return;
                }
                get().addFavorite(entry);
            },

            isFavorite: (key) => get().entries.some((item) => item.key === key),

            getFavoritesForScope: (scope) => (
                get().entries
                    .filter((item) => item.scope === scope)
                    .sort((a, b) => b.addedAt - a.addedAt)
            ),

            clearScope: (scope) => {
                set((state) => ({
                    entries: state.entries.filter((item) => item.scope !== scope),
                }));
            },
        }),
        {
            name: 'smartifly-shared-favorites-v1',
            storage: favoritesStorage,
            partialize: (state) => ({
                entries: state.entries,
            }),
        }
    )
);

export default useFavoritesStore;
