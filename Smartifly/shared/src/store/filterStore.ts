/**
 * Smartifly Filter Store (Enterprise-Grade)
 * 
 * Domain-scoped Zustand store for content filtering.
 * - Per-domain category selection (live, movies, series)
 * - Category IDs are NOT shared between domains in Xtream
 * - "All" = null, not "all" string
 */

import { create } from 'zustand';

// =============================================================================
// TYPES
// =============================================================================

export type ContentType = 'live' | 'movies' | 'series' | null;

/** Per-domain category selection */
export interface DomainCategories {
    live: string | null;
    movies: string | null;
    series: string | null;
}

/** Per-domain category names for display */
export interface DomainCategoryNames {
    live: string | null;
    movies: string | null;
    series: string | null;
}

export interface FilterState {
    /** Currently selected content type */
    selectedType: ContentType;
    /** Per-domain category selection (CRITICAL: category IDs are domain-specific) */
    selectedCategory: DomainCategories;
    /** Per-domain category names for display */
    selectedCategoryName: DomainCategoryNames;
    /** Is category modal visible */
    isCategoryModalVisible: boolean;
}

export interface FilterActions {
    /** Set the content type filter */
    setType: (type: ContentType) => void;
    /** Set category for a specific domain */
    setCategory: (domain: 'live' | 'movies' | 'series', categoryId: string | null, categoryName: string | null) => void;
    /** Get category for current type */
    getCategoryForType: () => string | null;
    /** Get category name for current type */
    getCategoryNameForType: () => string | null;
    /** Clear all filters */
    clearFilters: () => void;
    /** Show/hide category modal */
    setCategoryModalVisible: (visible: boolean) => void;
}

export type FilterStore = FilterState & FilterActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: FilterState = {
    selectedType: null,
    selectedCategory: {
        live: null,
        movies: null,
        series: null,
    },
    selectedCategoryName: {
        live: null,
        movies: null,
        series: null,
    },
    isCategoryModalVisible: false,
};

// =============================================================================
// STORE
// =============================================================================

const useFilterStore = create<FilterStore>((set, get) => ({
    ...initialState,

    setType: (type) => {
        // Validation Guard
        if (type && !['live', 'movies', 'series'].includes(type)) {
            console.warn('[FilterStore] Invalid content type:', type);
            return;
        }

        set({
            selectedType: type,
            // NOTE: We do NOT clear category when changing type anymore
            // Each domain keeps its own category selection
        });
    },

    setCategory: (domain, categoryId, categoryName) => set((state) => ({
        selectedCategory: {
            ...state.selectedCategory,
            [domain]: categoryId,
        },
        selectedCategoryName: {
            ...state.selectedCategoryName,
            [domain]: categoryName,
        },
        isCategoryModalVisible: false,
    })),

    getCategoryForType: () => {
        const { selectedType, selectedCategory } = get();
        switch (selectedType) {
            case 'live': return selectedCategory.live;
            case 'movies': return selectedCategory.movies;
            case 'series': return selectedCategory.series;
            default: return null;
        }
    },

    getCategoryNameForType: () => {
        const { selectedType, selectedCategoryName } = get();
        switch (selectedType) {
            case 'live': return selectedCategoryName.live;
            case 'movies': return selectedCategoryName.movies;
            case 'series': return selectedCategoryName.series;
            default: return null;
        }
    },

    clearFilters: () => set({
        selectedType: null,
        selectedCategory: {
            live: null,
            movies: null,
            series: null,
        },
        selectedCategoryName: {
            live: null,
            movies: null,
            series: null,
        },
    }),

    setCategoryModalVisible: (visible) => set({
        isCategoryModalVisible: visible,
    }),
}));

export default useFilterStore;
