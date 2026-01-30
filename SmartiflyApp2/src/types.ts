/**
 * Smartifly TypeScript Type Definitions
 * 
 * Centralized type definitions for API responses, store state, and components.
 * Replaces usage of 'any' throughout the codebase.
 */

// =============================================================================
// XTREAM API TYPES (Re-export from api/xtream.ts for convenience)
// =============================================================================

export type {
    XtreamUserInfo,
    XtreamServerInfo,
    XtreamAuthResponse,
    XtreamCategory,
    XtreamLiveStream,
    XtreamMovie,
    XtreamSeries,
} from './api/xtream';

// =============================================================================
// CONTENT ITEM TYPES (for UI components)
// =============================================================================

/**
 * Base content item with common properties
 */
export interface ContentItemBase {
    id: string;
    name: string;
    image?: string;
    type: 'live' | 'movie' | 'series';
}

/**
 * Live channel item for display
 */
export interface LiveChannelItem extends ContentItemBase {
    type: 'live';
    stream_id: number;
    stream_icon?: string;
    category_id?: string;
    epg_channel_id?: string;
    tv_archive?: number;
}

/**
 * Movie item for display
 */
export interface MovieItem extends ContentItemBase {
    type: 'movie';
    stream_id: number;
    stream_icon?: string;
    category_id?: string;
    rating?: string;
    rating_5based?: number;
    plot?: string;
    genre?: string;
    container_extension?: string;
}

/**
 * Series item for display
 */
export interface SeriesItem extends ContentItemBase {
    type: 'series';
    series_id: number;
    cover?: string;
    category_id?: string;
    rating?: string;
    rating_5based?: number;
    plot?: string;
    genre?: string;
    releaseDate?: string;
    backdrop_path?: string[];
}

/**
 * Union type for any content item
 */
export type ContentItem = LiveChannelItem | MovieItem | SeriesItem;

// =============================================================================
// HOME SCREEN CONTENT TYPES
// =============================================================================

/**
 * Featured content for hero banner
 */
export interface FeaturedContent {
    id: string;
    type: 'movie' | 'series';
    name: string;
    image?: string;
    rating?: number;
    plot?: string;
    genre?: string;
}

/**
 * Content row item for horizontal scrolling lists
 */
export interface ContentRowItem {
    id: string;
    name: string;
    image?: string;
    type: 'live' | 'movie' | 'series';
    rating?: number;
    data: any; // Original API data for navigation
}

/**
 * Quick category item for home screen
 */
export interface QuickCategory {
    id: string;
    name: string;
    count: number;
    color: string;
    icon: string;
}

// =============================================================================
// EPISODE TYPES
// =============================================================================

/**
 * Series episode information
 */
export interface Episode {
    id: number;
    episode_num: number;
    title: string;
    container_extension?: string;
    info?: {
        movie_image?: string;
        duration?: string;
        plot?: string;
        releasedate?: string;
    };
}

/**
 * Series info response with episodes grouped by season
 */
export interface SeriesInfo {
    info?: {
        name: string;
        cover?: string;
        plot?: string;
        cast?: string;
        director?: string;
        genre?: string;
        releaseDate?: string;
        rating?: string;
        backdrop_path?: string[];
    };
    episodes: Record<string, Episode[]>;
    seasons?: Array<{
        season_number: number;
        name: string;
        episode_count: number;
    }>;
}

// =============================================================================
// NAVIGATION TYPES
// =============================================================================

/**
 * Player screen parameters
 */
export interface PlayerParams {
    type: 'live' | 'movie' | 'series';
    item: {
        stream_id?: number;
        name: string;
        stream_icon?: string;
        container_extension?: string;
    };
    episodeUrl?: string;
}

/**
 * Series detail screen parameters
 */
export interface SeriesDetailParams {
    series: SeriesItem;
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

/**
 * Props for card components
 */
export interface CardProps<T> {
    item: T;
    onPress: (item: T) => void;
}

/**
 * Props for content row
 */
export interface ContentRowProps {
    title: string;
    type: 'live' | 'movies' | 'series';
    items: ContentRowItem[];
    onItemPress: (item: ContentRowItem) => void;
    onSeeAllPress?: () => void;
    accentColor?: string;
}

// =============================================================================
// CATEGORY TYPES
// =============================================================================

/**
 * Transformed category for UI display
 */
export interface DisplayCategory {
    id: string | null;
    name: string;
    count: number;
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

/**
 * Search result item
 */
export interface SearchResult {
    id: string;
    name: string;
    type: 'live' | 'movie' | 'series';
    image?: string;
    rating?: number;
    data: any;
}

/**
 * Recent search entry
 */
export interface RecentSearch {
    id: string;
    query: string;
    timestamp: number;
    resultCount?: number;
}

// =============================================================================
// FAVORITES TYPES
// =============================================================================

/**
 * Favorite item stored in AsyncStorage
 */
export interface FavoriteItem {
    id: string;
    type: 'live' | 'movie' | 'series';
    name: string;
    image?: string;
    addedAt: number;
    data: any;
}
