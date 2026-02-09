/**
 * useHomeRails Hook - Rail Resolver
 *
 * Compatible + Performance upgrades:
 * - Do NOT subscribe to the whole `content` object
 * - Avoid zustand shallow second-arg (your store hook doesn't support it)
 * - Keep computations memoized with minimal dependencies
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
  rails: ResolvedRail[];
  continueWatching: WatchProgress[];
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
  isLoading: boolean;
}

type StoreState = ReturnType<typeof useStore.getState>;

// =============================================================================
// SMALL HELPERS (avoid repeated parsing work)
// =============================================================================

const toInt = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toTime = (v: any): number => {
  const t = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
};

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

    if (top.length < n) {
      top.push({ item, score: value });
      top.sort((a, b) => b.score - a.score);
      continue;
    }

    if (value <= top[top.length - 1].score) continue;

    top.push({ item, score: value });
    top.sort((a, b) => b.score - a.score);
    top.length = n;
  }

  return top.map((x) => x.item);
};

// =============================================================================
// HOOK
// =============================================================================

export const useHomeRails = (): HomeRailsResult => {
  // ✅ Small selectors (compatible with 1-arg zustand hook)
  const moviesLoaded = useStore((s: StoreState) => s.content.movies.loaded);
  const moviesItems = useStore((s: StoreState) => s.content.movies.items);
  const moviesCategories = useStore((s: StoreState) => s.content.movies.categories);

  const seriesLoaded = useStore((s: StoreState) => s.content.series.loaded);
  const seriesItems = useStore((s: StoreState) => s.content.series.items);
  const seriesCategories = useStore((s: StoreState) => s.content.series.categories);

  const liveLoaded = useStore((s: StoreState) => s.content.live.loaded);
  const liveItems = useStore((s: StoreState) => s.content.live.items);

  const history = useWatchHistoryStore((s) => s.history);
  const getContinueWatching = useWatchHistoryStore((s) => s.getContinueWatching);

  const { filterContent } = useContentFilter();

  // =========================================================================
  // FILTERED CONTENT (Parental controls)
  // =========================================================================

  const filteredMovies = useMemo(() => {
    if (!moviesLoaded || !Array.isArray(moviesItems) || moviesItems.length === 0) return [];
    return filterContent(moviesItems as any[]);
  }, [moviesLoaded, moviesItems, filterContent]);

  const filteredSeries = useMemo(() => {
    if (!seriesLoaded || !Array.isArray(seriesItems) || seriesItems.length === 0) return [];
    return filterContent(seriesItems as any[]);
  }, [seriesLoaded, seriesItems, filterContent]);

  // =========================================================================
  // HERO (stable selection; avoid random)
  // =========================================================================

  const hero = useMemo(() => {
    if (filteredMovies.length > 0) {
      const m = pickMaxBy(filteredMovies, (item: any) => toInt(item.added));
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
      const s = pickMaxBy(filteredSeries, (item: any) => toTime(item.last_modified));
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
  // RAIL RESOLVER
  // =========================================================================

  const rails = useMemo(() => {
    const resolved: ResolvedRail[] = [];

    // minimal content object for resolvers
    const content = {
      live: { loaded: liveLoaded, items: liveItems },
      movies: { loaded: moviesLoaded, categories: moviesCategories },
      series: { loaded: seriesLoaded, categories: seriesCategories },
    };

    for (const config of TV_HOME_RAILS) {
      if (!config.enabled) continue;
      resolved.push(...resolveRail(config, content, filteredMovies, filteredSeries));
    }

    return resolved;
  }, [
    liveLoaded,
    liveItems,
    moviesLoaded,
    moviesCategories,
    seriesLoaded,
    seriesCategories,
    filteredMovies,
    filteredSeries,
  ]);

  // =========================================================================
  // CONTINUE WATCHING
  // =========================================================================

  const continueWatching = useMemo(() => {
    return history ? getContinueWatching(10) : [];
  }, [getContinueWatching, history]);

  const isLoading = !moviesLoaded || !seriesLoaded;

  return { rails, continueWatching, hero, isLoading };
};

// =============================================================================
// RESOLVER FUNCTIONS
// =============================================================================

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
      return [];

    default:
      return [];
  }
}

function resolveLiveNow(config: HomeRailConfig, content: any): ResolvedRail[] {
  if (!content.live.loaded || !Array.isArray(content.live.items) || content.live.items.length === 0) return [];

  const items: TVContentItem[] = content.live.items.slice(0, config.maxItems).map((ch: any) => ({
    id: String(ch.stream_id),
    title: ch.name,
    image: ch.stream_icon,
    type: 'live' as const,
    data: ch,
  }));

  if (items.length === 0) return [];

  return [{ id: config.id, title: config.title, type: config.type, zone: config.zone, items }];
}

function resolveTrendingMovies(config: HomeRailConfig, content: any, filteredMovies: any[]): ResolvedRail[] {
  if (!content.movies.loaded || filteredMovies.length === 0) return [];

  const items: TVContentItem[] = selectTopNBy(filteredMovies, config.maxItems, (m: any) => toInt(m.added)).map(
    (m: any) => ({
      id: String(m.stream_id),
      title: m.name,
      image: m.stream_icon,
      rating: m.rating_5based,
      quality: m.container_extension === 'mp4' ? 'HD' : undefined,
      type: 'movie' as const,
      data: m,
    })
  );

  if (items.length === 0) return [];

  return [{ id: config.id, title: config.title, type: config.type, zone: config.zone, items }];
}

function resolveTrendingSeries(config: HomeRailConfig, content: any, filteredSeries: any[]): ResolvedRail[] {
  if (!content.series.loaded || filteredSeries.length === 0) return [];

  const items: TVContentItem[] = selectTopNBy(filteredSeries, config.maxItems, (s: any) => toTime(s.last_modified)).map(
    (s: any) => ({
      id: String(s.series_id),
      title: s.name,
      image: s.cover,
      rating: s.rating_5based,
      type: 'series' as const,
      data: s,
    })
  );

  if (items.length === 0) return [];

  return [{ id: config.id, title: config.title, type: config.type, zone: config.zone, items }];
}

function resolveTopRated(config: HomeRailConfig, content: any, filteredMovies: any[]): ResolvedRail[] {
  if (!content.movies.loaded || filteredMovies.length === 0) return [];

  const items: TVContentItem[] = selectTopNBy(filteredMovies, config.maxItems, (m: any) => Number(m.rating_5based || 0)).map(
    (m: any) => ({
      id: String(m.stream_id),
      title: m.name,
      image: m.stream_icon,
      rating: m.rating_5based,
      type: 'movie' as const,
      data: m,
    })
  );

  if (items.length === 0) return [];

  return [{ id: config.id, title: config.title, type: config.type, zone: config.zone, items }];
}

function resolveMovieCategories(config: HomeRailConfig, content: any, filteredMovies: any[]): ResolvedRail[] {
  if (!content.movies.loaded || !Array.isArray(content.movies.categories)) return [];

  const groupMap: Record<string, any[]> = Object.create(null);
  for (const m of filteredMovies) {
    const catId = String(m.category_id);
    (groupMap[catId] ||= []).push(m);
  }

  const rails: ResolvedRail[] = [];
  const categories = content.movies.categories.slice(0, MAX_HOME_MOVIE_CATEGORIES);

  for (const category of categories) {
    const catId = String(category.category_id);
    const catItems = groupMap[catId] || [];
    if (catItems.length === 0) continue;

    const items: TVContentItem[] = catItems.slice(0, config.maxItems).map((m: any) => ({
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

function resolveSeriesCategories(config: HomeRailConfig, content: any, filteredSeries: any[]): ResolvedRail[] {
  if (!content.series.loaded || !Array.isArray(content.series.categories)) return [];

  const groupMap: Record<string, any[]> = Object.create(null);
  for (const s of filteredSeries) {
    const catId = String(s.category_id);
    (groupMap[catId] ||= []).push(s);
  }

  const rails: ResolvedRail[] = [];
  const categories = content.series.categories.slice(0, MAX_HOME_SERIES_CATEGORIES);

  for (const category of categories) {
    const catId = String(category.category_id);
    const catItems = groupMap[catId] || [];
    if (catItems.length === 0) continue;

    const items: TVContentItem[] = catItems.slice(0, config.maxItems).map((s: any) => ({
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
