import FastImage from '@d11/react-native-fast-image';
import { MMKV } from 'react-native-mmkv';
import { logger } from '../config';
import { getHeroCarousel, HeroPick } from '../utils/heroPicker';
import { markImageWarm, normalizeImageUri } from '../utils/image';

export interface PreparedHeroDetails {
  id: string;
  type: 'movie' | 'series';
  description?: string;
  rating?: number;
  backdrop?: string;
  tags?: string[];
  year?: string;
  preparedAt: number;
}

interface PrepareHeroOptions {
  movies: any[];
  series: any[];
  seedKey: string;
  api: {
    getVodInfo: (id: number) => Promise<any>;
    getSeriesInfo: (id: number) => Promise<any>;
  } | null;
}

const HERO_CACHE_KEY = 'smartifly-tv-prepared-heroes-v1';
const HERO_SELECTION_KEY = 'smartifly-tv-prepared-hero-selection-v1';
const MAX_CACHE_ITEMS = 40;
const BACKGROUND_PREPARE_COUNT = 2;

let memoryCache: Record<string, PreparedHeroDetails> = {};
let memorySelectionId = '';
let heroStorage: MMKV | null = null;
let storageUnavailableLogged = false;

const isJsiAvailable = (): boolean => {
  return typeof (globalThis as any)?.nativeCallSyncHook === 'function';
};

const getStorage = (): MMKV | null => {
  if (!isJsiAvailable()) return null;
  if (heroStorage) return heroStorage;
  try {
    heroStorage = new MMKV({ id: 'smartifly-tv-hero-cache' });
    return heroStorage;
  } catch (error) {
    if (!storageUnavailableLogged) {
      storageUnavailableLogged = true;
      logger.warn('Hero cache: MMKV unavailable, using memory cache only', error);
    }
    return null;
  }
};

const readCache = (): Record<string, PreparedHeroDetails> => {
  const storage = getStorage();
  if (!storage) return memoryCache;

  const raw = storage.getString(HERO_CACHE_KEY);
  if (!raw) return memoryCache;

  try {
    const parsed = JSON.parse(raw) as Record<string, PreparedHeroDetails>;
    memoryCache = parsed || {};
  } catch {
    memoryCache = {};
  }

  return memoryCache;
};

const persistCache = () => {
  const entries = Object.values(memoryCache)
    .sort((a, b) => b.preparedAt - a.preparedAt)
    .slice(0, MAX_CACHE_ITEMS);

  memoryCache = entries.reduce<Record<string, PreparedHeroDetails>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  getStorage()?.set(HERO_CACHE_KEY, JSON.stringify(memoryCache));
};

const persistSelection = (heroId: string) => {
  memorySelectionId = heroId;
  getStorage()?.set(HERO_SELECTION_KEY, heroId);
};

const isUsableUri = (value?: string): boolean => {
  const normalized = normalizeImageUri(value);
  return /^(https?:\/\/|file:\/\/|content:\/\/|data:|asset:)/i.test(normalized);
};

export const optimizeHeroBackdropUri = (value?: string): string | undefined => {
  const normalized = normalizeImageUri(value);
  if (!isUsableUri(normalized)) return undefined;

  return normalized.replace(
    /image\.tmdb\.org\/t\/p\/(?:original|w300|w500|w780|w1280)\//i,
    'image.tmdb.org/t/p/w1280/',
  );
};

const pickBackdrop = (...values: any[]): string | undefined => {
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        const optimized = optimizeHeroBackdropUri(entry);
        if (optimized) return optimized;
      }
      continue;
    }

    const optimized = optimizeHeroBackdropUri(value);
    if (optimized) return optimized;
  }

  return undefined;
};

const splitTags = (genre?: string): string[] =>
  genre ? genre.split(',').map((tag) => tag.trim()).filter(Boolean) : [];

const toYear = (value?: string | number): string | undefined => {
  if (value == null) return undefined;
  const year = String(value).split('-')[0];
  return year.length === 4 ? year : undefined;
};

const parseMovieDetails = (id: string, info: any): PreparedHeroDetails => ({
  id,
  type: 'movie',
  description: info?.info?.plot || info?.movie_data?.plot || info?.plot || info?.description,
  rating: Number.isFinite(Number(info?.info?.rating ?? info?.movie_data?.rating ?? info?.rating))
    ? Number(info?.info?.rating ?? info?.movie_data?.rating ?? info?.rating)
    : undefined,
  backdrop: pickBackdrop(
    info?.info?.backdrop_path,
    info?.movie_data?.backdrop_path,
    info?.movie_data?.backdrop,
    info?.backdrop_path,
    info?.backdrop,
  ),
  tags: splitTags(info?.info?.genre || info?.movie_data?.genre || info?.genre),
  year: toYear(info?.info?.releasedate || info?.movie_data?.releasedate || info?.releasedate),
  preparedAt: Date.now(),
});

const parseSeriesDetails = (id: string, info: any): PreparedHeroDetails => ({
  id,
  type: 'series',
  description: info?.info?.plot,
  rating: Number.isFinite(Number(info?.info?.rating)) ? Number(info.info.rating) : undefined,
  backdrop: pickBackdrop(
    info?.info?.backdrop_path,
    info?.seasons?.[0]?.cover_big,
    info?.info?.cover,
  ),
  tags: splitTags(info?.info?.genre),
  year: toYear(info?.info?.releaseDate),
  preparedAt: Date.now(),
});

const prefetchBackdrop = async (uri?: string) => {
  if (!uri) return;
  try {
    const result = (FastImage.preload as any)([{ uri, priority: FastImage.priority.high }]);
    if (result && typeof result.then === 'function') {
      await result;
    }
    markImageWarm(uri);
  } catch (error) {
    logger.warn('Hero cache: backdrop prefetch failed', { uri, error });
  }
};

const preparePick = async (
  pick: HeroPick,
  api: PrepareHeroOptions['api'],
): Promise<PreparedHeroDetails | null> => {
  const cache = readCache();
  const cached = cache[pick.id];
  if (cached?.backdrop) {
    await prefetchBackdrop(cached.backdrop);
    return cached;
  }

  if (!api) return cached ?? null;

  try {
    let details: PreparedHeroDetails | null = null;

    if (pick.type === 'movie') {
      const streamId = Number(pick.data?.stream_id);
      if (!Number.isFinite(streamId) || streamId <= 0) return cached ?? null;
      details = parseMovieDetails(pick.id, await api.getVodInfo(streamId));
    } else {
      const seriesId = Number(pick.data?.series_id);
      if (!Number.isFinite(seriesId) || seriesId <= 0) return cached ?? null;
      details = parseSeriesDetails(pick.id, await api.getSeriesInfo(seriesId));
    }

    if (!details.backdrop) {
      details.backdrop = optimizeHeroBackdropUri(pick.backdrop);
    }

    cache[pick.id] = details;
    memoryCache = cache;
    persistCache();
    await prefetchBackdrop(details.backdrop);
    return details;
  } catch (error) {
    logger.warn('Hero cache: detail preparation failed', { id: pick.id, error });
    return cached ?? null;
  }
};

export const getCachedHeroDetails = (heroId?: string): PreparedHeroDetails | null => {
  if (!heroId) return null;
  return readCache()[heroId] ?? null;
};

export const getPreparedHomeHeroId = (): string | null => {
  const stored = getStorage()?.getString(HERO_SELECTION_KEY);
  return stored || memorySelectionId || null;
};

export const prepareHomeHero = async ({
  movies,
  series,
  seedKey,
  api,
}: PrepareHeroOptions): Promise<PreparedHeroDetails | null> => {
  const carousel = getHeroCarousel(movies, series, {
    seedKey,
    intervalMs: 15000,
    pickPoolSize: 8,
  });

  const current = carousel.current;
  if (!current) return null;

  const orderedPicks = [
    current,
    ...carousel.items.filter((item) => item.id !== current.id),
  ];

  let prepared: PreparedHeroDetails | null = null;
  let selectedPick: HeroPick | null = null;

  for (const pick of orderedPicks) {
    const details = await preparePick(pick, api);
    if (!prepared) {
      prepared = details;
      selectedPick = pick;
    }
    if (details?.backdrop) {
      prepared = details;
      selectedPick = pick;
      break;
    }
  }

  if (selectedPick && prepared) {
    persistSelection(selectedPick.id);
  }

  const backgroundPicks = carousel.items
    .filter((item) => item.id !== selectedPick?.id)
    .slice(0, BACKGROUND_PREPARE_COUNT);

  backgroundPicks.forEach((pick) => {
    preparePick(pick, api).catch(() => undefined);
  });

  return prepared;
};
