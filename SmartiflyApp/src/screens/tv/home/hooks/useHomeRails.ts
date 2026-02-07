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
import { useContentFilter } from '../../../../store/profileStore';
import {
    TV_HOME_RAILS,
    HomeRailConfig,
    ResolvedRail,
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

const pickMaxBy = <T,>(items: T[], score: (item: T) => number): T | null => {
    let best: T | null = null;
    let bestScore = -Infinity;

    for (const item of items) {
        const value = score(item);
        if (value > bestScore) {
            best = item;
            bestScore = value;
        }
    }

    return best;
};

const selectTopNBy = <T,>(items: T[], n: number, score: (item: T) => number): T[] => {
    if (n <= 0) return [];

    const top: { item: T; score: number }[] = [];

    for (const item of items) {
        const value = score(item);
        if (top.length === 0) {
            top.push({ item, score: value });
            continue;
        }

        let insertAt = top.length;
        for (let i = 0; i < top.length; i++) {
            if (value > top[i].score) {
                insertAt = i;
                break;
            }
        }

        if (top.length < n || insertAt < top.length) {
            top.splice(insertAt, 0, { item, score: value });
            if (top.length > n) {
                top.pop();
            }
        }
    }

    return top.map((entry) => entry.item);
};

export const useHomeRails = (): HomeRailsResult => {
    const content = useStore((state) => state.content);
    const history = useWatchHistoryStore((state) => state.history);
    const getContinueWatching = useWatchHistoryStore((state) => state.getContinueWatching);

    // Parental Controls: Get content filter for active profile
    const { filterContent } = useContentFilter();

    // =========================================================================
    // HERO RESOLVER (Stable - first recent, not random) + PARENTAL FILTER
    // =========================================================================
    const filteredMovies = useMemo(() => {
        if (!content.movies.loaded || content.movies.items.length === 0) return [];
        return filterContent(content.movies.items as any[]);
    }, [content.movies.loaded, content.movies.items, filterContent]);

    const filteredSeries = useMemo(() => {
        if (!content.series.loaded || content.series.items.length === 0) return [];
        return filterContent(content.series.items as any[]);
    }, [content.series.loaded, content.series.items, filterContent]);

    const hero = useMemo(() => {
        // Priority: First recent movie (filtered by parental controls), then first recent series
        if (filteredMovies.length > 0) {
            const m = pickMaxBy(filteredMovies, (item: any) => parseInt(item.added || '0', 10));
            if (!m) return null;
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

        if (filteredSeries.length > 0) {
            const s = pickMaxBy(
                filteredSeries,
                (item: any) => new Date(item.last_modified || 0).getTime()
            );
            if (!s) return null;
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
    }, [filteredMovies, filteredSeries]);

    // =========================================================================
    // RAIL RESOLVER + PARENTAL FILTER
    // =========================================================================
    const rails = useMemo(() => {
        const resolved: ResolvedRail[] = [];

        for (const config of TV_HOME_RAILS) {
            if (!config.enabled) continue;

            const railsFromConfig = resolveRail(config, content, filteredMovies, filteredSeries);
            resolved.push(...railsFromConfig);
        }

        return resolved;
    }, [
        content,
        filteredMovies,
        filteredSeries,
    ]);

    // =========================================================================
    // CONTINUE WATCHING (from history store - already profile-filtered)
    // =========================================================================
    const continueWatching = useMemo(() => {
        // history is referenced to ensure re-memoization when watch progress changes
        return history ? getContinueWatching(10) : [];
    }, [getContinueWatching, history]);

    // =========================================================================
    // LOADING STATE
    // =========================================================================
    const isLoading = !content.movies.loaded || !content.series.loaded;

    return { rails, continueWatching, hero, isLoading };
};

// =============================================================================
// RESOLVER FUNCTIONS
// =============================================================================

// Type for content filter function
/**
 * Resolve a single rail config into one or more renderable rails.
 * Category rails expand into multiple rails (up to max limit).
 * Uses pre-filtered arrays to avoid repeated filtering work.
 */
function resolveRail(
    config: HomeRailConfig,
    content: any,
    filteredMovies: any[],
    filteredSeries: any[]
): ResolvedRail[] {
    switch (config.type) {
        case 'live_now':
            return resolveLiveNow(config, content);

        case 'trending_movies':
            return resolveTrendingMovies(config, content, filteredMovies);

        case 'trending_series':
            return resolveTrendingSeries(config, content, filteredSeries);

        case 'top_rated':
            return resolveTopRated(config, content, filteredMovies);

        case 'movie_category':
            return resolveMovieCategories(config, content, filteredMovies);

        case 'series_category':
            return resolveSeriesCategories(config, content, filteredSeries);

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

function resolveTrendingMovies(config: HomeRailConfig, content: any, filteredMovies: any[]): ResolvedRail[] {
    if (!content.movies.loaded || filteredMovies.length === 0) return [];

    const items: TVContentItem[] = selectTopNBy(
        filteredMovies,
        config.maxItems,
        (item: any) => parseInt(item.added || '0', 10)
    ).map((m: any) => ({
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

function resolveTrendingSeries(config: HomeRailConfig, content: any, filteredSeries: any[]): ResolvedRail[] {
    if (!content.series.loaded || filteredSeries.length === 0) return [];

    const items: TVContentItem[] = selectTopNBy(
        filteredSeries,
        config.maxItems,
        (item: any) => new Date(item.last_modified || 0).getTime()
    ).map((s: any) => ({
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

function resolveTopRated(config: HomeRailConfig, content: any, filteredMovies: any[]): ResolvedRail[] {
    if (!content.movies.loaded || filteredMovies.length === 0) return [];

    const items: TVContentItem[] = selectTopNBy(
        filteredMovies,
        config.maxItems,
        (item: any) => Number(item.rating_5based || 0)
    ).map((m: any) => ({
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
function resolveMovieCategories(config: HomeRailConfig, content: any, filteredMovies: any[]): ResolvedRail[] {
    if (!content.movies.loaded || !content.movies.categories) return [];

    const groupMap: Record<string, any[]> = {};
    filteredMovies.forEach((m: any) => {
        const catId = String(m.category_id);
        if (!groupMap[catId]) groupMap[catId] = [];
        groupMap[catId].push(m);
    });

    const rails: ResolvedRail[] = [];

    for (const category of content.movies.categories.slice(0, MAX_HOME_MOVIE_CATEGORIES)) {
        const catId = String(category.category_id);
        const catItems = groupMap[catId] || [];

        const items: TVContentItem[] = catItems
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
function resolveSeriesCategories(config: HomeRailConfig, content: any, filteredSeries: any[]): ResolvedRail[] {
    if (!content.series.loaded || !content.series.categories) return [];

    const groupMap: Record<string, any[]> = {};
    filteredSeries.forEach((s: any) => {
        const catId = String(s.category_id);
        if (!groupMap[catId]) groupMap[catId] = [];
        groupMap[catId].push(s);
    });

    const rails: ResolvedRail[] = [];

    for (const category of content.series.categories.slice(0, MAX_HOME_SERIES_CATEGORIES)) {
        const catId = String(category.category_id);
        const catItems = groupMap[catId] || [];

        const items: TVContentItem[] = catItems
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
