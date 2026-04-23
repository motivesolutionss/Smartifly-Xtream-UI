/**
 * Content Store (Performance Split)
 *
 * Holds heavy content cache + prefetch logic to reduce global re-renders.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import XtreamAPI, {
    XtreamCategory,
    XtreamLiveStream,
    XtreamMovie,
    XtreamSeries,
} from '../api/xtream';
import config, { logger } from '../config';
import { buildSafeAppError, inferErrorCategory } from '../utils/errorHandling';

// =============================================================================
// TYPES
// =============================================================================

export interface ContentDomain<T> {
    categories: XtreamCategory[];
    items: T[];
    loaded: boolean;
}

export interface CachedContent {
    live: ContentDomain<XtreamLiveStream>;
    movies: ContentDomain<XtreamMovie>;
    series: ContentDomain<XtreamSeries>;
    lastFetchTime: number;
}

export interface SearchIndexEntry<T> {
    nameLower: string;
    item: T;
}

export interface SearchIndex {
    live: SearchIndexEntry<XtreamLiveStream>[];
    movies: SearchIndexEntry<XtreamMovie>[];
    series: SearchIndexEntry<XtreamSeries>[];
}

export type CategoryIndex<T> = Map<string, T[]>;

export interface CategoryIndexMap {
    live: CategoryIndex<XtreamLiveStream>;
    movies: CategoryIndex<XtreamMovie>;
    series: CategoryIndex<XtreamSeries>;
}

export interface ContentPartialFlags {
    live: boolean;
    movies: boolean;
    series: boolean;
}

export interface PrefetchProgress {
    current: number;
    total: number;
    currentTask: string;
}

export interface AppError {
    code: string;
    message: string;
    category: 'network' | 'auth' | 'data' | 'unknown';
    timestamp: number;
    retryable: boolean;
    suggestion?: string;
}

interface ContentCachePayload {
    version: number;
    timestamp: number;
    content: CachedContent;
    partial: ContentPartialFlags;
}

interface ContentState {
    credentials: {
        serverUrl: string;
        username: string;
        password: string;
    } | null;

    content: CachedContent;
    searchIndex: SearchIndex;
    categoryIndex: CategoryIndexMap;
    contentPartial: ContentPartialFlags;
    fullContentLoading: ContentPartialFlags;
    contentCacheLoaded: boolean;

    isPrefetching: boolean;
    prefetchProgress: PrefetchProgress;
    error: AppError | null;

    retryCount: number;
    maxRetries: number;
    isRetrying: boolean;

    isOffline: boolean;
    isConnected: boolean;
    connectionType: string | null;

    cacheMaxAge: number;
}

interface ContentActions {
    setCredentials: (credentials: ContentState['credentials']) => void;
    clearCredentials: () => void;
    resetForLogin: (clearPersisted: boolean) => void;

    prefetchAllContent: () => Promise<boolean>;
    refreshCacheIfNeeded: () => Promise<void>;
    forceRefresh: () => Promise<boolean>;
    loadContentCache: () => Promise<void>;
    ensureFullContent: (domain: 'live' | 'movies' | 'series') => Promise<void>;
    clearContentCache: () => void;

    getXtreamAPI: () => XtreamAPI | null;
    getContentStats: () => { live: number; movies: number; series: number };
    getContentReady: () => boolean;
    isCacheStale: () => boolean;
    isCacheValid: () => boolean;

    setNetworkState: (isConnected: boolean, connectionType: string | null) => void;

    getLiveStreamsByCategory: (categoryId: string) => XtreamLiveStream[];
    getMoviesByCategory: (categoryId: string) => XtreamMovie[];
    getSeriesByCategory: (categoryId: string) => XtreamSeries[];
    searchContent: (query: string) => {
        live: XtreamLiveStream[];
        movies: XtreamMovie[];
        series: XtreamSeries[];
    };
    searchContentLimited: (
        query: string,
        limits?: { live?: number; movies?: number; series?: number }
    ) => {
        live: XtreamLiveStream[];
        movies: XtreamMovie[];
        series: XtreamSeries[];
    };

    prefetchDetail: (type: 'movie' | 'series', id: string | number) => Promise<void>;
    clearError: () => void;
    resetContentState: (options?: { keepCacheLoaded?: boolean }) => void;
    createError: (code: string, message: string, category: AppError['category'], retryable: boolean, suggestion?: string) => AppError;
}

type ContentStore = ContentState & ContentActions;

// =============================================================================
// CONSTANTS
// =============================================================================

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const CONTENT_CACHE_KEY = 'smartifly-content-cache-v1';
const CONTENT_CACHE_VERSION = 1;
const SEARCH_INDEX_CHUNK_SIZE = 1200;
const REFRESH_CHECK_DEBOUNCE_MS = 1500;

const initialContent: CachedContent = {
    live: { categories: [], items: [], loaded: false },
    movies: { categories: [], items: [], loaded: false },
    series: { categories: [], items: [], loaded: false },
    lastFetchTime: 0,
};

const initialSearchIndex: SearchIndex = {
    live: [],
    movies: [],
    series: [],
};

const initialCategoryIndex: CategoryIndexMap = {
    live: new Map(),
    movies: new Map(),
    series: new Map(),
};

const initialContentPartial: ContentPartialFlags = {
    live: false,
    movies: false,
    series: false,
};

const initialFullContentLoading: ContentPartialFlags = {
    live: false,
    movies: false,
    series: false,
};

const initialPrefetchProgress: PrefetchProgress = {
    current: 0,
    total: 6,
    currentTask: '',
};

let cachedApi: { key: string; instance: XtreamAPI } | null = null;
let cachedContentStorage: MMKV | null = null;
let mmkvUnavailableLogged = false;
let refreshCheckInFlight: Promise<void> | null = null;
let lastRefreshCheckAt = 0;

// =============================================================================
// CONTENT CACHE HELPERS
// =============================================================================

const estimateBytes = (value: string): number => value.length * 2;

const isJsiAvailable = (): boolean => {
    return typeof (globalThis as any)?.nativeCallSyncHook === 'function';
};

const getContentCacheStorage = (): MMKV | null => {
    if (!config.cache.persistent.enabled) return null;
    if (!isJsiAvailable()) {
        if (!mmkvUnavailableLogged) {
            mmkvUnavailableLogged = true;
            logger.warn('Content cache: MMKV unavailable (JSI not enabled). Falling back to memory only.');
        }
        return null;
    }
    if (cachedContentStorage) return cachedContentStorage;
    try {
        cachedContentStorage = new MMKV({ id: 'smartifly-content-cache' });
        return cachedContentStorage;
    } catch (error) {
        if (!mmkvUnavailableLogged) {
            mmkvUnavailableLogged = true;
            logger.warn('Content cache: MMKV init failed. Falling back to memory only.', error);
        }
        return null;
    }
};

const trimContentForCache = (
    content: CachedContent,
    maxItemsPerDomain: number
): { content: CachedContent; partial: ContentPartialFlags } => {
    const liveItems = content.live.items.slice(0, maxItemsPerDomain);
    const movieItems = content.movies.items.slice(0, maxItemsPerDomain);
    const seriesItems = content.series.items.slice(0, maxItemsPerDomain);

    const partial: ContentPartialFlags = {
        live: content.live.items.length > liveItems.length,
        movies: content.movies.items.length > movieItems.length,
        series: content.series.items.length > seriesItems.length,
    };

    return {
        partial,
        content: {
            ...content,
            live: { ...content.live, items: liveItems },
            movies: { ...content.movies, items: movieItems },
            series: { ...content.series, items: seriesItems },
        },
    };
};

const serializeContentCache = (payload: ContentCachePayload): { data: string; bytes: number } | null => {
    try {
        const json = JSON.stringify(payload);
        const compressed = compressToUTF16(json);
        return { data: compressed, bytes: estimateBytes(compressed) };
    } catch (error) {
        logger.error('Content cache: failed to serialize', error);
        return null;
    }
};

const deserializeContentCache = (raw: string): ContentCachePayload | null => {
    try {
        const json = decompressFromUTF16(raw);
        if (!json) return null;
        return JSON.parse(json) as ContentCachePayload;
    } catch (error) {
        logger.error('Content cache: failed to deserialize', error);
        return null;
    }
};

const buildSearchIndexChunked = <T extends { name?: string }>(
    items: T[],
    onComplete: (index: SearchIndexEntry<T>[]) => void
) => {
    const result: SearchIndexEntry<T>[] = new Array(items.length);
    let cursor = 0;

    const run = () => {
        const end = Math.min(cursor + SEARCH_INDEX_CHUNK_SIZE, items.length);
        for (; cursor < end; cursor += 1) {
            const item = items[cursor];
            result[cursor] = {
                nameLower: String(item?.name || '').toLowerCase(),
                item,
            };
        }

        if (cursor < items.length) {
            setTimeout(run, 0);
            return;
        }

        onComplete(result.filter(Boolean));
    };

    run();
};

const buildCategoryIndex = <T extends { category_id?: string | number }>(
    items: T[]
): Map<string, T[]> => {
    const index = new Map<string, T[]>();
    for (const item of items) {
        const categoryId = item?.category_id != null ? String(item.category_id) : 'uncategorized';
        const bucket = index.get(categoryId);
        if (bucket) {
            bucket.push(item);
        } else {
            index.set(categoryId, [item]);
        }
    }
    return index;
};

const readContentCache = (): ContentCachePayload | null => {
    const storage = getContentCacheStorage();
    if (!storage) return null;
    const raw = storage.getString(CONTENT_CACHE_KEY);
    if (!raw) return null;
    const payload = deserializeContentCache(raw);
    if (!payload || payload.version !== CONTENT_CACHE_VERSION) return null;
    return payload;
};

const persistContentCacheToDisk = (content: CachedContent, partial: ContentPartialFlags) => {
    const storage = getContentCacheStorage();
    if (!storage) return;

    const maxItems = config.cache.persistent.maxItemsPerDomain;
    const maxBytes = config.cache.persistent.maxBytes;

    let { content: trimmed, partial: trimmedPartial } = trimContentForCache(content, maxItems);
    let payload: ContentCachePayload = {
        version: CONTENT_CACHE_VERSION,
        timestamp: trimmed.lastFetchTime || Date.now(),
        content: trimmed,
        partial: {
            live: partial.live || trimmedPartial.live,
            movies: partial.movies || trimmedPartial.movies,
            series: partial.series || trimmedPartial.series,
        },
    };

    let serialized = serializeContentCache(payload);
    if (!serialized) return;

    let limit: number = maxItems;
    while (serialized.bytes > maxBytes && limit > 50) {
        limit = Math.floor(limit * 0.7);
        const next = trimContentForCache(content, limit);
        trimmed = next.content;
        trimmedPartial = next.partial;
        payload = {
            ...payload,
            content: trimmed,
            partial: {
                live: partial.live || trimmedPartial.live,
                movies: partial.movies || trimmedPartial.movies,
                series: partial.series || trimmedPartial.series,
            },
        };
        serialized = serializeContentCache(payload);
        if (!serialized) return;
    }

    if (serialized.bytes > maxBytes) {
        logger.warn('Content cache: payload too large, skipping persist');
        return;
    }

    storage.set(CONTENT_CACHE_KEY, serialized.data);
};

const clearPersistedContentCache = () => {
    const storage = getContentCacheStorage();
    if (!storage) return;
    storage.delete(CONTENT_CACHE_KEY);
};

// =============================================================================
// STORE
// =============================================================================

const useContentStore = create<ContentStore>()((set, get) => ({
    credentials: null,
    content: initialContent,
    searchIndex: initialSearchIndex,
    categoryIndex: initialCategoryIndex,
    contentPartial: initialContentPartial,
    fullContentLoading: initialFullContentLoading,
    contentCacheLoaded: false,

    isPrefetching: false,
    prefetchProgress: initialPrefetchProgress,
    error: null,

    retryCount: 0,
    maxRetries: 3,
    isRetrying: false,

    isOffline: false,
    isConnected: true,
    connectionType: null,

    cacheMaxAge: SIX_HOURS_MS,

    setCredentials: (credentials) => {
        cachedApi = null;
        set({ credentials });
    },

    clearCredentials: () => {
        cachedApi = null;
        set({ credentials: null });
    },

    resetForLogin: (clearPersisted) => {
        cachedApi = null;
        if (clearPersisted) {
            clearPersistedContentCache();
        }
        set({
            content: initialContent,
            searchIndex: initialSearchIndex,
            categoryIndex: initialCategoryIndex,
            contentPartial: initialContentPartial,
            fullContentLoading: initialFullContentLoading,
            isPrefetching: false,
            prefetchProgress: { ...initialPrefetchProgress, currentTask: 'Starting...' },
            error: null,
            retryCount: 0,
            isRetrying: false,
            contentCacheLoaded: false,
        });
    },
    prefetchAllContent: async () => {
        const { credentials, maxRetries, createError, isPrefetching, isRetrying, prefetchProgress } = get();

        if (isPrefetching) {
            // Recover from stale retry-lock state left by previous failed loop.
            if (isRetrying && prefetchProgress.current === 0) {
                logger.warn('prefetchAllContent: recovering from stale retry lock');
                set({ isPrefetching: false });
            } else {
                logger.info('prefetchAllContent: already in progress');
                return true;
            }
        }

        if (!credentials) {
            logger.error('prefetchAllContent: No credentials');
            set({ error: createError('NOT_AUTH', 'Not authenticated', 'auth', false, 'Please login first') });
            return false;
        }

        if (!credentials.serverUrl || credentials.serverUrl.trim() === '') {
            logger.error('prefetchAllContent: Invalid serverUrl in credentials', { credentials });
            set({
                error: createError(
                    'INVALID_CREDENTIALS',
                    'Server URL is missing from credentials',
                    'data',
                    false,
                    'Please logout and login again'
                ),
            });
            return false;
        }

        if (!credentials.username || !credentials.password) {
            logger.error('prefetchAllContent: Missing username or password in credentials');
            set({
                error: createError(
                    'INVALID_CREDENTIALS',
                    'Username or password is missing',
                    'auth',
                    false,
                    'Please logout and login again'
                ),
            });
            return false;
        }

        set({
            isPrefetching: true,
            prefetchProgress: { current: 0, total: 6, currentTask: 'Starting...' },
            error: null,
            searchIndex: initialSearchIndex,
            categoryIndex: initialCategoryIndex,
            contentPartial: initialContentPartial,
        });

        try {
            const api = get().getXtreamAPI();

            if (!api) {
                logger.error('prefetchAllContent: Failed to create API instance');
                throw new Error('API initialization failed - check server URL and credentials');
            }
            api.clearRuntimeCaches?.();

            set({ prefetchProgress: { current: 1, total: 6, currentTask: 'Loading categories...' } });

            const [liveCategoriesResult, vodCategoriesResult, seriesCategoriesResult] = await Promise.allSettled([
                api.getLiveCategories(),
                api.getVodCategories(),
                api.getSeriesCategories(),
            ]);

            const liveCategories = liveCategoriesResult.status === 'fulfilled'
                ? (Array.isArray(liveCategoriesResult.value) ? liveCategoriesResult.value : [])
                : [];
            const vodCategories = vodCategoriesResult.status === 'fulfilled'
                ? (Array.isArray(vodCategoriesResult.value) ? vodCategoriesResult.value : [])
                : [];
            const seriesCategories = seriesCategoriesResult.status === 'fulfilled'
                ? (Array.isArray(seriesCategoriesResult.value) ? seriesCategoriesResult.value : [])
                : [];

            logger.debug('Categories loaded', {
                liveCategories: liveCategories.length,
                vodCategories: vodCategories.length,
                seriesCategories: seriesCategories.length,
            });

            set({ prefetchProgress: { current: 3, total: 6, currentTask: 'Loading content...' } });

            logger.info('[Store] fetchContent: started (parallel)');
            const [liveResult, vodResult, seriesResult] = await Promise.allSettled([
                api.getLiveStreams(),
                api.getVodStreams(),
                api.getSeries(),
            ]);

            if (liveResult.status !== 'fulfilled' ||
                vodResult.status !== 'fulfilled' ||
                seriesResult.status !== 'fulfilled') {
                if (liveResult.status === 'rejected') {
                    logger.error('[Store] fetchLiveContent: failed', liveResult.reason);
                }
                if (vodResult.status === 'rejected') {
                    logger.error('[Store] fetchVodContent: failed', vodResult.reason);
                }
                if (seriesResult.status === 'rejected') {
                    logger.error('[Store] fetchSeriesContent: failed', seriesResult.reason);
                }
                throw new Error('One or more content fetches failed');
            }

            const safeLiveStreams = Array.isArray(liveResult.value) ? liveResult.value : [];
            const safeVodStreams = Array.isArray(vodResult.value) ? vodResult.value : [];
            const safeSeriesList = Array.isArray(seriesResult.value) ? seriesResult.value : [];

            const useLightPrefetch = config.cache.prefetchMode === 'light';
            const lightLimit = config.cache.lightPrefetchLimit;

            const liveItems = useLightPrefetch ? safeLiveStreams.slice(0, lightLimit) : safeLiveStreams;
            const movieItems = useLightPrefetch ? safeVodStreams.slice(0, lightLimit) : safeVodStreams;
            const seriesItems = useLightPrefetch ? safeSeriesList.slice(0, lightLimit) : safeSeriesList;

            const partialFlags: ContentPartialFlags = {
                live: useLightPrefetch && safeLiveStreams.length > liveItems.length,
                movies: useLightPrefetch && safeVodStreams.length > movieItems.length,
                series: useLightPrefetch && safeSeriesList.length > seriesItems.length,
            };

            const normalizedLiveCategories = liveCategories.map((cat) => ({
                ...cat,
                category_id: String(cat.category_id),
            }));
            const normalizedVodCategories = vodCategories.map((cat) => ({
                ...cat,
                category_id: String(cat.category_id),
            }));
            const normalizedSeriesCategories = seriesCategories.map((cat) => ({
                ...cat,
                category_id: String(cat.category_id),
            }));

            const normalizedLiveItems = liveItems.map((item) => ({
                ...item,
                category_id: String(item.category_id),
            }));
            const normalizedMovieItems = movieItems.map((item) => ({
                ...item,
                category_id: String(item.category_id),
            }));
            const normalizedSeriesItems = seriesItems.map((item) => ({
                ...item,
                category_id: String(item.category_id),
            }));

            logger.info(`[Store] fetchLiveContent: completed, ${safeLiveStreams.length} channels`);
            logger.info(`[Store] fetchVodContent: completed, ${safeVodStreams.length} movies`);
            logger.info(`[Store] fetchSeriesContent: completed, ${safeSeriesList.length} series`);

            set((state) => ({
                content: {
                    ...state.content,
                    live: {
                        categories: normalizedLiveCategories,
                        items: normalizedLiveItems,
                        loaded: true,
                    },
                },
                categoryIndex: {
                    ...state.categoryIndex,
                    live: buildCategoryIndex(normalizedLiveItems),
                },
                prefetchProgress: { current: 4, total: 6, currentTask: 'Loading movies...' },
            }));

            set((state) => ({
                content: {
                    ...state.content,
                    movies: {
                        categories: normalizedVodCategories,
                        items: normalizedMovieItems,
                        loaded: true,
                    },
                },
                categoryIndex: {
                    ...state.categoryIndex,
                    movies: buildCategoryIndex(normalizedMovieItems),
                },
                prefetchProgress: { current: 5, total: 6, currentTask: 'Loading series...' },
            }));

            set((state) => {
                const updatedContent = {
                    ...state.content,
                    series: {
                        categories: normalizedSeriesCategories,
                        items: normalizedSeriesItems,
                        loaded: true,
                    },
                };

                const allLoaded = updatedContent.live.loaded &&
                    updatedContent.movies.loaded &&
                    updatedContent.series.loaded;

                return {
                    content: {
                        ...updatedContent,
                        lastFetchTime: allLoaded ? Date.now() : state.content.lastFetchTime,
                    },
                    categoryIndex: {
                        ...state.categoryIndex,
                        series: buildCategoryIndex(normalizedSeriesItems),
                    },
                    contentPartial: partialFlags,
                    isPrefetching: false,
                    prefetchProgress: { current: 6, total: 6, currentTask: 'Complete!' },
                    retryCount: 0,
                    isRetrying: false,
                };
            });

            logger.info(`Prefetch complete: ${safeLiveStreams.length} channels, ${safeVodStreams.length} movies, ${safeSeriesList.length} series`);
            buildSearchIndexChunked(normalizedLiveItems, (index) => {
                set((state) => ({ searchIndex: { ...state.searchIndex, live: index } }));
            });
            buildSearchIndexChunked(normalizedMovieItems, (index) => {
                set((state) => ({ searchIndex: { ...state.searchIndex, movies: index } }));
            });
            buildSearchIndexChunked(normalizedSeriesItems, (index) => {
                set((state) => ({ searchIndex: { ...state.searchIndex, series: index } }));
            });

            persistContentCacheToDisk(get().content, partialFlags);
            return true;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load content after multiple retries';
            const inferredCategory = inferErrorCategory(error, 'network');
            logger.error('Prefetch error', error);

            const currentRetry = get().retryCount;
            const shouldRetry = currentRetry < maxRetries;

            if (shouldRetry) {
                const delay = Math.pow(2, currentRetry) * 1000;

                set({
                    // Important: release in-flight flag so scheduled retry can actually run.
                    isPrefetching: false,
                    isRetrying: true,
                    retryCount: currentRetry + 1,
                    prefetchProgress: {
                        current: 0,
                        total: 6,
                        currentTask: `Retry ${currentRetry + 1}/${maxRetries} in ${delay / 1000}s...`,
                    },
                });

                logger.info(`Retrying prefetch (${currentRetry + 1}/${maxRetries}) after ${delay}ms...`);

                await new Promise<void>((resolve) => setTimeout(resolve, delay));

                return get().prefetchAllContent();
            }

            set({
                isPrefetching: false,
                isRetrying: false,
                error: createError(
                    'PREFETCH_FAILED',
                    errorMessage,
                    inferredCategory,
                    true,
                    'Check your internet connection and try again'
                ),
                prefetchProgress: { current: 0, total: 6, currentTask: 'Failed' },
            });
            return false;
        }
    },
    refreshCacheIfNeeded: async () => {
        const now = Date.now();
        if (refreshCheckInFlight) {
            return refreshCheckInFlight;
        }
        if (now - lastRefreshCheckAt < REFRESH_CHECK_DEBOUNCE_MS) {
            return;
        }
        lastRefreshCheckAt = now;

        refreshCheckInFlight = (async () => {
        const { isCacheStale, forceRefresh, getContentReady } = get();

        if (!getContentReady()) {
            logger.debug('No cache exists, skipping refresh check');
            return;
        }

        if (isCacheStale()) {
            logger.info('Cache is stale, refreshing...');
            await forceRefresh();
        } else {
            logger.debug('Cache is fresh');
        }
        })().finally(() => {
            refreshCheckInFlight = null;
        });

        return refreshCheckInFlight;
    },

    forceRefresh: async () => {
        logger.info('Force refreshing content...');
        return get().prefetchAllContent();
    },

    loadContentCache: async () => {
        if (!config.cache.persistent.enabled) {
            set({ contentCacheLoaded: true });
            return;
        }

        try {
            const payload = readContentCache();
            if (!payload) {
                set({ contentCacheLoaded: true });
                return;
            }

            const cached = payload.content;
            const normalizedContent: CachedContent = {
                ...cached,
                live: {
                    ...cached.live,
                    loaded: cached.live.loaded || cached.live.items.length > 0,
                },
                movies: {
                    ...cached.movies,
                    loaded: cached.movies.loaded || cached.movies.items.length > 0,
                },
                series: {
                    ...cached.series,
                    loaded: cached.series.loaded || cached.series.items.length > 0,
                },
                lastFetchTime: cached.lastFetchTime || payload.timestamp || 0,
            };

            set({
                content: normalizedContent,
                searchIndex: initialSearchIndex,
                categoryIndex: {
                    live: buildCategoryIndex(normalizedContent.live.items),
                    movies: buildCategoryIndex(normalizedContent.movies.items),
                    series: buildCategoryIndex(normalizedContent.series.items),
                },
                contentPartial: payload.partial || initialContentPartial,
                contentCacheLoaded: true,
            });

            buildSearchIndexChunked(normalizedContent.live.items, (index) => {
                set((state) => ({ searchIndex: { ...state.searchIndex, live: index } }));
            });
            buildSearchIndexChunked(normalizedContent.movies.items, (index) => {
                set((state) => ({ searchIndex: { ...state.searchIndex, movies: index } }));
            });
            buildSearchIndexChunked(normalizedContent.series.items, (index) => {
                set((state) => ({ searchIndex: { ...state.searchIndex, series: index } }));
            });
        } catch (error) {
            logger.error('Content cache: load failed', error);
            set({ contentCacheLoaded: true });
        }
    },

    ensureFullContent: async (domain) => {
        const { contentPartial, fullContentLoading } = get();
        if (!contentPartial[domain]) return;
        if (fullContentLoading[domain]) return;

        set((state) => ({
            fullContentLoading: { ...state.fullContentLoading, [domain]: true },
        }));

        try {
            const api = get().getXtreamAPI();
            if (!api) return;

            if (domain === 'live') {
                const liveItems = await api.getLiveStreams();
                const normalizedLiveItems = liveItems.map((item) => ({
                    ...item,
                    category_id: String(item.category_id),
                }));
                set((state) => ({
                    content: {
                        ...state.content,
                        live: {
                            ...state.content.live,
                            items: normalizedLiveItems,
                            loaded: true,
                        },
                        lastFetchTime: Date.now(),
                    },
                    categoryIndex: {
                        ...state.categoryIndex,
                        live: buildCategoryIndex(normalizedLiveItems),
                    },
                    contentPartial: { ...state.contentPartial, live: false },
                }));
                buildSearchIndexChunked(normalizedLiveItems, (index) => {
                    set((state) => ({ searchIndex: { ...state.searchIndex, live: index } }));
                });
            }

            if (domain === 'movies') {
                const movieItems = await api.getVodStreams();
                const normalizedMovieItems = movieItems.map((item) => ({
                    ...item,
                    category_id: String(item.category_id),
                }));
                set((state) => ({
                    content: {
                        ...state.content,
                        movies: {
                            ...state.content.movies,
                            items: normalizedMovieItems,
                            loaded: true,
                        },
                        lastFetchTime: Date.now(),
                    },
                    categoryIndex: {
                        ...state.categoryIndex,
                        movies: buildCategoryIndex(normalizedMovieItems),
                    },
                    contentPartial: { ...state.contentPartial, movies: false },
                }));
                buildSearchIndexChunked(normalizedMovieItems, (index) => {
                    set((state) => ({ searchIndex: { ...state.searchIndex, movies: index } }));
                });
            }

            if (domain === 'series') {
                const seriesItems = await api.getSeries();
                const normalizedSeriesItems = seriesItems.map((item) => ({
                    ...item,
                    category_id: String(item.category_id),
                }));
                set((state) => ({
                    content: {
                        ...state.content,
                        series: {
                            ...state.content.series,
                            items: normalizedSeriesItems,
                            loaded: true,
                        },
                        lastFetchTime: Date.now(),
                    },
                    categoryIndex: {
                        ...state.categoryIndex,
                        series: buildCategoryIndex(normalizedSeriesItems),
                    },
                    contentPartial: { ...state.contentPartial, series: false },
                }));
                buildSearchIndexChunked(normalizedSeriesItems, (index) => {
                    set((state) => ({ searchIndex: { ...state.searchIndex, series: index } }));
                });
            }

            persistContentCacheToDisk(get().content, get().contentPartial);
        } catch (error) {
            logger.error('ensureFullContent failed', error);
        } finally {
            set((state) => ({
                fullContentLoading: { ...state.fullContentLoading, [domain]: false },
            }));
        }
    },

    clearContentCache: () => {
        clearPersistedContentCache();
        set({
            content: initialContent,
            searchIndex: initialSearchIndex,
            categoryIndex: initialCategoryIndex,
            contentPartial: initialContentPartial,
            contentCacheLoaded: true,
        });
    },
    getXtreamAPI: () => {
        const { credentials } = get();

        if (!credentials) {
            logger.error('getXtreamAPI: No credentials found');
            return null;
        }

        if (!credentials.serverUrl || typeof credentials.serverUrl !== 'string' || credentials.serverUrl.trim() === '') {
            logger.error('getXtreamAPI: Invalid serverUrl');
            return null;
        }

        if (!credentials.username || typeof credentials.username !== 'string' || credentials.username.trim() === '') {
            logger.error('getXtreamAPI: Invalid username');
            return null;
        }

        if (!credentials.password) {
            logger.error('getXtreamAPI: Password is missing');
            return null;
        }

        try {
            const key = `${credentials.serverUrl}|${credentials.username}|${credentials.password}`;
            if (cachedApi?.key === key) {
                return cachedApi.instance;
            }

            const instance = new XtreamAPI(
                credentials.serverUrl,
                credentials.username,
                credentials.password
            );
            cachedApi = { key, instance };
            return instance;
        } catch (error) {
            logger.error('getXtreamAPI: Failed to create XtreamAPI instance', error);
            return null;
        }
    },

    getContentStats: () => {
        const { content } = get();
        return {
            live: content.live.items.length,
            movies: content.movies.items.length,
            series: content.series.items.length,
        };
    },

    getContentReady: () => {
        const { content } = get();
        return !!(
            content.live.loaded &&
            content.movies.loaded &&
            content.series.loaded
        );
    },

    isCacheStale: () => {
        const { content, cacheMaxAge } = get();
        if (!content.lastFetchTime) return true;

        const age = Date.now() - content.lastFetchTime;
        return age > cacheMaxAge;
    },

    isCacheValid: () => {
        const { content, isCacheStale, getContentReady } = get();

        if (!getContentReady()) {
            return false;
        }

        const hasContent =
            content.live.items.length > 0 ||
            content.movies.items.length > 0 ||
            content.series.items.length > 0;

        if (!hasContent) {
            logger.warn('Cache marked as ready but no content data found');
            return false;
        }

        if (isCacheStale()) {
            logger.warn('Cache is stale (older than', get().cacheMaxAge / 1000 / 60 / 60, 'hours)');
            return false;
        }

        logger.debug('Cache is valid and fresh');
        return true;
    },

    setNetworkState: (isConnected, connectionType) => {
        const wasOffline = get().isOffline;
        const isNowOffline = !isConnected;

        set({
            isConnected,
            isOffline: isNowOffline,
            connectionType,
        });

        if (wasOffline && !isNowOffline) {
            logger.info('Network reconnected, type:', connectionType);
            const { getContentReady } = get();
            if (getContentReady()) {
                get().refreshCacheIfNeeded();
            }
        } else if (!wasOffline && isNowOffline) {
            logger.info('Network disconnected - Offline mode');
        }
    },

    getLiveStreamsByCategory: (categoryId) => {
        const { content, categoryIndex } = get();
        if (!content.live.loaded) return [];

        const streams = content.live.items;
        if (!categoryId || categoryId === 'all') {
            return streams;
        }

        const key = String(categoryId);
        if (categoryIndex.live.size > 0) {
            return categoryIndex.live.get(key) ?? [];
        }

        return streams.filter((stream) => String(stream.category_id) === key);
    },

    getMoviesByCategory: (categoryId) => {
        const { content, categoryIndex } = get();
        if (!content.movies.loaded) return [];

        const movies = content.movies.items;
        if (!categoryId || categoryId === 'all') {
            return movies;
        }

        const key = String(categoryId);
        if (categoryIndex.movies.size > 0) {
            return categoryIndex.movies.get(key) ?? [];
        }

        return movies.filter((movie) => String(movie.category_id) === key);
    },

    getSeriesByCategory: (categoryId) => {
        const { content, categoryIndex } = get();
        if (!content.series.loaded) return [];

        const series = content.series.items;
        if (!categoryId || categoryId === 'all') {
            return series;
        }

        const key = String(categoryId);
        if (categoryIndex.series.size > 0) {
            return categoryIndex.series.get(key) ?? [];
        }

        return series.filter((s) => String(s.category_id) === key);
    },

    searchContent: (query) => {
        const { content, searchIndex } = get();
        if (!query.trim()) {
            return { live: [], movies: [], series: [] };
        }

        const lowerQuery = query.toLowerCase();

        const searchList = <T extends { name?: string }>(
            index: SearchIndexEntry<T>[],
            items: T[],
            loaded: boolean
        ): T[] => {
            if (!loaded) return [];
            if (index && index.length > 0) {
                return index
                    .filter((entry) => entry.nameLower.includes(lowerQuery))
                    .map((entry) => entry.item);
            }
            return items.filter((item) => String(item?.name || '').toLowerCase().includes(lowerQuery));
        };

        return {
            live: searchList(searchIndex.live, content.live.items, content.live.loaded),
            movies: searchList(searchIndex.movies, content.movies.items, content.movies.loaded),
            series: searchList(searchIndex.series, content.series.items, content.series.loaded),
        };
    },
    searchContentLimited: (query, limits) => {
        const { content, searchIndex } = get();
        if (!query.trim()) {
            return { live: [], movies: [], series: [] };
        }

        const lowerQuery = query.toLowerCase();
        const liveLimit = Math.max(1, limits?.live ?? Number.MAX_SAFE_INTEGER);
        const moviesLimit = Math.max(1, limits?.movies ?? Number.MAX_SAFE_INTEGER);
        const seriesLimit = Math.max(1, limits?.series ?? Number.MAX_SAFE_INTEGER);

        const searchListLimited = <T extends { name?: string }>(
            index: SearchIndexEntry<T>[],
            items: T[],
            loaded: boolean,
            maxMatches: number
        ): T[] => {
            if (!loaded || maxMatches <= 0) return [];

            if (index && index.length > 0) {
                const matches: T[] = [];
                for (const entry of index) {
                    if (!entry.nameLower.includes(lowerQuery)) continue;
                    matches.push(entry.item);
                    if (matches.length >= maxMatches) break;
                }
                return matches;
            }

            const matches: T[] = [];
            for (const item of items) {
                if (!String(item?.name || '').toLowerCase().includes(lowerQuery)) continue;
                matches.push(item);
                if (matches.length >= maxMatches) break;
            }
            return matches;
        };

        return {
            live: searchListLimited(searchIndex.live, content.live.items, content.live.loaded, liveLimit),
            movies: searchListLimited(searchIndex.movies, content.movies.items, content.movies.loaded, moviesLimit),
            series: searchListLimited(searchIndex.series, content.series.items, content.series.loaded, seriesLimit),
        };
    },

    prefetchDetail: async (type, id) => {
        const api = get().getXtreamAPI();
        if (!api) return;
        try {
            if (type === 'movie') {
                await api.getVodInfo(Number(id));
            } else if (type === 'series') {
                await api.getSeriesInfo(Number(id));
            }
        } catch {
            // Silently fail as this is a background optimization
        }
    },

    clearError: () => set({ error: null }),

    resetContentState: (options) => {
        cachedApi = null;
        set({
            content: initialContent,
            searchIndex: initialSearchIndex,
            categoryIndex: initialCategoryIndex,
            contentPartial: initialContentPartial,
            fullContentLoading: initialFullContentLoading,
            isPrefetching: false,
            prefetchProgress: initialPrefetchProgress,
            error: null,
            retryCount: 0,
            isRetrying: false,
            contentCacheLoaded: options?.keepCacheLoaded ? get().contentCacheLoaded : false,
        });
    },

    createError: (code, message, category, retryable, suggestion) => ({
        ...buildSafeAppError({
            code,
            message,
            category,
            retryable,
            suggestion,
        }),
    }),
}));

export default useContentStore;
export { useContentStore };
