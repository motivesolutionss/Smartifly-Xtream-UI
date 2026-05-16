/**
 * Smartifly Home Screen
 * 
 * Uses PREFETCHED data from store - NO loading after login!
 * - Hero banner with featured content
 * - Continue watching
 * - Categories with horizontal scroll
 * - Recently added content
 * - Uses domain.loaded flags for proper data access
 */

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    Text,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import NavBar from '../../../components/NavBar';
import HeroBanner, { HeroBannerItem } from './components/HeroBanner';
import ContentRow, { RowType } from './components/ContentRow';
import { ContentItem } from './components/ContentCard';

// Store - Using prefetched data!
import useAuthStore from '../../../store/authStore';
import useContentStore from '../../../store/contentStore';
import useAppStatusStore from '../../../store/appStatusStore';
import useFilterStore, { ContentType } from '../../../store/filterStore';
import { useWatchHistoryStore, WatchProgress } from '../../../store/watchHistoryStore';
import { estimateRatingFromStars, useProfileStore } from '../../../store/profileStore';
import useOfflineQueueStore from '../../../store/offlineQueueStore';
import { prefetchImages } from '../../../utils/image';
import { usePerfProfile } from '../../../utils/perf';
import { useHeroCarousel } from '../../../utils/heroPicker';
import {
    ENABLE_HOME_IMAGE_VERIFICATION_V1,
    ENABLE_HOME_HERO_DETAIL_IMAGE_CHAIN_V1,
    ENABLE_HOME_HERO_DETAIL_PREFETCH_V1,
    ENABLE_HOME_HTTPS_ONLY_IMAGES,
    ENABLE_HOME_HTTPS_RAIL_BACKFILL,
    ENABLE_HOME_VISIBLE_DETAIL_PREFETCH_V1,
    ENABLE_HOME_LEAN_RAILS,
    ENABLE_MOVIE_DETAIL_ROUTE_IMAGE_ENRICHMENT_V1,
} from '../../../playerFlags';
import {
    getHomeImageVerificationStatus,
    markHomeImageVerifiedFailed,
    markHomeImageVerifiedOk,
    shouldAllowHomeImageUri,
    verifyHomeImageUri,
} from '../../../services/homeImageVerification';
import {
    getMovieDetailBackdropCandidates,
    getSeriesDetailBackdropCandidates,
} from '../../../utils/detailImages';
import {
    getPersistedDetailBackdropOverride,
    getPersistedHomeImageOverrides,
    setPersistedHomeImageOverride,
} from '../../../services/persistedImageState';

// Theme and Config
import { colors, spacing, Icon } from '../../../theme';
import { logger } from '../../../config';

// =============================================================================
// TYPES
// =============================================================================

interface HomeScreenProps {
    navigation: any;
}

type FeaturedContent = HeroBannerItem & {
    data: any;
    plot?: string;
    genre?: string;
};

type CategoryRail = {
    id: string;
    name: string;
    items: ContentItem[];
};

type HomeSection =
    | {
        key: string;
        type: 'hero';
        item: FeaturedContent;
    }
    | {
        key: string;
        type: 'row';
        title: string;
        rowType: RowType;
        items: ContentItem[];
        onSeeAllPress?: () => void;
        onItemPress?: (item: ContentItem) => void;
        showSeeAll?: boolean;
        accentColor?: string;
    }
    | {
        key: string;
        type: 'stats';
        stats: { live: number; movies: number; series: number };
    }
    | {
        key: string;
        type: 'quickActions';
        actions: QuickAction[];
        isConnected: boolean;
        lastUpdatedLabel: string;
    };

type QuickAction = {
    id: 'refresh' | 'live' | 'movies' | 'series' | 'favorites' | 'announcements';
    label: string;
    icon: string;
    color: string;
    onPress: () => void;
};

const RAIL_ITEM_LIMIT = 15;
const PREFETCH_ITEMS_PER_ROW = 6;
const MAIN_TAB_BOTTOM_SPACER = 112;
const QUICK_ACTION_COLUMNS = 3;
const QUICK_ACTION_GRID_GAP = spacing.sm;
// Keep Home content selection consistent across devices.
// Performance tuning should affect rendering/prefetch, not which rails exist.
const HOME_POOL_LIMITS = {
    media: 360,
    live: 260,
} as const;
const HOME_CATEGORY_RAIL_LIMIT = 4;
const HOME_VISIBLE_DETAIL_PREFETCH_CONCURRENCY = 2;

const resolveMovieImage = (movie: any): string => String(
    movie?.stream_icon ||
    movie?.movie_image ||
    movie?.cover_big ||
    movie?.cover ||
    movie?.backdrop_path?.[0] ||
    ''
);

const resolveSeriesImage = (series: any): string => String(
    series?.cover ||
    series?.cover_big ||
    series?.backdrop_path?.[0] ||
    ''
);

const resolveImageFromDetailInfo = (info: any): string => String(
    info?.cover_big ||
    info?.movie_image ||
    info?.cover ||
    info?.backdrop_path?.[0] ||
    ''
);

const hasHomeImage = (value?: string | null): boolean => {
    if (!value) return false;
    return String(value).trim().length > 0;
};

const isHttpsImage = (value?: string | null): boolean => {
    if (!value) return false;
    return String(value).trim().toLowerCase().startsWith('https://');
};

const resolveFirstHttpsImage = (...candidates: Array<string | undefined | null>): string => {
    for (const candidate of candidates) {
        const normalized = String(candidate || '').trim();
        if (isHttpsImage(normalized)) {
            return normalized;
        }
    }
    return '';
};

const takeTopN = <T,>(
    source: T[],
    limit: number,
    compare: (a: T, b: T) => number
): T[] => {
    if (source.length <= limit) {
        return [...source].sort(compare);
    }

    const result: T[] = [];
    for (const item of source) {
        if (result.length === 0) {
            result.push(item);
            continue;
        }

        let insertAt = result.findIndex((entry) => compare(item, entry) < 0);
        if (insertAt === -1) {
            insertAt = result.length;
        }

        if (insertAt < limit) {
            result.splice(insertAt, 0, item);
            if (result.length > limit) {
                result.pop();
            }
        } else if (result.length < limit) {
            result.push(item);
        }
    }

    return result;
};

// =============================================================================
// HOME SCREEN COMPONENT
// =============================================================================

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { width: viewportWidth } = useWindowDimensions();

    // Get PREFETCHED content from store - uses new domain structure
    const liveLoaded = useContentStore((state) => state.content.live.loaded);
    const liveItems = useContentStore((state) => state.content.live.items);
    const liveCategories = useContentStore((state) => state.content.live.categories);
    const moviesLoaded = useContentStore((state) => state.content.movies.loaded);
    const moviesItems = useContentStore((state) => state.content.movies.items);
    const movieCategories = useContentStore((state) => state.content.movies.categories);
    const seriesLoaded = useContentStore((state) => state.content.series.loaded);
    const seriesItems = useContentStore((state) => state.content.series.items);
    const seriesCategories = useContentStore((state) => state.content.series.categories);
    const lastFetchTime = useContentStore((state) => state.content.lastFetchTime);
    const userInfo = useAuthStore((state) => state.userInfo);
    const getXtreamAPI = useContentStore((state) => state.getXtreamAPI);
    const prefetchDetail = useContentStore((state) => state.prefetchDetail);
    const forceRefresh = useContentStore((state) => state.forceRefresh);
    const isConnected = useContentStore((state) => state.isConnected);
    const fetchAnnouncements = useAppStatusStore((state) => state.fetchAnnouncements);
    const watchHistory = useWatchHistoryStore((state) => state.history);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const activeProfileName = useProfileStore((state) => {
        if (!state.activeProfileId) return null;
        const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId);
        return activeProfile?.name || null;
    });
    const isKidsProfile = useProfileStore((state) => {
        if (!state.activeProfileId) return false;
        const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId);
        return activeProfile?.isKidsProfile ?? false;
    });
    const isContentAllowed = useProfileStore((state) => state.isContentAllowed);
    const perf = usePerfProfile();
    const enqueueOfflineAction = useOfflineQueueStore((state) => state.enqueueAction);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [imageVerificationVersion, setImageVerificationVersion] = useState(0);
    const [homeImageOverrides, setHomeImageOverrides] = useState<Record<string, string>>(() => getPersistedHomeImageOverrides());
    const imageRescueInFlightRef = useRef<Set<string>>(new Set());
    const imageRescueResolvedRef = useRef<Set<string>>(new Set());
    const imageVerificationInFlightRef = useRef<Set<string>>(new Set());
    const visibleDetailPrefetchQueuedRef = useRef<Set<string>>(new Set());
    const visibleDetailPrefetchDoneRef = useRef<Set<string>>(new Set());
    const visibleDetailPrefetchInFlightRef = useRef(0);
    const visibleDetailPrefetchQueueRef = useRef<Array<{ type: 'movie' | 'series'; id: string | number }>>([]);
    const heroDetailPrefetchDoneRef = useRef<Set<string>>(new Set());
    const homePoolLimits = HOME_POOL_LIMITS;
    const maxCategoryRailsPerDomain = HOME_CATEGORY_RAIL_LIMIT;

    const filterContent = useCallback(<T extends { rating?: string; rating_5based?: number }>(
        items: T[]
    ): T[] => {
        if (!activeProfileId) return items;

        return items.filter((item) => {
            if (item.rating) {
                return isContentAllowed(item.rating);
            }
            if (item.rating_5based !== undefined) {
                return isContentAllowed(estimateRatingFromStars(item.rating_5based));
            }
            return !isKidsProfile;
        });
    }, [activeProfileId, isContentAllowed, isKidsProfile]);

    // Local state
    const stats = useMemo(() => ({
        live: liveItems.length,
        movies: moviesItems.length,
        series: seriesItems.length,
    }), [liveItems.length, moviesItems.length, seriesItems.length]);

    const isHomeImageAllowed = useCallback((uri?: string | null) => {
        if (!hasHomeImage(uri)) return false;
        if (!ENABLE_HOME_IMAGE_VERIFICATION_V1) return true;
        return shouldAllowHomeImageUri(uri);
    }, []);

    const continueWatching = useMemo<WatchProgress[]>(() => {
        const profileId = activeProfileId || 'default';
        return Object.values(watchHistory)
            .filter((item) => item.id.startsWith(profileId))
            .filter((item) => !item.completed && item.progress > 0)
            .sort((a, b) => b.lastWatched - a.lastWatched)
            .slice(0, 10);
    }, [activeProfileId, watchHistory]);

    const continueWatchingById = useMemo(() => {
        const map = new Map<string, WatchProgress>();
        for (const item of continueWatching) {
            map.set(item.id, item);
        }
        return map;
    }, [continueWatching]);

    const continueRowItems = useMemo<ContentItem[]>(() => (
        continueWatching
            .map((progress) => ({
                id: progress.id,
                name: progress.title,
                image: ENABLE_HOME_HTTPS_ONLY_IMAGES
                    ? resolveFirstHttpsImage(progress.thumbnail)
                    : progress.thumbnail,
                type: progress.type === 'movie'
                    ? 'movie'
                    : progress.type === 'series'
                        ? 'series'
                        : 'live',
                progress: progress.progress,
            }))
            .filter((item) => !ENABLE_HOME_HTTPS_ONLY_IMAGES || isHomeImageAllowed(item.image))
    ), [continueWatching, isHomeImageAllowed]);

    const watchedMovieIds = useMemo(() => (
        new Set(
            continueWatching
                .filter((entry) => entry.type === 'movie')
                .map((entry) => String(entry.streamId))
        )
    ), [continueWatching]);

    const watchedSeriesIds = useMemo(() => (
        new Set(
            continueWatching
                .filter((entry) => entry.type === 'series')
                .map((entry) => String(entry.streamId))
        )
    ), [continueWatching]);

    const homeHeaderName = useMemo(() => {
        const fromProfile = activeProfileName?.trim();
        if (fromProfile) return fromProfile;
        const fromUser = userInfo?.username?.trim();
        if (fromUser) return fromUser;
        return 'Guest';
    }, [activeProfileName, userInfo?.username]);

    // Get filter state
    const { selectedType, selectedCategory, setCategory } = useFilterStore();

    // Determine which content sections to show based on filter
    const showLive = !selectedType || selectedType === 'live';
    const showMovies = !selectedType || selectedType === 'movies';
    const showSeries = !selectedType || selectedType === 'series';

    const selectedLiveCategoryId = selectedCategory.live;
    const selectedMovieCategoryId = selectedCategory.movies;
    const selectedSeriesCategoryId = selectedCategory.series;

    const filteredMovies = useMemo(() => {
        if (!moviesLoaded) return [];
        return filterContent(moviesItems.slice(0, homePoolLimits.media));
    }, [moviesItems, moviesLoaded, filterContent, homePoolLimits.media]);

    const railSourceMovies = useMemo(() => {
        if (!moviesLoaded) return [];
        if (!ENABLE_HOME_HTTPS_RAIL_BACKFILL) return filteredMovies;
        return filterContent(moviesItems);
    }, [filteredMovies, filterContent, moviesItems, moviesLoaded]);

    const filteredSeries = useMemo(() => {
        if (!seriesLoaded) return [];
        return filterContent(seriesItems.slice(0, homePoolLimits.media));
    }, [seriesItems, seriesLoaded, filterContent, homePoolLimits.media]);

    const railSourceSeries = useMemo(() => {
        if (!seriesLoaded) return [];
        if (!ENABLE_HOME_HTTPS_RAIL_BACKFILL) return filteredSeries;
        return filterContent(seriesItems);
    }, [filterContent, filteredSeries, seriesItems, seriesLoaded]);

    const livePool = useMemo(() => {
        if (!liveLoaded) return [];
        return liveItems.slice(0, homePoolLimits.live);
    }, [liveItems, liveLoaded, homePoolLimits.live]);

    const railSourceLive = useMemo(() => {
        if (!liveLoaded) return [];
        if (!ENABLE_HOME_HTTPS_RAIL_BACKFILL) return livePool;
        return liveItems;
    }, [liveItems, liveLoaded, livePool]);

    const resolveMovieImageForHome = useCallback((movie: any): string => {
        const key = `movie:${String(movie?.stream_id ?? '')}`;
        const override = homeImageOverrides[key];
        const persistedBackdrop = getPersistedDetailBackdropOverride('movie', movie?.stream_id ?? '');
        if (ENABLE_HOME_HTTPS_ONLY_IMAGES) {
            return resolveFirstHttpsImage(
                override,
                persistedBackdrop,
                movie?.stream_icon,
                movie?.movie_image,
                movie?.cover_big,
                movie?.cover,
                movie?.backdrop_path?.[0]
            );
        }
        return override || persistedBackdrop || resolveMovieImage(movie);
    }, [homeImageOverrides]);

    const resolveSeriesImageForHome = useCallback((series: any): string => {
        const key = `series:${String(series?.series_id ?? '')}`;
        const override = homeImageOverrides[key];
        if (ENABLE_HOME_HTTPS_ONLY_IMAGES) {
            return resolveFirstHttpsImage(
                override,
                series?.cover,
                series?.cover_big,
                series?.backdrop_path?.[0]
            );
        }
        return override || resolveSeriesImage(series);
    }, [homeImageOverrides]);

    const resolveLiveImageForHome = useCallback((channel: any): string => {
        if (ENABLE_HOME_HTTPS_ONLY_IMAGES) {
            return resolveFirstHttpsImage(channel?.stream_icon);
        }
        return String(channel?.stream_icon || '');
    }, []);

    const resolveFeaturedImageForHome = useCallback((item: any): string => {
        if (!item) return '';
        if (item.type === 'movie') {
            const httpsImage = resolveFirstHttpsImage(
                item?.backdrop,
                item?.poster,
                resolveMovieImageForHome(item?.data)
            );
            if (ENABLE_HOME_HTTPS_ONLY_IMAGES) {
                return httpsImage;
            }
            return httpsImage || (item?.backdrop || item?.poster || resolveMovieImageForHome(item?.data) || '');
        }
        if (item.type === 'series') {
            const httpsImage = resolveFirstHttpsImage(
                item?.backdrop,
                item?.poster,
                resolveSeriesImageForHome(item?.data)
            );
            if (ENABLE_HOME_HTTPS_ONLY_IMAGES) {
                return httpsImage;
            }
            return httpsImage || (item?.backdrop || item?.poster || resolveSeriesImageForHome(item?.data) || '');
        }
        return '';
    }, [resolveMovieImageForHome, resolveSeriesImageForHome]);

    const getFeaturedImageCandidatesForHome = useCallback((item: any): string[] => {
        if (!item) return [];

        const raw = item.type === 'movie'
            ? [
                ...getMovieDetailBackdropCandidates(item?.data),
                resolveMovieImageForHome(item?.data),
                item?.poster,
                item?.backdrop,
            ]
            : item.type === 'series'
                ? [
                    ...getSeriesDetailBackdropCandidates(item?.data),
                    resolveSeriesImageForHome(item?.data),
                    item?.poster,
                    item?.backdrop,
                ]
                : [];

        const unique = new Set<string>();
        for (const candidate of raw) {
            const normalized = String(candidate || '').trim();
            if (!normalized) continue;
            if (ENABLE_HOME_HTTPS_ONLY_IMAGES && !isHttpsImage(normalized)) continue;
            unique.add(normalized);
        }
        return Array.from(unique);
    }, [resolveMovieImageForHome, resolveSeriesImageForHome]);

    const pickFeaturedImageForHome = useCallback((item: any): { image: string; candidates: string[] } => {
        const candidates = getFeaturedImageCandidatesForHome(item);
        if (candidates.length === 0) {
            return { image: '', candidates: [] };
        }

        const verifiedOk = candidates.find((candidate) => (
            getHomeImageVerificationStatus(candidate) === 'verified_ok' && isHomeImageAllowed(candidate)
        ));
        if (verifiedOk) {
            return { image: verifiedOk, candidates };
        }

        const allowed = candidates.find((candidate) => isHomeImageAllowed(candidate)) || '';
        return { image: allowed, candidates };
    }, [getFeaturedImageCandidatesForHome, isHomeImageAllowed]);

    const homeMovies = useMemo(() => {
        if (!ENABLE_HOME_HTTPS_ONLY_IMAGES) return filteredMovies;
        return filteredMovies.filter((movie) => isHomeImageAllowed(resolveMovieImageForHome(movie)));
    }, [filteredMovies, imageVerificationVersion, isHomeImageAllowed, resolveMovieImageForHome]);

    const railHomeMovies = useMemo(() => {
        if (!ENABLE_HOME_HTTPS_ONLY_IMAGES) return railSourceMovies;
        return railSourceMovies.filter((movie) => isHomeImageAllowed(resolveMovieImageForHome(movie)));
    }, [imageVerificationVersion, isHomeImageAllowed, railSourceMovies, resolveMovieImageForHome]);

    const homeSeries = useMemo(() => {
        if (!ENABLE_HOME_HTTPS_ONLY_IMAGES) return filteredSeries;
        return filteredSeries.filter((series) => isHomeImageAllowed(resolveSeriesImageForHome(series)));
    }, [filteredSeries, imageVerificationVersion, isHomeImageAllowed, resolveSeriesImageForHome]);

    const railHomeSeries = useMemo(() => {
        if (!ENABLE_HOME_HTTPS_ONLY_IMAGES) return railSourceSeries;
        return railSourceSeries.filter((series) => isHomeImageAllowed(resolveSeriesImageForHome(series)));
    }, [imageVerificationVersion, isHomeImageAllowed, railSourceSeries, resolveSeriesImageForHome]);

    const homeLivePool = useMemo(() => {
        if (!ENABLE_HOME_HTTPS_ONLY_IMAGES) return livePool;
        return livePool.filter((channel) => isHomeImageAllowed(resolveLiveImageForHome(channel)));
    }, [imageVerificationVersion, isHomeImageAllowed, livePool, resolveLiveImageForHome]);

    const railHomeLivePool = useMemo(() => {
        if (!ENABLE_HOME_HTTPS_ONLY_IMAGES) return railSourceLive;
        return railSourceLive.filter((channel) => isHomeImageAllowed(resolveLiveImageForHome(channel)));
    }, [imageVerificationVersion, isHomeImageAllowed, railSourceLive, resolveLiveImageForHome]);

    const forYouItems = useMemo<ContentItem[]>(() => {
        const moviePicks = railHomeMovies
            .filter((movie) => !watchedMovieIds.has(String(movie.stream_id)))
            .sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0))
            .slice(0, 8)
            .map((movie) => ({
                id: String(movie.stream_id),
                name: movie.name,
                image: resolveMovieImageForHome(movie),
                type: 'movie' as const,
                rating: movie.rating_5based,
                data: movie,
            }));

        const seriesPicks = railHomeSeries
            .filter((series) => !watchedSeriesIds.has(String(series.series_id)))
            .sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0))
            .slice(0, 8)
            .map((series) => ({
                id: String(series.series_id),
                name: series.name,
                image: resolveSeriesImageForHome(series),
                type: 'series' as const,
                rating: series.rating_5based,
                data: series,
            }));

        const mixed: ContentItem[] = [];
        const max = Math.max(moviePicks.length, seriesPicks.length);
        for (let i = 0; i < max; i += 1) {
            if (moviePicks[i]) mixed.push(moviePicks[i]);
            if (seriesPicks[i]) mixed.push(seriesPicks[i]);
            if (mixed.length >= RAIL_ITEM_LIMIT) break;
        }
        return mixed;
    }, [railHomeMovies, railHomeSeries, watchedMovieIds, watchedSeriesIds, resolveMovieImageForHome, resolveSeriesImageForHome]);

    // UX: Auto-reset category if it becomes invalid (no longer exists in source)
    useEffect(() => {
        if (!selectedType) return;

        let currentCatId: string | null = null;
        let isValid = true; // Assume valid until proven otherwise

        // Determine validity based on domain
        if (selectedType === 'live') {
            currentCatId = selectedCategory.live;
            if (currentCatId && liveLoaded) {
                isValid = liveCategories.some(c => String(c.category_id) === currentCatId);
            }
        } else if (selectedType === 'movies') {
            currentCatId = selectedCategory.movies;
            if (currentCatId && moviesLoaded) {
                isValid = movieCategories.some(c => String(c.category_id) === currentCatId);
            }
        } else if (selectedType === 'series') {
            currentCatId = selectedCategory.series;
            if (currentCatId && seriesLoaded) {
                isValid = seriesCategories.some(c => String(c.category_id) === currentCatId);
            }
        }

        // Silent auto-reset if invalid
        if (currentCatId && !isValid) {
            logger.info('Auto-resetting invalid category', { type: selectedType, invalidId: currentCatId });
            setCategory(selectedType, null, null);
        }
    }, [
        selectedType,
        selectedCategory,
        liveLoaded,
        moviesLoaded,
        seriesLoaded,
        liveCategories,
        movieCategories,
        seriesCategories,
        setCategory
    ]);

    // =============================================================================
    // CONTENT SECTIONS (from cache - INSTANT!)
    // =============================================================================

    const heroSeed = activeProfileId || userInfo?.username || 'default';
    const heroCarousel = useHeroCarousel(homeMovies, homeSeries, heroSeed, 12, 15000);
    const heroCurrent = heroCarousel.current;
    const heroNext = heroCarousel.next;

    const featuredContent: FeaturedContent | null = useMemo(() => {
        if (!heroCurrent) return null;
        const resolved = ENABLE_HOME_HERO_DETAIL_IMAGE_CHAIN_V1
            ? pickFeaturedImageForHome(heroCurrent)
            : { image: resolveFeaturedImageForHome(heroCurrent), candidates: [] };
        const image = resolved.image;
        if (ENABLE_HOME_HTTPS_ONLY_IMAGES && !isHomeImageAllowed(image)) {
            return null;
        }
        return {
            id: heroCurrent.id,
            type: heroCurrent.type,
            name: heroCurrent.title,
            image,
            imageCandidates: resolved.candidates,
            rating: heroCurrent.rating,
            plot: heroCurrent.description,
            genre: heroCurrent.genre,
            data: heroCurrent.data,
        };
    }, [heroCurrent, isHomeImageAllowed, pickFeaturedImageForHome, resolveFeaturedImageForHome]);

    const nextFeatured: FeaturedContent | null = useMemo(() => {
        if (!heroNext) return null;
        const resolved = ENABLE_HOME_HERO_DETAIL_IMAGE_CHAIN_V1
            ? pickFeaturedImageForHome(heroNext)
            : { image: resolveFeaturedImageForHome(heroNext), candidates: [] };
        const image = resolved.image;
        if (ENABLE_HOME_HTTPS_ONLY_IMAGES && !isHomeImageAllowed(image)) {
            return null;
        }
        return {
            id: heroNext.id,
            type: heroNext.type,
            name: heroNext.title,
            image,
            imageCandidates: resolved.candidates,
            rating: heroNext.rating,
            plot: heroNext.description,
            genre: heroNext.genre,
            data: heroNext.data,
        };
    }, [heroNext, isHomeImageAllowed, pickFeaturedImageForHome, resolveFeaturedImageForHome]);

    useEffect(() => {
        if (!ENABLE_HOME_HERO_DETAIL_PREFETCH_V1) return;

        const candidates = [featuredContent, nextFeatured].filter(Boolean) as FeaturedContent[];
        const heroUris = candidates.flatMap((item) => item.imageCandidates?.slice(0, 3) || (item.image ? [item.image] : []));
        if (heroUris.length > 0) {
            prefetchImages(heroUris);
        }

        for (const item of candidates) {
            if (item.type !== 'movie' && item.type !== 'series') continue;

            const id = item.type === 'movie'
                ? item.data?.stream_id
                : item.data?.series_id;
            if (!id) continue;

            const key = `${item.type}:${String(id)}`;
            if (heroDetailPrefetchDoneRef.current.has(key)) continue;

            heroDetailPrefetchDoneRef.current.add(key);
            prefetchDetail(item.type, id).catch(() => {
                heroDetailPrefetchDoneRef.current.delete(key);
            });
        }
    }, [featuredContent, nextFeatured, prefetchDetail]);

    const moviesForRows = useMemo(() => {
        if (!moviesLoaded) return [];
        if (selectedType === 'movies' && selectedMovieCategoryId) {
            return railHomeMovies.filter((m) => String(m.category_id) === String(selectedMovieCategoryId));
        }
        return railHomeMovies;
    }, [railHomeMovies, moviesLoaded, selectedMovieCategoryId, selectedType]);

    const seriesForRows = useMemo(() => {
        if (!seriesLoaded) return [];
        if (selectedType === 'series' && selectedSeriesCategoryId) {
            return railHomeSeries.filter((s) => String(s.category_id) === String(selectedSeriesCategoryId));
        }
        return railHomeSeries;
    }, [railHomeSeries, selectedSeriesCategoryId, selectedType, seriesLoaded]);

    const liveForRows = useMemo(() => {
        if (!liveLoaded) return [];
        if (selectedType === 'live' && selectedLiveCategoryId) {
            return railHomeLivePool.filter((channel) => String(channel.category_id) === String(selectedLiveCategoryId));
        }
        return railHomeLivePool;
    }, [railHomeLivePool, liveLoaded, selectedLiveCategoryId, selectedType]);

    // Recently added movies
    const recentMovies = useMemo(() => {
        if (moviesForRows.length === 0) return [];

        return takeTopN(
            moviesForRows,
            RAIL_ITEM_LIMIT,
            (a, b) => parseInt(b.added || '0', 10) - parseInt(a.added || '0', 10)
        )
            .map(m => ({
                id: String(m.stream_id),
                name: m.name,
                image: resolveMovieImageForHome(m),
                type: 'movie' as const,
                rating: m.rating_5based,
                data: m,
            }))
            .filter((item) => hasHomeImage(item.image));
    }, [moviesForRows, resolveMovieImageForHome]);

    // Recently added series
    const recentSeries = useMemo(() => {
        if (seriesForRows.length === 0) return [];

        return takeTopN(
            seriesForRows,
            RAIL_ITEM_LIMIT,
            (a, b) => new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime()
        )
            .map(s => ({
                id: String(s.series_id),
                name: s.name,
                image: resolveSeriesImageForHome(s),
                type: 'series' as const,
                rating: s.rating_5based,
                data: s,
            }))
            .filter((item) => hasHomeImage(item.image));
    }, [seriesForRows, resolveSeriesImageForHome]);

    // Top rated movies
    const topRatedMovies = useMemo(() => {
        if (moviesForRows.length === 0) return [];

        return takeTopN(
            moviesForRows,
            RAIL_ITEM_LIMIT,
            (a, b) => (b.rating_5based || 0) - (a.rating_5based || 0)
        )
            .map(m => ({
                id: String(m.stream_id),
                name: m.name,
                image: resolveMovieImageForHome(m),
                type: 'movie' as const,
                rating: m.rating_5based,
                data: m,
            }))
            .filter((item) => hasHomeImage(item.image));
    }, [moviesForRows, resolveMovieImageForHome]);

    // Popular live channels
    const popularChannels = useMemo(() => {
        if (liveForRows.length === 0) return [];

        return liveForRows
            .slice(0, RAIL_ITEM_LIMIT)
            .map(ch => ({
                id: String(ch.stream_id),
                name: ch.name,
                image: resolveLiveImageForHome(ch),
                type: 'live' as const,
                data: ch,
            }))
            .filter((item) => hasHomeImage(item.image));
    }, [liveForRows, resolveLiveImageForHome]);

    // Category rails logic
    const movieCategoryMap = useMemo(() => {
        const map = new Map<string, ContentItem[]>();
        if (!moviesLoaded) return map;

        for (const movie of railHomeMovies) {
            const catId = String(movie.category_id);
            if (!catId) continue;

            let items = map.get(catId);
            if (!items) {
                items = [];
                map.set(catId, items);
            }

            if (items.length < RAIL_ITEM_LIMIT) {
                items.push({
                    id: String(movie.stream_id),
                    name: movie.name,
                    image: resolveMovieImageForHome(movie),
                    type: 'movie' as const,
                    rating: movie.rating_5based,
                    data: movie,
                });
            }
        }
        return map;
    }, [railHomeMovies, moviesLoaded, resolveMovieImageForHome]);

    const movieCategoryRails = useMemo(() => {
        if (!moviesLoaded || !movieCategories) return [];
        const rails: CategoryRail[] = [];
        for (const category of movieCategories) {
            const catId = String(category.category_id);
            const catName = category.category_name;
            if (!catName) continue;
            const items = movieCategoryMap.get(catId);
            if (items && items.length > 0) {
                rails.push({ id: catId, name: catName, items });
            }
        }
        return rails.sort((a, b) => b.items.length - a.items.length).slice(0, maxCategoryRailsPerDomain);
    }, [movieCategories, moviesLoaded, maxCategoryRailsPerDomain, movieCategoryMap]);

    const seriesCategoryMap = useMemo(() => {
        const map = new Map<string, ContentItem[]>();
        if (!seriesLoaded) return map;
        for (const series of railHomeSeries) {
            const catId = String(series.category_id);
            if (!catId) continue;
            let items = map.get(catId);
            if (!items) {
                items = [];
                map.set(catId, items);
            }
            if (items.length < RAIL_ITEM_LIMIT) {
                items.push({
                    id: String(series.series_id),
                    name: series.name,
                    image: resolveSeriesImageForHome(series),
                    type: 'series' as const,
                    rating: series.rating_5based,
                    data: series,
                });
            }
        }
        return map;
    }, [railHomeSeries, resolveSeriesImageForHome, seriesLoaded]);

    useEffect(() => {
        if (ENABLE_HOME_HTTPS_ONLY_IMAGES) return;

        const api = getXtreamAPI();
        if (!api || !moviesLoaded || !seriesLoaded) return;

        const movieTargets = filteredMovies
            .slice(0, 30)
            .map((movie) => ({ kind: 'movie' as const, id: String(movie.stream_id), baseImage: resolveMovieImage(movie) }));
        const seriesTargets = filteredSeries
            .slice(0, 30)
            .map((series) => ({ kind: 'series' as const, id: String(series.series_id), baseImage: resolveSeriesImage(series) }));

        const targets = [...movieTargets, ...seriesTargets];
        if (targets.length === 0) return;

        let cancelled = false;

        const run = async () => {
            for (const target of targets) {
                if (cancelled) break;
                const rescueKey = `${target.kind}:${target.id}`;
                if (!target.id || imageRescueInFlightRef.current.has(rescueKey) || imageRescueResolvedRef.current.has(rescueKey)) {
                    continue;
                }

                imageRescueInFlightRef.current.add(rescueKey);
                try {
                    const detail = target.kind === 'movie'
                        ? await api.getVodInfo(Number(target.id))
                        : await api.getSeriesInfo(Number(target.id));
                    const resolved = resolveImageFromDetailInfo(detail?.info);
                    if (resolved && resolved !== target.baseImage && !cancelled) {
                        setPersistedHomeImageOverride(rescueKey, resolved);
                        setHomeImageOverrides((prev) => (
                            prev[rescueKey] === resolved ? prev : { ...prev, [rescueKey]: resolved }
                        ));
                    }
                } catch {
                    // Ignore per-item rescue failures.
                } finally {
                    imageRescueResolvedRef.current.add(rescueKey);
                    imageRescueInFlightRef.current.delete(rescueKey);
                }
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [filteredMovies, filteredSeries, getXtreamAPI, moviesLoaded, seriesLoaded]);

    useEffect(() => {
        if (!ENABLE_HOME_IMAGE_VERIFICATION_V1 || !ENABLE_HOME_HTTPS_ONLY_IMAGES) return;

        const candidates = [
            ...railSourceMovies.slice(0, 180).map((movie) => resolveMovieImageForHome(movie)),
            ...railSourceSeries.slice(0, 180).map((series) => resolveSeriesImageForHome(series)),
            ...railSourceLive.slice(0, 180).map((channel) => resolveLiveImageForHome(channel)),
        ]
            .filter((uri): uri is string => Boolean(uri && uri.startsWith('https://')));

        if (candidates.length === 0) return;

        const uniqueCandidates = Array.from(new Set(candidates))
            .filter((uri) => getHomeImageVerificationStatus(uri) === 'unknown')
            .filter((uri) => !imageVerificationInFlightRef.current.has(uri))
            .slice(0, 36);

        if (uniqueCandidates.length === 0) return;

        let cancelled = false;

        const run = async () => {
            let changed = false;

            for (const uri of uniqueCandidates) {
                if (cancelled) break;
                imageVerificationInFlightRef.current.add(uri);
                try {
                    const status = await verifyHomeImageUri(uri);
                    if (status === 'verified_ok' || status === 'verified_failed' || status === 'rejected_pattern') {
                        changed = true;
                    }
                } finally {
                    imageVerificationInFlightRef.current.delete(uri);
                }
            }

            if (!cancelled && changed) {
                setImageVerificationVersion((value) => value + 1);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [
        imageVerificationVersion,
        railSourceLive,
        railSourceMovies,
        railSourceSeries,
        resolveLiveImageForHome,
        resolveMovieImageForHome,
        resolveSeriesImageForHome,
    ]);

    const seriesCategoryRails = useMemo(() => {
        if (!seriesLoaded || !seriesCategories) return [];
        const rails: CategoryRail[] = [];
        for (const category of seriesCategories) {
            const catId = String(category.category_id);
            const catName = category.category_name;
            if (!catName) continue;
            const items = seriesCategoryMap.get(catId);
            if (items && items.length > 0) {
                rails.push({ id: catId, name: catName, items });
            }
        }
        return rails.sort((a, b) => b.items.length - a.items.length).slice(0, maxCategoryRailsPerDomain);
    }, [seriesCategories, seriesLoaded, maxCategoryRailsPerDomain, seriesCategoryMap]);

    const liveCategoryMap = useMemo(() => {
        const map = new Map<string, ContentItem[]>();
        if (!liveLoaded) return map;
        for (const channel of railHomeLivePool) {
            const catId = String(channel.category_id);
            if (!catId) continue;
            let items = map.get(catId);
            if (!items) {
                items = [];
                map.set(catId, items);
            }
            if (items.length < RAIL_ITEM_LIMIT) {
                items.push({
                    id: String(channel.stream_id),
                    name: channel.name,
                    image: resolveLiveImageForHome(channel),
                    type: 'live' as const,
                    data: channel,
                });
            }
        }
        return map;
    }, [railHomeLivePool, liveLoaded, resolveLiveImageForHome]);

    const liveCategoryRails = useMemo(() => {
        if (!liveLoaded || !liveCategories) return [];
        const rails: CategoryRail[] = [];
        for (const category of liveCategories) {
            const catId = String(category.category_id);
            const catName = category.category_name;
            if (!catName) continue;
            const items = liveCategoryMap.get(catId);
            if (items && items.length > 0) {
                rails.push({ id: catId, name: catName, items });
            }
        }
        return rails.sort((a, b) => b.items.length - a.items.length).slice(0, maxCategoryRailsPerDomain);
    }, [liveCategories, liveLoaded, liveCategoryMap, maxCategoryRailsPerDomain]);


    // =============================================================================
    // HANDLERS
    // =============================================================================

    const handleCategoryTypePress = useCallback((type: ContentType) => {
        navigation.navigate('Browse', { type });
    }, [navigation]);

    const handleSearch = useCallback(() => {
        navigation.navigate('Search');
    }, [navigation]);

    const handleDownloads = useCallback(() => {
        navigation.navigate('Downloads');
    }, [navigation]);

    const handleProfile = useCallback(() => {
        navigation.navigate('ProfileSwitcher');
    }, [navigation]);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            if (!isConnected) {
                enqueueOfflineAction('refresh_content');
                enqueueOfflineAction('refresh_announcements');
                return;
            }

            const [contentOk, announcementsOk] = await Promise.all([
                forceRefresh(),
                fetchAnnouncements({ force: true }),
            ]);

            if (!contentOk) {
                enqueueOfflineAction('refresh_content');
            }
            if (!announcementsOk) {
                enqueueOfflineAction('refresh_announcements');
            }
        } finally {
            setIsRefreshing(false);
        }
    }, [enqueueOfflineAction, fetchAnnouncements, forceRefresh, isConnected, isRefreshing]);

    const handleContentPress = useCallback((item: any) => {
        if (item.type === 'live') {
            navigation.navigate('FullscreenPlayer', {
                type: 'live',
                item: {
                    stream_id: item.data.stream_id,
                    name: item.data.name,
                    stream_icon: item.data.stream_icon,
                },
            });
        } else if (item.type === 'movie') {
            const movieData = item.data as any;
            const persistedBackdrop = getPersistedDetailBackdropOverride('movie', movieData.stream_id);
            const movieBackdropPath = [
                persistedBackdrop,
                ...(Array.isArray(movieData.backdrop_path) ? movieData.backdrop_path : []),
            ].filter(Boolean);
            navigation.navigate('MovieDetail', {
                movie: {
                    stream_id: movieData.stream_id,
                    name: movieData.name,
                    stream_icon: movieData.stream_icon,
                    ...(ENABLE_MOVIE_DETAIL_ROUTE_IMAGE_ENRICHMENT_V1 ? {
                        cover: movieData.cover,
                        cover_big: movieData.cover_big,
                        movie_image: movieData.movie_image,
                        backdrop_path: movieBackdropPath.length > 0
                            ? Array.from(new Set(movieBackdropPath))
                            : undefined,
                    } : {}),
                    rating: movieData.rating,
                    rating_5based: movieData.rating_5based,
                    container_extension: movieData.container_extension,
                    plot: movieData.plot,
                    genre: movieData.genre,
                    cast: movieData.cast,
                    director: movieData.director,
                    youtube_trailer: movieData.youtube_trailer,
                },
            });
        } else if (item.type === 'series') {
            navigation.navigate('SeriesDetail', {
                series: item.data,
            });
        }
    }, [navigation]);

    const handleContinuePress = useCallback((item: WatchProgress) => {
        const api = getXtreamAPI();
        if (!api) return;

        if (item.type === 'movie') {
            navigation.navigate('FullscreenPlayer', {
                type: 'movie',
                item: item.data || {
                    stream_id: item.streamId,
                    name: item.title,
                    stream_icon: item.thumbnail,
                },
                resumePosition: item.position,
            });
            return;
        }

        if (item.type === 'series') {
            const seriesData = item.data as any;
            const extension = seriesData?.container_extension || 'mp4';
            const episodeUrl = api.getSeriesEpisodeUrl(item.streamId, extension);
            navigation.navigate('FullscreenPlayer', {
                type: 'series',
                item: item.data || {
                    id: item.streamId,
                    name: item.episodeTitle || item.title,
                },
                episodeUrl,
                resumePosition: item.position,
            });
        }
    }, [getXtreamAPI, navigation]);

    const handleContinueItemPress = useCallback((item: ContentItem) => {
        const entry = continueWatchingById.get(String(item.id));
        if (entry) handleContinuePress(entry);
    }, [continueWatchingById, handleContinuePress]);

    const handleHeroPlay = useCallback(() => {
        if (!featuredContent) return;
        const api = getXtreamAPI();
        if (!api) return;

        if (featuredContent.type === 'movie') {
            navigation.navigate('FullscreenPlayer', {
                type: 'movie',
                item: {
                    stream_id: featuredContent.data.stream_id,
                    name: featuredContent.data.name,
                    stream_icon: featuredContent.data.stream_icon,
                },
            });
        } else if (featuredContent.type === 'series') {
            navigation.navigate('SeriesDetail', {
                series: featuredContent.data,
            });
        }
    }, [featuredContent, getXtreamAPI, navigation]);

    const handleHeroInfo = useCallback(() => {
        if (!featuredContent) return;
        handleContentPress(featuredContent);
    }, [featuredContent, handleContentPress]);

    const handleHomeItemImageLoad = useCallback((item: ContentItem, imageUri?: string) => {
        const targetKey = item.type === 'movie'
            ? `movie:${String(item.data?.stream_id ?? item.id ?? '')}`
            : item.type === 'series'
                ? `series:${String(item.data?.series_id ?? item.id ?? '')}`
                : '';
        if (targetKey && imageUri) {
            setHomeImageOverrides((prev) => (
                prev[targetKey] === imageUri ? prev : { ...prev, [targetKey]: imageUri }
            ));
            setPersistedHomeImageOverride(targetKey, imageUri);
        }
        if (!ENABLE_HOME_IMAGE_VERIFICATION_V1) return;
        const targetUri = item.image || imageUri;
        if (!targetUri) return;
        if (getHomeImageVerificationStatus(targetUri) === 'verified_ok') return;
        markHomeImageVerifiedOk(targetUri);
        setImageVerificationVersion((value) => value + 1);
    }, []);

    const handleHeroImageResolved = useCallback((item: FeaturedContent, imageUri: string) => {
        const targetKey = item.type === 'movie'
            ? `movie:${String(item.data?.stream_id ?? item.id ?? '')}`
            : item.type === 'series'
                ? `series:${String(item.data?.series_id ?? item.id ?? '')}`
                : '';
        if (!targetKey || !imageUri) return;
        setHomeImageOverrides((prev) => (
            prev[targetKey] === imageUri ? prev : { ...prev, [targetKey]: imageUri }
        ));
        setPersistedHomeImageOverride(targetKey, imageUri);
        if (ENABLE_HOME_IMAGE_VERIFICATION_V1) {
            markHomeImageVerifiedOk(imageUri);
            setImageVerificationVersion((value) => value + 1);
        }
    }, []);

    const handleHomeItemImageError = useCallback((item: ContentItem, imageUri?: string) => {
        if (!ENABLE_HOME_IMAGE_VERIFICATION_V1) return;
        const targetUri = item.image || imageUri;
        if (!targetUri) return;
        if (getHomeImageVerificationStatus(targetUri) === 'verified_failed') return;
        markHomeImageVerifiedFailed(targetUri);
        setImageVerificationVersion((value) => value + 1);
    }, []);

    const flushVisibleDetailPrefetchQueue = useCallback(() => {
        while (
            visibleDetailPrefetchInFlightRef.current < HOME_VISIBLE_DETAIL_PREFETCH_CONCURRENCY &&
            visibleDetailPrefetchQueueRef.current.length > 0
        ) {
            const next = visibleDetailPrefetchQueueRef.current.shift();
            if (!next) return;

            const prefetchKey = `${next.type}:${String(next.id)}`;
            visibleDetailPrefetchInFlightRef.current += 1;

            prefetchDetail(next.type, next.id)
                .catch(() => {
                    // Background optimization only.
                })
                .finally(() => {
                    visibleDetailPrefetchInFlightRef.current -= 1;
                    visibleDetailPrefetchQueuedRef.current.delete(prefetchKey);
                    visibleDetailPrefetchDoneRef.current.add(prefetchKey);
                    flushVisibleDetailPrefetchQueue();
                });
        }
    }, [prefetchDetail]);

    const handleVisibleHomeItemsChange = useCallback((items: ContentItem[]) => {
        if (!ENABLE_HOME_VISIBLE_DETAIL_PREFETCH_V1) return;

        for (const item of items) {
            if (item.type !== 'movie' && item.type !== 'series') continue;

            const prefetchKey = `${item.type}:${String(item.id)}`;
            if (
                visibleDetailPrefetchDoneRef.current.has(prefetchKey) ||
                visibleDetailPrefetchQueuedRef.current.has(prefetchKey)
            ) {
                continue;
            }

            visibleDetailPrefetchQueuedRef.current.add(prefetchKey);
            visibleDetailPrefetchQueueRef.current.push({
                type: item.type,
                id: item.id,
            });
        }

        flushVisibleDetailPrefetchQueue();
    }, [flushVisibleDetailPrefetchQueue]);

    const handleSeeAll = useCallback((section: string) => {
        switch (section) {
            case 'recent-movies':
            case 'top-rated':
                navigation.navigate('Browse', { type: 'movies' });
                break;
            case 'recent-series':
                navigation.navigate('Browse', { type: 'series' });
                break;
            case 'live':
                navigation.navigate('Browse', { type: 'live' });
                break;
        }
    }, [navigation]);

    const handleTabShortcut = useCallback((tab: 'FavoritesTab' | 'AnnouncementsTab') => {
        const parent = navigation.getParent?.();
        if (parent) {
            parent.navigate(tab);
            return;
        }
        if (tab === 'FavoritesTab') {
            navigation.navigate('Browse', { type: 'movies' });
        } else {
            navigation.navigate('Search');
        }
    }, [navigation]);

    const lastUpdatedLabel = useMemo(() => {
        if (!lastFetchTime) return 'Not synced yet';
        const now = Date.now();
        const diffMs = Math.max(0, now - lastFetchTime);
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Synced just now';
        if (diffMins < 60) return `Synced ${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        return `Synced ${diffHours}h ago`;
    }, [lastFetchTime]);

    const quickActions = useMemo<QuickAction[]>(() => ([
        { id: 'refresh', label: isRefreshing ? 'Syncing...' : 'Refresh', icon: 'arrowCounterClockwise', color: colors.info, onPress: handleRefresh },
        { id: 'live', label: 'Live TV', icon: 'live', color: colors.live, onPress: () => navigation.navigate('Browse', { type: 'live' }) },
        { id: 'movies', label: 'Movies', icon: 'filmStrip', color: colors.movies, onPress: () => navigation.navigate('Browse', { type: 'movies' }) },
        { id: 'series', label: 'Series', icon: 'monitorPlay', color: colors.series, onPress: () => navigation.navigate('Browse', { type: 'series' }) },
        { id: 'favorites', label: 'Favorites', icon: 'heart', color: colors.primary, onPress: () => handleTabShortcut('FavoritesTab') },
        { id: 'announcements', label: 'Updates', icon: 'bell', color: colors.warning, onPress: () => handleTabShortcut('AnnouncementsTab') },
    ]), [handleRefresh, handleTabShortcut, isRefreshing, navigation]);

    const quickActionCardStyle = useMemo(() => {
        const horizontalPadding = spacing.base * 2;
        const totalGap = QUICK_ACTION_GRID_GAP * (QUICK_ACTION_COLUMNS - 1);
        const available = Math.max(0, viewportWidth - horizontalPadding - totalGap);
        const width = Math.floor(available / QUICK_ACTION_COLUMNS);
        return { width: Math.max(102, width) };
    }, [viewportWidth]);

    // =============================================================================
    // SECTION DATA (Virtualized)
    // =============================================================================

    const sections = useMemo<HomeSection[]>(() => {
        const list: HomeSection[] = [];

        if (featuredContent) {
            list.push({
                key: 'hero',
                type: 'hero',
                item: featuredContent,
            });
        }

        list.push({
            key: 'quick-actions',
            type: 'quickActions',
            actions: quickActions,
            isConnected,
            lastUpdatedLabel,
        });

        if (continueRowItems.length > 0) {
            list.push({
                key: 'continue',
                type: 'row',
                title: 'Continue Watching',
                rowType: 'continue',
                items: continueRowItems,
                onItemPress: handleContinueItemPress,
                showSeeAll: false,
                accentColor: colors.accent,
            });
        }

        if (!ENABLE_HOME_LEAN_RAILS && forYouItems.length > 0) {
            list.push({
                key: 'for-you',
                type: 'row',
                title: 'For You',
                rowType: 'movies',
                items: forYouItems,
                onItemPress: handleContentPress,
                onSeeAllPress: () => navigation.navigate('Browse', { type: 'movies' }),
                accentColor: colors.accent,
            });
        }

        if (!ENABLE_HOME_LEAN_RAILS && showLive && popularChannels.length > 0) {
            list.push({
                key: 'live-now',
                type: 'row',
                title: 'Live Now',
                rowType: 'live',
                items: popularChannels,
                onItemPress: handleContentPress,
                onSeeAllPress: () => handleSeeAll('live'),
                accentColor: colors.live,
            });
        }

        if (showMovies && recentMovies.length > 0) {
            list.push({
                key: 'recent-movies',
                type: 'row',
                title: 'Recently Added Movies',
                rowType: 'movies',
                items: recentMovies,
                onItemPress: handleContentPress,
                onSeeAllPress: () => handleSeeAll('recent-movies'),
                accentColor: colors.movies,
            });
        }

        if (showSeries && recentSeries.length > 0) {
            list.push({
                key: 'recent-series',
                type: 'row',
                title: 'Recently Added Series',
                rowType: 'series',
                items: recentSeries,
                onItemPress: handleContentPress,
                onSeeAllPress: () => handleSeeAll('recent-series'),
                accentColor: colors.series,
            });
        }

        if (!ENABLE_HOME_LEAN_RAILS && showMovies && topRatedMovies.length > 0) {
            list.push({
                key: 'top-rated',
                type: 'row',
                title: 'Top Rated',
                rowType: 'movies',
                items: topRatedMovies,
                onItemPress: handleContentPress,
                onSeeAllPress: () => handleSeeAll('top-rated'),
                accentColor: colors.accent,
            });
        }

        if (showMovies) {
            for (const category of movieCategoryRails) {
                list.push({
                    key: `movie-cat-${category.id}`,
                    type: 'row',
                    title: category.name,
                    rowType: 'movies',
                    items: category.items,
                    onItemPress: handleContentPress,
                    onSeeAllPress: () => handleSeeAll('recent-movies'),
                    accentColor: colors.movies,
                });
            }
        }

        if (showSeries) {
            for (const category of seriesCategoryRails) {
                list.push({
                    key: `series-cat-${category.id}`,
                    type: 'row',
                    title: category.name,
                    rowType: 'series',
                    items: category.items,
                    onItemPress: handleContentPress,
                    onSeeAllPress: () => handleSeeAll('recent-series'),
                    accentColor: colors.series,
                });
            }
        }

        if (showLive) {
            for (const category of liveCategoryRails) {
                list.push({
                    key: `live-cat-${category.id}`,
                    type: 'row',
                    title: category.name,
                    rowType: 'live',
                    items: category.items,
                    onItemPress: handleContentPress,
                    onSeeAllPress: () => handleSeeAll('live'),
                    accentColor: colors.live,
                });
            }
        }

        list.push({
            key: 'stats',
            type: 'stats',
            stats,
        });

        return list;
    }, [
        featuredContent,
        continueRowItems,
        forYouItems,
        handleContinueItemPress,
        isConnected,
        lastUpdatedLabel,
        showLive,
        popularChannels,
        showMovies,
        recentMovies,
        showSeries,
        recentSeries,
        topRatedMovies,
        movieCategoryRails,
        seriesCategoryRails,
        liveCategoryRails,
        stats,
        quickActions,
        handleContentPress,
        handleSeeAll,
        navigation,
    ]);

    const renderedSections = sections;

    const homePrefetchUris = useMemo(() => {
        const preloadSet = new Set<string>();
        const prefetchCount = perf.tier === 'low' ? 4 : perf.tier === 'high' ? 8 : PREFETCH_ITEMS_PER_ROW;
        const addUri = (uri?: string) => {
            if (!uri || !uri.startsWith('http')) return;
            preloadSet.add(uri);
        };
        const addRowImages = (items: ContentItem[]) => {
            for (const item of items.slice(0, prefetchCount)) {
                addUri(item.image);
            }
        };

        addUri(featuredContent?.image);
        featuredContent?.imageCandidates?.slice(0, 3).forEach(addUri);
        addUri(nextFeatured?.image);
        nextFeatured?.imageCandidates?.slice(0, 3).forEach(addUri);
        for (const section of renderedSections) {
            if (section.type !== 'row') continue;
            addRowImages(section.items);
            if (preloadSet.size >= prefetchCount * 5) break;
        }
        return Array.from(preloadSet);
    }, [
        featuredContent?.image,
        featuredContent?.imageCandidates,
        nextFeatured?.image,
        nextFeatured?.imageCandidates,
        perf.tier,
        renderedSections,
    ]);

    useEffect(() => {
        prefetchImages(homePrefetchUris);
    }, [homePrefetchUris]);

    const renderSection = useCallback(({ item }: { item: HomeSection }) => {
        switch (item.type) {
            case 'hero':
                return (
                    <HeroBanner
                        item={item.item}
                        onPress={handleHeroInfo}
                        onPlayPress={handleHeroPlay}
                        onInfoPress={handleHeroInfo}
                        onImageResolved={handleHeroImageResolved}
                    />
                );
            case 'row':
                return (
                    <ContentRow
                        title={item.title}
                        type={item.rowType}
                        items={item.items}
                        onItemPress={item.onItemPress}
                        onVisibleItemsChange={handleVisibleHomeItemsChange}
                        onItemImageLoad={handleHomeItemImageLoad}
                        onItemImageError={handleHomeItemImageError}
                        onSeeAllPress={item.onSeeAllPress}
                        showSeeAll={item.showSeeAll}
                        accentColor={item.accentColor}
                        strictImageSource={ENABLE_HOME_IMAGE_VERIFICATION_V1}
                    />
                );
            case 'quickActions':
                return (
                    <View style={styles.quickActionsSection}>
                        <View style={styles.syncRow}>
                            <View
                                style={[
                                    styles.statusDot,
                                    item.isConnected ? styles.statusDotOnline : styles.statusDotOffline,
                                ]}
                            />
                            <Text style={styles.syncText}>
                                {item.isConnected ? 'Online' : 'Offline'} | {item.lastUpdatedLabel}
                            </Text>
                        </View>
                        <View style={styles.quickActionsGrid}>
                            {item.actions.map((action) => (
                                <TouchableOpacity
                                    key={action.id}
                                    style={[styles.quickActionButton, quickActionCardStyle]}
                                    activeOpacity={0.82}
                                    onPress={action.onPress}
                                >
                                    <View style={[styles.quickActionAccent, { backgroundColor: action.color }]} />
                                    <View style={styles.quickActionIconWrap}>
                                        <Icon name={action.icon} size={20} color={action.color} />
                                    </View>
                                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 'stats':
                return (
                    <View style={styles.statsFooter}>
                        <Text style={styles.statsText}>
                            {item.stats.live} Live Channels | {item.stats.movies} Movies | {item.stats.series} Series
                        </Text>
                        <Text style={styles.cacheInfo}>
                            Content cached for instant access
                        </Text>
                    </View>
                );
            default:
                return null;
        }
    }, [handleHeroImageResolved, handleHeroInfo, handleHeroPlay, handleHomeItemImageError, handleHomeItemImageLoad, handleVisibleHomeItemsChange, quickActionCardStyle]);

    const getItemType = useCallback((item: HomeSection) => item.type, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <NavBar
                variant="home"
                username={homeHeaderName}
                onSearchPress={handleSearch}
                onNotificationPress={handleDownloads}
                onProfilePress={handleProfile}
                onLogoPress={handleProfile}
                onCategoryTypePress={handleCategoryTypePress}
            />
            <FlashList
                style={styles.scrollView}
                data={renderedSections}
                renderItem={renderSection}
                keyExtractor={(item) => item.key}
                // @ts-ignore
                estimatedItemSize={280}
                getItemType={getItemType}
                drawDistance={perf.home.drawDistance}
                initialNumToRender={Math.min(sections.length, 6)}
                maxToRenderPerBatch={4}
                windowSize={7}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER }
                ]}
            />
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: spacing.base,
    },
    quickActionsSection: {
        paddingHorizontal: spacing.base,
        marginBottom: spacing.xl,
    },
    syncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        gap: spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        borderRadius: 999,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    statusDotOnline: {
        backgroundColor: colors.success,
    },
    statusDotOffline: {
        backgroundColor: colors.error,
    },
    syncText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        rowGap: QUICK_ACTION_GRID_GAP,
        columnGap: QUICK_ACTION_GRID_GAP,
    },
    quickActionButton: {
        minHeight: 104,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        overflow: 'hidden',
    },
    quickActionAccent: {
        position: 'absolute',
        top: 0,
        left: '14%',
        right: '14%',
        height: 3,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        opacity: 0.95,
    },
    quickActionIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundElevated,
    },
    quickActionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.1,
    },
    statsFooter: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        marginTop: spacing.lg,
    },
    statsText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    cacheInfo: {
        fontSize: 10,
        color: colors.textSecondary,
        opacity: 0.6,
    },
});

export default HomeScreen;
