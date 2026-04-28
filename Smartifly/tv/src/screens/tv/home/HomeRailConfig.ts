/**
 * Smartifly TV Home rail configuration.
 * Controls which rails appear on the Home screen and their limits.
 */

// =============================================================================
// TYPES
// =============================================================================

export type HomeRailType =
    | 'hero'
    | 'continue_watching'
    | 'live_now'
    | 'trending_movies'
    | 'trending_series'
    | 'top_rated'
    | 'movie_category'
    | 'series_category';

/**
 * Rail zones - prevents accidental UX damage from reordering.
 * Each zone has specific content rules.
 */
export type HomeRailZone = 'top' | 'middle' | 'bottom';

export interface HomeRailConfig {
    /** Unique identifier for this rail */
    id: string;
    /** Display title */
    title: string;
    /** Rail type - determines data source and rendering */
    type: HomeRailType;
    /** Zone placement - prevents accidental reordering */
    zone: HomeRailZone;
    /** For category rails, the category ID to pull from */
    sourceCategoryId?: string;
    /** Maximum items to show (performance + UX) */
    maxItems: number;
    /** Whether this rail is enabled */
    enabled: boolean;
}

/**
 * Resolved rail ready for rendering.
 * Created by the resolver from config + store data.
 */
export interface ResolvedRail {
    id: string;
    title: string;
    type: HomeRailType;
    zone: HomeRailZone;
    items: any[];
}

// =============================================================================
// HOME RAIL MANIFEST
// =============================================================================

/**
 * Home structure:
 * 
 * 1. Live content at TOP (urgency, real-time)
 * 2. Continue Watching next (personalization)
 * 3. New content in MIDDLE (discovery)
 * 4. Top rated in MIDDLE (social proof)
 * 5. Limited categories at BOTTOM (browsing hint)
 * 
 * RULES:
 * - Max 4 movie categories on Home
 * - Max 4 series categories on Home
 * - NO live categories on Home (those go to Live TV screen)
 * - Everything else → dedicated tabs
 * 
 * IMPORTANT - Category Rails:
 * `movie_category` and `series_category` types resolve into MULTIPLE rails.
 * They are NOT single rails - the resolver expands them based on available
 * categories, respecting the max limits.
 */

export const TV_HOME_RAILS: HomeRailConfig[] = [
    // ═══════════════════════════════════════════════════════════════════════
    // TOP ZONE (Live + Personal)
    // Urgency content - "what's happening NOW"
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'live_now',
        title: 'Live Now',
        type: 'live_now',
        zone: 'top',
        maxItems: 12,
        enabled: true,
    },
    // Continue Watching
    {
        id: 'continue',
        title: 'Continue Watching',
        type: 'continue_watching',
        zone: 'top',
        maxItems: 10,
        enabled: true,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MIDDLE ZONE (Discovery)
    // Fresh content - "what's new"
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'new_movies',
        title: 'New Movies',
        type: 'trending_movies',
        zone: 'middle',
        maxItems: 15,
        enabled: true,
    },
    {
        id: 'new_series',
        title: 'New Series',
        type: 'trending_series',
        zone: 'middle',
        maxItems: 15,
        enabled: true,
    },
    {
        id: 'top_rated',
        title: '⭐ Top Rated Movies',
        type: 'top_rated',
        zone: 'middle',
        maxItems: 15,
        enabled: true,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BOTTOM ZONE (Category Hints - Limited!)
    // Browse more - "explore by genre"
    // 
    // These are META-RAILS that expand into multiple actual rails.
    // The resolver will create up to MAX_HOME_*_CATEGORIES rails from each.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'movie_categories',
        title: 'Movie Categories', // Will be replaced with actual category names
        type: 'movie_category',
        zone: 'bottom',
        maxItems: 10,
        enabled: true,
    },
    {
        id: 'series_categories',
        title: 'Series Categories', // Will be replaced with actual category names
        type: 'series_category',
        zone: 'bottom',
        maxItems: 10,
        enabled: true,
    },
];

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/** Maximum movie categories to show on Home */
export const MAX_HOME_MOVIE_CATEGORIES = 2;

/** Maximum series categories to show on Home */
export const MAX_HOME_SERIES_CATEGORIES = 2;

/** Live categories should NEVER appear on Home (they belong in Live TV) */
export const SHOW_LIVE_CATEGORIES_ON_HOME = false;

/** Fallback poster for broken images */
export const FALLBACK_POSTER = 'https://via.placeholder.com/150x225/222222/666666?text=No+Image';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get enabled rails only
 */
export const getEnabledRails = (): HomeRailConfig[] => {
    return TV_HOME_RAILS.filter(rail => rail.enabled);
};

/**
 * Get rails by zone
 */
export const getRailsByZone = (zone: HomeRailZone): HomeRailConfig[] => {
    return TV_HOME_RAILS.filter(rail => rail.zone === zone && rail.enabled);
};

/**
 * Check if a rail type should be rendered
 */
export const isRailTypeEnabled = (type: HomeRailType): boolean => {
    return TV_HOME_RAILS.some(rail => rail.type === type && rail.enabled);
};

/**
 * Get max items for a rail type
 */
export const getMaxItemsForType = (type: HomeRailType): number => {
    const rail = TV_HOME_RAILS.find(r => r.type === type);
    return rail?.maxItems ?? 15;
};

/**
 * Get config for a specific rail by ID
 */
export const getRailConfig = (id: string): HomeRailConfig | undefined => {
    return TV_HOME_RAILS.find(rail => rail.id === id);
};

export default TV_HOME_RAILS;
