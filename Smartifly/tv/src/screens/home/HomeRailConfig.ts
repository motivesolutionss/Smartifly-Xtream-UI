/**
 * Smartifly TV Home rail configuration.
 * Controls which rails appear on the Home screen and their limits.
 */

export type HomeRailType =
    | 'hero'
    | 'continue_watching'
    | 'live_now'
    | 'trending_movies'
    | 'trending_series'
    | 'top_rated'
    | 'movie_category'
    | 'series_category';

export type HomeRailZone = 'top' | 'middle' | 'bottom';

export interface HomeRailConfig {
    id: string;
    title: string;
    type: HomeRailType;
    zone: HomeRailZone;
    sourceCategoryId?: string;
    maxItems: number;
    enabled: boolean;
}

export interface ResolvedRail {
    id: string;
    title: string;
    type: HomeRailType;
    zone: HomeRailZone;
    items: any[];
}

export const TV_HOME_RAILS: HomeRailConfig[] = [
    {
        id: 'live_now',
        title: 'Live Now',
        type: 'live_now',
        zone: 'top',
        maxItems: 12,
        enabled: true,
    },
    {
        id: 'continue',
        title: 'Continue Watching',
        type: 'continue_watching',
        zone: 'top',
        maxItems: 10,
        enabled: true,
    },
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
        title: 'Top Rated Movies',
        type: 'top_rated',
        zone: 'middle',
        maxItems: 15,
        enabled: true,
    },
    {
        id: 'movie_categories',
        title: 'Movie Categories',
        type: 'movie_category',
        zone: 'bottom',
        maxItems: 10,
        enabled: true,
    },
    {
        id: 'series_categories',
        title: 'Series Categories',
        type: 'series_category',
        zone: 'bottom',
        maxItems: 10,
        enabled: true,
    },
];

export const MAX_HOME_MOVIE_CATEGORIES = 2;
export const MAX_HOME_SERIES_CATEGORIES = 2;
export const SHOW_LIVE_CATEGORIES_ON_HOME = false;
export const FALLBACK_POSTER = require('../../assets/overlay.png');

export default TV_HOME_RAILS;
