/**
 * useHomeRails Hook - Rail Resolver
 *
 * Enterprise-grade upgrades:
 * - Seeded daily rotation per profile/user
 * - Cross-rail dedupe to reduce repeated cards
 * - Lightweight affinity scoring from watch history
 * - Rotating category selection instead of fixed backend order
 * - Rail selection based on ranked candidate windows, not raw first-N slices
 */

import { useMemo } from 'react';
import useStore from '@smartifly/shared/src/store';
import { useWatchHistoryStore, WatchProgress } from '@smartifly/shared/src/store/watchHistoryStore';
import { useContentFilter, useProfileStore } from '@smartifly/shared/src/store/profileStore';
import { getHeroCandidates, useHeroCarousel } from '@smartifly/shared/src/utils/heroPicker';
import { getPreparedHomeHeroId } from '@smartifly/shared/src/services/HeroPreparationService';
import { seededShuffle } from '@smartifly/shared/src/utils/shuffle';
import {
  TV_HOME_RAILS,
  ResolvedRail,
  MAX_HOME_MOVIE_CATEGORIES,
  MAX_HOME_SERIES_CATEGORIES,
} from '../HomeRailConfig';
import { TVContentItem } from '../components/TVContentCard';

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
type ContentType = 'live' | 'movie' | 'series';

type CategoryAffinity = {
  live: Record<string, number>;
  movie: Record<string, number>;
  series: Record<string, number>;
};

const CATEGORY_ROTATION_WINDOW = 4;
const RANKED_WINDOW_MULTIPLIER = 3;

const toInt = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toTime = (v: any): number => {
  const t = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
};

const getTimestampScore = (value: any): number => {
  return toTime(value) || toInt(value);
};

const getCategoryId = (item: any): string => String(item?.category_id ?? '');

const getIdentity = (type: ContentType, item: any): string => {
  if (type === 'series') {
    return `series:${String(item?.series_id ?? item?.id ?? '')}`;
  }
  return `${type}:${String(item?.stream_id ?? item?.id ?? '')}`;
};

const buildCategoryAffinity = (history: Record<string, WatchProgress>): CategoryAffinity => {
  const affinity: CategoryAffinity = {
    live: Object.create(null),
    movie: Object.create(null),
    series: Object.create(null),
  };

  for (const item of Object.values(history || {})) {
    const categoryId = String((item.data as any)?.category_id ?? '');
    if (!categoryId) continue;

    const map = affinity[item.type];
    const recencyBoost = Math.max(1, Math.round(item.progress / 20));
    map[categoryId] = (map[categoryId] || 0) + recencyBoost;
  }

  return affinity;
};

const selectTopNBy = <T,>(items: T[], n: number, score: (item: T) => number): T[] => {
  if (n <= 0 || items.length === 0) return [];

  const top: Array<{ item: T; score: number }> = [];

  for (const item of items) {
    const itemScore = score(item);

    if (top.length < n) {
      top.push({ item, score: itemScore });
      continue;
    }

    let lowestIndex = 0;
    for (let i = 1; i < top.length; i += 1) {
      if (top[i].score < top[lowestIndex].score) {
        lowestIndex = i;
      }
    }

    if (itemScore > top[lowestIndex].score) {
      top[lowestIndex] = { item, score: itemScore };
    }
  }

  return top.sort((a, b) => b.score - a.score).map((entry) => entry.item);
};

const prepareRankedCandidates = <T,>(
  items: T[],
  maxItems: number,
  score: (item: T) => number,
  getKey: (item: T) => string,
  seed: string,
  windowMultiplier = RANKED_WINDOW_MULTIPLIER
): T[] => {
  const rankedWindow = selectTopNBy(items, Math.max(maxItems, maxItems * windowMultiplier), score);
  return seededShuffle(rankedWindow, getKey, seed);
};

const mapLiveItem = (channel: any): TVContentItem => ({
  id: String(channel.stream_id),
  title: channel.name,
  image: channel.stream_icon,
  type: 'live' as const,
  data: channel,
});

const mapMovieItem = (movie: any): TVContentItem => ({
  id: String(movie.stream_id),
  title: movie.name,
  image: movie.stream_icon,
  rating: movie.rating_5based,
  quality: movie.container_extension === 'mp4' ? 'HD' : undefined,
  type: 'movie' as const,
  data: movie,
});

const mapSeriesItem = (series: any): TVContentItem => ({
  id: String(series.series_id),
  title: series.name,
  image: series.cover,
  rating: series.rating_5based,
  type: 'series' as const,
  data: series,
});

const collectUniqueItems = <T,>(
  candidates: T[],
  limit: number,
  usedIds: Set<string>,
  toIdentity: (item: T) => string,
  mapItem: (item: T) => TVContentItem
): TVContentItem[] => {
  const selected: TVContentItem[] = [];

  for (const item of candidates) {
    const identity = toIdentity(item);
    if (!identity || usedIds.has(identity)) continue;

    usedIds.add(identity);
    selected.push(mapItem(item));

    if (selected.length >= limit) break;
  }

  return selected;
};

const chooseCategoryOrder = (
  categories: any[],
  groupMap: Record<string, any[]>,
  affinity: Record<string, number>,
  limit: number,
  seed: string
) => {
  const weighted = categories
    .map((category) => {
      const categoryId = String(category.category_id);
      const itemCount = groupMap[categoryId]?.length || 0;
      return {
        category,
        categoryId,
        itemCount,
        affinity: affinity[categoryId] || 0,
      };
    })
    .filter((entry) => entry.itemCount > 0)
    .sort((a, b) => {
      if (b.affinity !== a.affinity) return b.affinity - a.affinity;
      return b.itemCount - a.itemCount;
    });

  const rankedWindow = weighted.slice(0, Math.max(limit, CATEGORY_ROTATION_WINDOW));
  return seededShuffle(rankedWindow, (entry) => entry.categoryId, seed).slice(0, limit);
};

export const useHomeRails = (): HomeRailsResult => {
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
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const userInfo = useStore((s: StoreState) => s.userInfo);

  const filteredMovies = useMemo(() => {
    if (!moviesLoaded || !Array.isArray(moviesItems) || moviesItems.length === 0) return [];
    return filterContent(moviesItems as any[]);
  }, [moviesLoaded, moviesItems, filterContent]);

  const filteredSeries = useMemo(() => {
    if (!seriesLoaded || !Array.isArray(seriesItems) || seriesItems.length === 0) return [];
    return filterContent(seriesItems as any[]);
  }, [seriesLoaded, seriesItems, filterContent]);

  const heroSeed = activeProfileId || userInfo?.username || 'default';
  const daySeed = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const railSeedBase = `${heroSeed}:${daySeed}`;

  const heroCarousel = useHeroCarousel(filteredMovies, filteredSeries, heroSeed, 12, 15000);
  const preparedHeroId = getPreparedHomeHeroId();
  const preparedHero = useMemo(() => {
    if (!preparedHeroId) return null;
    return getHeroCandidates(filteredMovies, filteredSeries, {
      seedKey: heroSeed,
      maxCandidates: 30,
    }).find((item) => item.id === preparedHeroId) ?? null;
  }, [filteredMovies, filteredSeries, heroSeed, preparedHeroId]);
  const heroCurrent = preparedHero ?? heroCarousel.current;

  const hero = useMemo(() => {
    if (!heroCurrent) return null;
    return {
      id: heroCurrent.id,
      title: heroCurrent.title,
      description: heroCurrent.description,
      backdrop: heroCurrent.backdrop || '',
      rating: heroCurrent.rating,
      tags: heroCurrent.tags || [],
      type: heroCurrent.type,
      data: heroCurrent.data,
    };
  }, [heroCurrent]);

  const continueWatching = useMemo(() => {
    if (!history) return [];
    return getContinueWatching(10);
  }, [getContinueWatching, history]);

  const affinity = useMemo(() => buildCategoryAffinity(history), [history]);

  const rails = useMemo(() => {
    const resolved: ResolvedRail[] = [];
    const usedIds = new Set<string>();

    const content = {
      live: { loaded: liveLoaded, items: liveItems || [] },
      movies: { loaded: moviesLoaded, categories: moviesCategories || [] },
      series: { loaded: seriesLoaded, categories: seriesCategories || [] },
    };

    const livePool = liveLoaded
      ? seededShuffle(content.live.items, (item: any) => String(item.stream_id || ''), `home:live:${railSeedBase}`)
      : [];
    const moviePool = moviesLoaded
      ? seededShuffle(filteredMovies, (item: any) => String(item.stream_id || ''), `home:movies:${railSeedBase}`)
      : [];
    const seriesPool = seriesLoaded
      ? seededShuffle(filteredSeries, (item: any) => String(item.series_id || ''), `home:series:${railSeedBase}`)
      : [];

    for (const config of TV_HOME_RAILS) {
      if (!config.enabled) continue;

      switch (config.type) {
        case 'live_now': {
          if (!content.live.loaded || livePool.length === 0) break;

          const candidates = prepareRankedCandidates(
            livePool,
            config.maxItems,
            (channel: any) => (affinity.live[getCategoryId(channel)] || 0) * 10 + Math.max(1, toInt(channel.num) || 0),
            (channel: any) => String(channel.stream_id || ''),
            `home:live-now:${railSeedBase}`
          );
          const items = collectUniqueItems(
            candidates,
            config.maxItems,
            usedIds,
            (channel) => getIdentity('live', channel),
            mapLiveItem
          );
          if (items.length > 0) {
            resolved.push({ id: config.id, title: config.title, type: config.type, zone: config.zone, items });
          }
          break;
        }

        case 'trending_movies': {
          if (!content.movies.loaded || moviePool.length === 0) break;

          const candidates = prepareRankedCandidates(
            moviePool,
            config.maxItems,
            (movie: any) => getTimestampScore(movie.added) + (affinity.movie[getCategoryId(movie)] || 0) * 1000,
            (movie: any) => String(movie.stream_id || ''),
            `home:trending-movies:${railSeedBase}`
          );
          const items = collectUniqueItems(
            candidates,
            config.maxItems,
            usedIds,
            (movie) => getIdentity('movie', movie),
            mapMovieItem
          );
          if (items.length > 0) {
            resolved.push({ id: config.id, title: config.title, type: config.type, zone: config.zone, items });
          }
          break;
        }

        case 'trending_series': {
          if (!content.series.loaded || seriesPool.length === 0) break;

          const candidates = prepareRankedCandidates(
            seriesPool,
            config.maxItems,
            (series: any) => getTimestampScore(series.last_modified) + (affinity.series[getCategoryId(series)] || 0) * 1000,
            (series: any) => String(series.series_id || ''),
            `home:trending-series:${railSeedBase}`
          );
          const items = collectUniqueItems(
            candidates,
            config.maxItems,
            usedIds,
            (series) => getIdentity('series', series),
            mapSeriesItem
          );
          if (items.length > 0) {
            resolved.push({ id: config.id, title: config.title, type: config.type, zone: config.zone, items });
          }
          break;
        }

        case 'top_rated': {
          if (!content.movies.loaded || moviePool.length === 0) break;

          const candidates = prepareRankedCandidates(
            moviePool,
            config.maxItems,
            (movie: any) => Number(movie.rating_5based || 0) * 1000 + (affinity.movie[getCategoryId(movie)] || 0) * 200,
            (movie: any) => String(movie.stream_id || ''),
            `home:top-rated:${railSeedBase}`
          );
          const items = collectUniqueItems(
            candidates,
            config.maxItems,
            usedIds,
            (movie) => getIdentity('movie', movie),
            mapMovieItem
          );
          if (items.length > 0) {
            resolved.push({ id: config.id, title: config.title, type: config.type, zone: config.zone, items });
          }
          break;
        }

        case 'movie_category': {
          if (!content.movies.loaded || !Array.isArray(content.movies.categories) || moviePool.length === 0) break;

          const groupMap: Record<string, any[]> = Object.create(null);
          for (const movie of moviePool) {
            const catId = getCategoryId(movie);
            if (!catId) continue;
            (groupMap[catId] ||= []).push(movie);
          }

          const chosenCategories = chooseCategoryOrder(
            content.movies.categories,
            groupMap,
            affinity.movie,
            MAX_HOME_MOVIE_CATEGORIES,
            `home:movie-categories:${railSeedBase}`
          );

          for (const entry of chosenCategories) {
            const categoryId = entry.categoryId;
            const categoryItems = seededShuffle(
              groupMap[categoryId] || [],
              (movie: any) => String(movie.stream_id || ''),
              `home:movie-category-items:${categoryId}:${railSeedBase}`
            );
            const items = collectUniqueItems(
              categoryItems,
              config.maxItems,
              usedIds,
              (movie) => getIdentity('movie', movie),
              mapMovieItem
            );

            if (items.length > 0) {
              resolved.push({
                id: `movie-cat-${categoryId}`,
                title: entry.category.category_name,
                type: 'movie_category',
                zone: config.zone,
                items,
              });
            }
          }
          break;
        }

        case 'series_category': {
          if (!content.series.loaded || !Array.isArray(content.series.categories) || seriesPool.length === 0) break;

          const groupMap: Record<string, any[]> = Object.create(null);
          for (const series of seriesPool) {
            const catId = getCategoryId(series);
            if (!catId) continue;
            (groupMap[catId] ||= []).push(series);
          }

          const chosenCategories = chooseCategoryOrder(
            content.series.categories,
            groupMap,
            affinity.series,
            MAX_HOME_SERIES_CATEGORIES,
            `home:series-categories:${railSeedBase}`
          );

          for (const entry of chosenCategories) {
            const categoryId = entry.categoryId;
            const categoryItems = seededShuffle(
              groupMap[categoryId] || [],
              (series: any) => String(series.series_id || ''),
              `home:series-category-items:${categoryId}:${railSeedBase}`
            );
            const items = collectUniqueItems(
              categoryItems,
              config.maxItems,
              usedIds,
              (series) => getIdentity('series', series),
              mapSeriesItem
            );

            if (items.length > 0) {
              resolved.push({
                id: `series-cat-${categoryId}`,
                title: entry.category.category_name,
                type: 'series_category',
                zone: config.zone,
                items,
              });
            }
          }
          break;
        }

        case 'continue_watching':
        case 'hero':
        default:
          break;
      }
    }

    return resolved;
  }, [
    affinity.live,
    affinity.movie,
    affinity.series,
    filteredMovies,
    filteredSeries,
    liveItems,
    liveLoaded,
    moviesCategories,
    moviesLoaded,
    railSeedBase,
    seriesCategories,
    seriesLoaded,
  ]);

  const isLoading = !moviesLoaded || !seriesLoaded;

  return { rails, continueWatching, hero, isLoading };
};

export default useHomeRails;
