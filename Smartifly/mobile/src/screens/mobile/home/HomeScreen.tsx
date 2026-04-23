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

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    Text,
    Image,
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
const MAX_CATEGORY_RAILS_PER_DOMAIN = 8;
const PREFETCH_ITEMS_PER_ROW = 6;
const MAIN_TAB_BOTTOM_SPACER = 112;
const QUICK_ACTION_COLUMNS = 3;
const QUICK_ACTION_GRID_GAP = spacing.sm;

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
    const content = useContentStore((state) => state.content);
    const userInfo = useAuthStore((state) => state.userInfo);
    const getXtreamAPI = useContentStore((state) => state.getXtreamAPI);
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
        live: content.live.items.length,
        movies: content.movies.items.length,
        series: content.series.items.length,
    }), [content.live.items.length, content.movies.items.length, content.series.items.length]);

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
        continueWatching.map((progress) => ({
            id: progress.id,
            name: progress.title,
            image: progress.thumbnail,
            type: progress.type === 'movie'
                ? 'movie'
                : progress.type === 'series'
                    ? 'series'
                    : 'live',
            progress: progress.progress,
        }))
    ), [continueWatching]);

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
        if (!content.movies.loaded) return [];
        return filterContent(content.movies.items);
    }, [content.movies.items, content.movies.loaded, filterContent]);

    const filteredSeries = useMemo(() => {
        if (!content.series.loaded) return [];
        return filterContent(content.series.items);
    }, [content.series.items, content.series.loaded, filterContent]);

    const forYouItems = useMemo<ContentItem[]>(() => {
        const moviePicks = filteredMovies
            .filter((movie) => !watchedMovieIds.has(String(movie.stream_id)))
            .sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0))
            .slice(0, 8)
            .map((movie) => ({
                id: String(movie.stream_id),
                name: movie.name,
                image: movie.stream_icon,
                type: 'movie' as const,
                rating: movie.rating_5based,
                data: movie,
            }));

        const seriesPicks = filteredSeries
            .filter((series) => !watchedSeriesIds.has(String(series.series_id)))
            .sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0))
            .slice(0, 8)
            .map((series) => ({
                id: String(series.series_id),
                name: series.name,
                image: series.cover,
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
    }, [filteredMovies, filteredSeries, watchedMovieIds, watchedSeriesIds]);

    // UX: Auto-reset category if it becomes invalid (no longer exists in source)
    useEffect(() => {
        if (!selectedType) return;

        let currentCatId: string | null = null;
        let isValid = true; // Assume valid until proven otherwise

        // Determine validity based on domain
        if (selectedType === 'live') {
            currentCatId = selectedCategory.live;
            if (currentCatId && content.live.loaded) {
                isValid = content.live.categories.some(c => String(c.category_id) === currentCatId);
            }
        } else if (selectedType === 'movies') {
            currentCatId = selectedCategory.movies;
            if (currentCatId && content.movies.loaded) {
                isValid = content.movies.categories.some(c => String(c.category_id) === currentCatId);
            }
        } else if (selectedType === 'series') {
            currentCatId = selectedCategory.series;
            if (currentCatId && content.series.loaded) {
                isValid = content.series.categories.some(c => String(c.category_id) === currentCatId);
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
        content.live.loaded,
        content.movies.loaded,
        content.series.loaded,
        content.live.categories,
        content.movies.categories,
        content.series.categories,
        setCategory
    ]);

    // =============================================================================
    // CONTENT SECTIONS (from cache - INSTANT!)
    // =============================================================================

    const heroSeed = activeProfileId || userInfo?.username || 'default';
    const heroCarousel = useHeroCarousel(filteredMovies, filteredSeries, heroSeed, 12, 15000);
    const heroCurrent = heroCarousel.current;
    const heroNext = heroCarousel.next;

    const featuredContent: FeaturedContent | null = useMemo(() => {
        if (!heroCurrent) return null;
        return {
            id: heroCurrent.id,
            type: heroCurrent.type,
            name: heroCurrent.title,
            image: heroCurrent.backdrop || heroCurrent.poster,
            rating: heroCurrent.rating,
            plot: heroCurrent.description,
            genre: heroCurrent.genre,
            data: heroCurrent.data,
        };
    }, [heroCurrent]);

    const nextFeatured: FeaturedContent | null = useMemo(() => {
        if (!heroNext) return null;
        return {
            id: heroNext.id,
            type: heroNext.type,
            name: heroNext.title,
            image: heroNext.backdrop || heroNext.poster,
            rating: heroNext.rating,
            plot: heroNext.description,
            genre: heroNext.genre,
            data: heroNext.data,
        };
    }, [heroNext]);

    const moviesForRows = useMemo(() => {
        if (!content.movies.loaded) return [];
        if (selectedType === 'movies' && selectedMovieCategoryId) {
            return filteredMovies.filter((m) => String(m.category_id) === String(selectedMovieCategoryId));
        }
        return filteredMovies;
    }, [content.movies.loaded, filteredMovies, selectedMovieCategoryId, selectedType]);

    const seriesForRows = useMemo(() => {
        if (!content.series.loaded) return [];
        if (selectedType === 'series' && selectedSeriesCategoryId) {
            return filteredSeries.filter((s) => String(s.category_id) === String(selectedSeriesCategoryId));
        }
        return filteredSeries;
    }, [content.series.loaded, filteredSeries, selectedSeriesCategoryId, selectedType]);

    const liveForRows = useMemo(() => {
        if (!content.live.loaded) return [];
        if (selectedType === 'live' && selectedLiveCategoryId) {
            return content.live.items.filter((channel) => String(channel.category_id) === String(selectedLiveCategoryId));
        }
        return content.live.items;
    }, [content.live.items, content.live.loaded, selectedLiveCategoryId, selectedType]);

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
                image: m.stream_icon,
                type: 'movie' as const,
                rating: m.rating_5based,
                data: m,
            }));
    }, [moviesForRows]);

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
                image: s.cover,
                type: 'series' as const,
                rating: s.rating_5based,
                data: s,
            }));
    }, [seriesForRows]);

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
                image: m.stream_icon,
                type: 'movie' as const,
                rating: m.rating_5based,
                data: m,
            }));
    }, [moviesForRows]);

    // Popular live channels
    const popularChannels = useMemo(() => {
        if (liveForRows.length === 0) return [];

        return liveForRows.slice(0, RAIL_ITEM_LIMIT).map(ch => ({
            id: String(ch.stream_id),
            name: ch.name,
            image: ch.stream_icon,
            type: 'live' as const,
            data: ch,
        }));
    }, [liveForRows]);

    // Category rails logic
    const movieCategoryMap = useMemo(() => {
        const map = new Map<string, ContentItem[]>();
        if (!content.movies.loaded) return map;

        for (const movie of filteredMovies) {
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
                    image: movie.stream_icon,
                    type: 'movie' as const,
                    rating: movie.rating_5based,
                    data: movie,
                });
            }
        }
        return map;
    }, [content.movies.loaded, filteredMovies]);

    const movieCategoryRails = useMemo(() => {
        if (!content.movies.loaded || !content.movies.categories) return [];
        const rails: CategoryRail[] = [];
        for (const category of content.movies.categories) {
            const catId = String(category.category_id);
            const catName = category.category_name;
            if (!catName) continue;
            const items = movieCategoryMap.get(catId);
            if (items && items.length > 0) {
                rails.push({ id: catId, name: catName, items });
            }
        }
        return rails.sort((a, b) => b.items.length - a.items.length).slice(0, MAX_CATEGORY_RAILS_PER_DOMAIN);
    }, [content.movies.categories, content.movies.loaded, movieCategoryMap]);

    const seriesCategoryMap = useMemo(() => {
        const map = new Map<string, ContentItem[]>();
        if (!content.series.loaded) return map;
        for (const series of filteredSeries) {
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
                    image: series.cover,
                    type: 'series' as const,
                    rating: series.rating_5based,
                    data: series,
                });
            }
        }
        return map;
    }, [content.series.loaded, filteredSeries]);

    const seriesCategoryRails = useMemo(() => {
        if (!content.series.loaded || !content.series.categories) return [];
        const rails: CategoryRail[] = [];
        for (const category of content.series.categories) {
            const catId = String(category.category_id);
            const catName = category.category_name;
            if (!catName) continue;
            const items = seriesCategoryMap.get(catId);
            if (items && items.length > 0) {
                rails.push({ id: catId, name: catName, items });
            }
        }
        return rails.sort((a, b) => b.items.length - a.items.length).slice(0, MAX_CATEGORY_RAILS_PER_DOMAIN);
    }, [content.series.categories, content.series.loaded, seriesCategoryMap]);

    const liveCategoryMap = useMemo(() => {
        const map = new Map<string, ContentItem[]>();
        if (!content.live.loaded) return map;
        for (const channel of content.live.items) {
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
                    image: channel.stream_icon,
                    type: 'live' as const,
                    data: channel,
                });
            }
        }
        return map;
    }, [content.live.items, content.live.loaded]);

    const liveCategoryRails = useMemo(() => {
        if (!content.live.loaded || !content.live.categories) return [];
        const rails: CategoryRail[] = [];
        for (const category of content.live.categories) {
            const catId = String(category.category_id);
            const catName = category.category_name;
            if (!catName) continue;
            const items = liveCategoryMap.get(catId);
            if (items && items.length > 0) {
                rails.push({ id: catId, name: catName, items });
            }
        }
        return rails.sort((a, b) => b.items.length - a.items.length).slice(0, MAX_CATEGORY_RAILS_PER_DOMAIN);
    }, [content.live.categories, content.live.loaded, liveCategoryMap]);

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
            navigation.navigate('MovieDetail', {
                movie: {
                    stream_id: movieData.stream_id,
                    name: movieData.name,
                    stream_icon: movieData.stream_icon,
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
        if (!content.lastFetchTime) return 'Not synced yet';
        const now = Date.now();
        const diffMs = Math.max(0, now - content.lastFetchTime);
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Synced just now';
        if (diffMins < 60) return `Synced ${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        return `Synced ${diffHours}h ago`;
    }, [content.lastFetchTime]);

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

        if (forYouItems.length > 0) {
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

        if (showLive && popularChannels.length > 0) {
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

        if (showMovies && topRatedMovies.length > 0) {
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

    useEffect(() => {
        const preload: Array<string | undefined> = [featuredContent?.image];
        const prefetchCount = perf.tier === 'low' ? 4 : perf.tier === 'high' ? 8 : PREFETCH_ITEMS_PER_ROW;
        const addRowImages = (items: ContentItem[]) => {
            for (const item of items.slice(0, prefetchCount)) {
                preload.push(item.image);
            }
        };
        addRowImages(continueRowItems);
        addRowImages(popularChannels);
        addRowImages(recentMovies);
        addRowImages(recentSeries);
        prefetchImages(preload);
    }, [continueRowItems, featuredContent?.image, popularChannels, recentMovies, recentSeries, perf.tier]);

    useEffect(() => {
        const uris = [featuredContent?.image, nextFeatured?.image].filter(Boolean) as string[];
        for (const uri of uris) {
            if (!uri.startsWith('http')) continue;
            Image.prefetch(uri).catch(() => { });
        }
    }, [featuredContent?.image, nextFeatured?.image]);

    const renderSection = useCallback(({ item }: { item: HomeSection }) => {
        switch (item.type) {
            case 'hero':
                return (
                    <HeroBanner
                        item={item.item}
                        onPress={handleHeroInfo}
                        onPlayPress={handleHeroPlay}
                        onInfoPress={handleHeroInfo}
                    />
                );
            case 'row':
                return (
                    <ContentRow
                        title={item.title}
                        type={item.rowType}
                        items={item.items}
                        onItemPress={item.onItemPress}
                        onSeeAllPress={item.onSeeAllPress}
                        showSeeAll={item.showSeeAll}
                        accentColor={item.accentColor}
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
    }, [handleHeroInfo, handleHeroPlay, quickActionCardStyle]);

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
                data={sections}
                renderItem={renderSection}
                keyExtractor={(item) => item.key}
                // @ts-ignore
                estimatedItemSize={320}
                getItemType={getItemType}
                drawDistance={perf.home.drawDistance}
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
