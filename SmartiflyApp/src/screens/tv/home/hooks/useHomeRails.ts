/**
 * useHomeRails Hook - Rail Resolver
 * 
 * Netflix-grade manifest-driven rail resolver.
 * Converts HomeRailConfig manifest into renderable data.
 * 
 * This is the SINGLE SOURCE OF TRUTH for what appears on Home.
 * The HomeScreen just renders whatever this hook returns.
 * 
 * Benefits:
 * - Zero manual ordering in components
 * - Easy A/B testing (swap manifests)
 * - Type-safe
 * - Memoized for performance
 * 
 * @enterprise-grade
 */

import { useMemo } from 'react';
import useStore from '../../../../store';
import { useWatchHistoryStore, WatchProgress } from '../../../../store/watchHistoryStore';
import {
    TV_HOME_RAILS,
    HomeRailConfig,
    ResolvedRail,
    HomeRailType,
    MAX_HOME_MOVIE_CATEGORIES,
    MAX_HOME_SERIES_CATEGORIES,
} from '../HomeRailConfig';
import { TVContentItem } from '../components/TVContentCard';

// =============================================================================
// TYPES
// =============================================================================

export interface HomeRailsResult {
    /** All resolved rails ready to render */
    rails: ResolvedRail[];
    /** Continue watching items (separate for special rail) */
    continueWatching: WatchProgress[];
    /** Hero content (first recent movie/series) */
    hero: {
        id: string;
        title: string;
        description: string;
        backdrop: string;
        rating?: number;
        tags: string[];
        type: 'movie' | 'series';
        data: any;
    } | null;
    /** Loading state */
    isLoading: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export const useHomeRails = (): HomeRailsResult => {
    const { content } = useStore();
    const getContinueWatching = useWatchHistoryStore((state) => state.getContinueWatching);

    // =========================================================================
    // HERO RESOLVER (Stable - first recent, not random)
    // =========================================================================
    const hero = useMemo(() => {
        // Priority: First recent movie, then first recent series
        if (content.movies.loaded && content.movies.items.length > 0) {
            const sortedMovies = [...content.movies.items]
                .sort((a: any, b: any) => parseInt(b.added || '0') - parseInt(a.added || '0'));

            const m = sortedMovies[0];
            return {
                id: `movie-${m.stream_id}`,
                title: m.name,
                description: m.plot || 'No description available.',
                backdrop: m.backdrop_path?.[0] || m.stream_icon,
                rating: m.rating_5based,
                tags: [m.genre].filter((t): t is string => Boolean(t)),
                type: 'movie' as const,
                data: m,
            };
        }

        if (content.series.loaded && content.series.items.length > 0) {
            const sortedSeries = [...content.series.items]
                .sort((a: any, b: any) =>
                    new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime()
                );

            const s = sortedSeries[0];
            return {
                id: `series-${s.series_id}`,
                title: s.name,
                description: s.plot || 'No description available.',
                backdrop: s.backdrop_path?.[0] || s.cover,
                rating: s.rating_5based,
                tags: [s.genre, 'Series'].filter((t): t is string => Boolean(t)),
                type: 'series' as const,
                data: s,
            };
        }

        return null;
    }, [content.movies.loaded, content.movies.items, content.series.loaded, content.series.items]);

    // =========================================================================
    // RAIL RESOLVER
    // =========================================================================
    const rails = useMemo(() => {
        const resolved: ResolvedRail[] = [];

        for (const config of TV_HOME_RAILS) {
            if (!config.enabled) continue;

            const railsFromConfig = resolveRail(config, content);
            resolved.push(...railsFromConfig);
        }

        return resolved;
    }, [content]);

    // =========================================================================
    // CONTINUE WATCHING (from history store)
    // =========================================================================
    const continueWatching = useMemo(() => {
        return getContinueWatching(10);
    }, [getContinueWatching]);

    // =========================================================================
    // LOADING STATE
    // =========================================================================
    const isLoading = !content.live.loaded && !content.movies.loaded && !content.series.loaded;

    return { rails, continueWatching, hero, isLoading };
};

// =============================================================================
// RESOLVER FUNCTIONS
// =============================================================================

/**
 * Resolve a single rail config into one or more renderable rails.
 * Category rails expand into multiple rails (up to max limit).
 */
function resolveRail(config: HomeRailConfig, content: any): ResolvedRail[] {
    switch (config.type) {
        case 'live_now':
            return resolveLiveNow(config, content);

        case 'trending_movies':
            return resolveTrendingMovies(config, content);

        case 'trending_series':
            return resolveTrendingSeries(config, content);

        case 'top_rated':
            return resolveTopRated(config, content);

        case 'movie_category':
            return resolveMovieCategories(config, content);

        case 'series_category':
            return resolveSeriesCategories(config, content);

        case 'continue_watching':
            // Handled separately in the hook (uses different store)
            return [];

        default:
            return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Resolvers
// ─────────────────────────────────────────────────────────────────────────────

function resolveLiveNow(config: HomeRailConfig, content: any): ResolvedRail[] {
    if (!content.live.loaded || content.live.items.length === 0) return [];

    const items: TVContentItem[] = content.live.items
        .slice(0, config.maxItems)
        .map((ch: any) => ({
            id: String(ch.stream_id),
            title: ch.name,
            image: ch.stream_icon,
            type: 'live' as const,
            data: ch,
        }));

    if (items.length === 0) return [];

    return [{
        id: config.id,
        title: config.title,
        type: config.type,
        zone: config.zone,
        items,
    }];
}

function resolveTrendingMovies(config: HomeRailConfig, content: any): ResolvedRail[] {
    if (!content.movies.loaded || content.movies.items.length === 0) return [];

    const items: TVContentItem[] = [...content.movies.items]
        .sort((a: any, b: any) => parseInt(b.added || '0') - parseInt(a.added || '0'))
        .slice(0, config.maxItems)
        .map((m: any) => ({
            id: String(m.stream_id),
            title: m.name,
            image: m.stream_icon,
            rating: m.rating_5based,
            quality: m.container_extension === 'mp4' ? 'HD' : undefined,
            type: 'movie' as const,
            data: m,
        }));

    if (items.length === 0) return [];

    return [{
        id: config.id,
        title: config.title,
        type: config.type,
        zone: config.zone,
        items,
    }];
}

function resolveTrendingSeries(config: HomeRailConfig, content: any): ResolvedRail[] {
    if (!content.series.loaded || content.series.items.length === 0) return [];

    const items: TVContentItem[] = [...content.series.items]
        .sort((a: any, b: any) =>
            new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime()
        )
        .slice(0, config.maxItems)
        .map((s: any) => ({
            id: String(s.series_id),
            title: s.name,
            image: s.cover,
            rating: s.rating_5based,
            type: 'series' as const,
            data: s,
        }));

    if (items.length === 0) return [];

    return [{
        id: config.id,
        title: config.title,
        type: config.type,
        zone: config.zone,
        items,
    }];
}

function resolveTopRated(config: HomeRailConfig, content: any): ResolvedRail[] {
    if (!content.movies.loaded || content.movies.items.length === 0) return [];

    const items: TVContentItem[] = [...content.movies.items]
        .sort((a: any, b: any) => (b.rating_5based || 0) - (a.rating_5based || 0))
        .slice(0, config.maxItems)
        .map((m: any) => ({
            id: String(m.stream_id),
            title: m.name,
            image: m.stream_icon,
            rating: m.rating_5based,
            type: 'movie' as const,
            data: m,
        }));

    if (items.length === 0) return [];

    return [{
        id: config.id,
        title: config.title,
        type: config.type,
        zone: config.zone,
        items,
    }];
}

/**
 * Movie categories - expands into MULTIPLE rails (max 4)
 */
function resolveMovieCategories(config: HomeRailConfig, content: any): ResolvedRail[] {
    if (!content.movies.loaded || !content.movies.categories) return [];

    const rails: ResolvedRail[] = [];

    for (const category of content.movies.categories.slice(0, MAX_HOME_MOVIE_CATEGORIES)) {
        const catId = String(category.category_id);
        const items: TVContentItem[] = content.movies.items
            .filter((m: any) => String(m.category_id) === catId)
            .slice(0, config.maxItems)
            .map((m: any) => ({
                id: String(m.stream_id),
                title: m.name,
                image: m.stream_icon,
                rating: m.rating_5based,
                type: 'movie' as const,
                data: m,
            }));

        if (items.length > 0) {
            rails.push({
                id: `movie-cat-${catId}`,
                title: category.category_name,
                type: 'movie_category',
                zone: config.zone,
                items,
            });
        }
    }

    return rails;
}

/**
 * Series categories - expands into MULTIPLE rails (max 4)
 */
function resolveSeriesCategories(config: HomeRailConfig, content: any): ResolvedRail[] {
    if (!content.series.loaded || !content.series.categories) return [];

    const rails: ResolvedRail[] = [];

    for (const category of content.series.categories.slice(0, MAX_HOME_SERIES_CATEGORIES)) {
        const catId = String(category.category_id);
        const items: TVContentItem[] = content.series.items
            .filter((s: any) => String(s.category_id) === catId)
            .slice(0, config.maxItems)
            .map((s: any) => ({
                id: String(s.series_id),
                title: s.name,
                image: s.cover,
                rating: s.rating_5based,
                type: 'series' as const,
                data: s,
            }));

        if (items.length > 0) {
            rails.push({
                id: `series-cat-${catId}`,
                title: category.category_name,
                type: 'series_category',
                zone: config.zone,
                items,
            });
        }
    }

    return rails;
}

export default useHomeRails;
