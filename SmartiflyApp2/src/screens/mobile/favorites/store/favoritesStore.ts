/**
 * Smartifly Favorites Store
 * 
 * Standalone Zustand store for managing favorites:
 * - Add/remove favorites
 * - Categorized storage (live, movies, series)
 * - AsyncStorage persistence with validation
 * - Check if item is favorite
 * 
 * NOTE: This is a standalone store – not part of main store.
 * Must call loadFavorites() on app start (e.g., in App.tsx or root effect).
 */

import { StateCreator, create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../../../config';

// =============================================================================
// CONSTANTS
// =============================================================================

export const FAVORITES_STORAGE_KEY = '@smartifly_favorites';

// Safety cap to prevent unbounded growth (IPTV users can favorite thousands)
const MAX_FAVORITES = 1000;

// =============================================================================
// TYPES
// =============================================================================

export type FavoriteType = 'live' | 'movie' | 'series';

export interface FavoriteItem {
    id: string | number;
    type: FavoriteType;
    name: string;
    image?: string;
    addedAt: number;
    // Optional metadata
    rating?: number;
    year?: string;
    category?: string;
    seasonCount?: number;
    streamId?: number;
    seriesId?: number;
}

export interface FavoritesState {
    // State
    favorites: FavoriteItem[];
    isLoaded: boolean;

    // Actions
    loadFavorites: () => Promise<void>;
    addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => Promise<void>;
    removeFavorite: (id: string | number, type: FavoriteType) => Promise<void>;
    toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => Promise<boolean>;
    clearFavorites: (type?: FavoriteType) => Promise<void>;

    // Selectors
    isFavorite: (id: string | number, type: FavoriteType) => boolean;
    getFavoritesByType: (type: FavoriteType) => FavoriteItem[];
    getFavoritesCount: () => { total: number; live: number; movies: number; series: number };
}

// =============================================================================
// VALIDATION HELPER
// =============================================================================

/**
 * Validates that parsed data is a valid favorites array.
 * Prevents crashes from corrupted/old storage formats.
 */
const isValidFavoritesArray = (data: unknown): data is FavoriteItem[] => {
    if (!Array.isArray(data)) return false;

    // Check first few items for basic structure
    return data.every(item =>
        item !== null &&
        typeof item === 'object' &&
        'id' in item &&
        'type' in item &&
        'addedAt' in item
    );
};

// =============================================================================
// STORE SLICE
// =============================================================================

export const createFavoritesSlice: StateCreator<FavoritesState> = (set, get) => ({
    // Initial State
    favorites: [],
    isLoaded: false,

    // Load favorites from storage (with validation)
    loadFavorites: async () => {
        try {
            const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);

                // Validate parsed data to prevent crashes from corrupted storage
                if (isValidFavoritesArray(parsed)) {
                    set({ favorites: parsed, isLoaded: true });
                } else {
                    logger.warn('Invalid favorites data in storage, resetting');
                    set({ favorites: [], isLoaded: true });
                }
            } else {
                set({ isLoaded: true });
            }
        } catch (error: any) {
            logger.error('Failed to load favorites', {
                message: error?.message || 'Unknown error',
            });
            set({ favorites: [], isLoaded: true });
        }
    },

    // Add to favorites
    addFavorite: async (item) => {
        const { favorites } = get();

        // Check if already exists
        const exists = favorites.some(
            f => String(f.id) === String(item.id) && f.type === item.type
        );

        if (exists) return;

        const newFavorite: FavoriteItem = {
            ...item,
            addedAt: Date.now(),
        };

        // Apply safety cap to prevent unbounded growth
        const updated = [newFavorite, ...favorites].slice(0, MAX_FAVORITES);

        set({ favorites: updated });

        try {
            await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
        } catch (error: any) {
            logger.error('Failed to save favorite', {
                message: error?.message || 'Unknown error',
            });
        }
    },

    // Remove from favorites
    removeFavorite: async (id, type) => {
        const { favorites } = get();

        const updated = favorites.filter(
            f => !(String(f.id) === String(id) && f.type === type)
        );

        set({ favorites: updated });

        try {
            await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
        } catch (error: any) {
            logger.error('Failed to remove favorite', {
                message: error?.message || 'Unknown error',
            });
        }
    },

    // Toggle favorite (returns new state: true = added, false = removed)
    toggleFavorite: async (item) => {
        const { favorites, addFavorite, removeFavorite } = get();

        const exists = favorites.some(
            f => String(f.id) === String(item.id) && f.type === item.type
        );

        if (exists) {
            await removeFavorite(item.id, item.type);
            return false;
        } else {
            await addFavorite(item);
            return true;
        }
    },

    // Clear favorites (optionally by type)
    clearFavorites: async (type) => {
        const { favorites } = get();

        const updated = type
            ? favorites.filter(f => f.type !== type)
            : [];

        set({ favorites: updated });

        try {
            await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
        } catch (error: any) {
            logger.error('Failed to clear favorites', {
                message: error?.message || 'Unknown error',
            });
        }
    },

    // Check if item is favorite
    isFavorite: (id, type) => {
        const { favorites } = get();
        return favorites.some(
            f => String(f.id) === String(id) && f.type === type
        );
    },

    // Get favorites by type (sorted by most recent first)
    getFavoritesByType: (type) => {
        const { favorites } = get();
        return favorites
            .filter(f => f.type === type)
            .sort((a, b) => b.addedAt - a.addedAt); // Most recent first
    },

    // Get counts
    getFavoritesCount: () => {
        const { favorites } = get();
        return {
            total: favorites.length,
            live: favorites.filter(f => f.type === 'live').length,
            movies: favorites.filter(f => f.type === 'movie').length,
            series: favorites.filter(f => f.type === 'series').length,
        };
    },
});

// =============================================================================
// STANDALONE STORE
// =============================================================================

export const useFavoritesStore = create<FavoritesState>()(createFavoritesSlice);

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook to check if an item is favorited
 * Usage: const isFav = useIsFavorite(123, 'movie');
 */
export const useIsFavorite = (id: string | number, type: FavoriteType): boolean => {
    return useFavoritesStore((state) => state.isFavorite(id, type));
};

/**
 * Hook to get favorite toggle function
 * Usage: const toggle = useFavoriteToggle();
 *        toggle({ id: 123, type: 'movie', name: 'Title' });
 */
export const useFavoriteToggle = () => {
    return useFavoritesStore((state) => state.toggleFavorite);
};

/**
 * Hook to get favorites by type (sorted by most recent first)
 * Usage: const movies = useFavoritesByType('movie');
 */
export const useFavoritesByType = (type: FavoriteType): FavoriteItem[] => {
    return useFavoritesStore((state) => state.getFavoritesByType(type));
};

/**
 * Hook to get favorites count
 * Usage: const { total, live, movies, series } = useFavoritesCount();
 */
export const useFavoritesCount = () => {
    return useFavoritesStore((state) => state.getFavoritesCount());
};

export default useFavoritesStore;