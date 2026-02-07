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

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    StyleSheet,
    RefreshControl,
    StatusBar,
    Text,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import NavBar from '../../../components/NavBar';
import HeroBanner, { HeroBannerItem } from './components/HeroBanner';
import ContentRow, { RowType } from './components/ContentRow';
import { ContentItem } from './components/ContentCard';

// Store - Using prefetched data!
import useStore from '../../../store';
import useFilterStore from '../../../store/filterStore';
import { useWatchHistoryStore, WatchProgress } from '../../../store/watchHistoryStore';
import { useContentFilter } from '../../../store/profileStore';
import { prefetchImages } from '../../../utils/image';

// Theme and Config
import { colors, spacing } from '../../../theme';
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
    };

const RAIL_ITEM_LIMIT = 15;
const MAX_CATEGORY_RAILS_PER_DOMAIN = 8;
const PREFETCH_ITEMS_PER_ROW = 6;

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

    // Get PREFETCHED content from store - uses new domain structure
    const content = useStore((state) => state.content);
    const userInfo = useStore((state) => state.userInfo);
    const forceRefresh = useStore((state) => state.forceRefresh);
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const continueWatching = useWatchHistoryStore((state) => state.getContinueWatching(10));

    // Profile Store
    const { filterContent } = useContentFilter();

    // Local state
    const [isRefreshing, setIsRefreshing] = useState(false);

    const stats = useMemo(() => ({
        live: content.live.items.length,
        movies: content.movies.items.length,
        series: content.series.items.length,
    }), [content.live.items.length, content.movies.items.length, content.series.items.length]);

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

    // Featured content for hero banner (stable pick to avoid re-randomizing on rerenders)
    const featuredContent = useMemo<FeaturedContent | null>(() => {
        if (!content.movies.loaded && !content.series.loaded) return null;

        const movieCandidates = content.movies.loaded
            ? filteredMovies.slice(0, 20).map((m) => ({
                id: `movie-${m.stream_id}`,
                type: 'movie' as const,
                name: m.name,
                image: m.backdrop_path?.[0] || m.stream_icon,
                rating: m.rating_5based,
                plot: m.plot,
                genre: m.genre,
                data: m,
            }))
            : [];

        const seriesCandidates = content.series.loaded
            ? filteredSeries.slice(0, 20).map((s) => ({
                id: `series-${s.series_id}`,
                type: 'series' as const,
                name: s.name,
                image: s.backdrop_path?.[0] || s.cover,
                rating: s.rating_5based,
                plot: s.plot,
                genre: s.genre,
                data: s,
            }))
            : [];

        const allContent = [...movieCandidates, ...seriesCandidates];

        if (allContent.length === 0) return null;

        return allContent.reduce((best, item) => (
            (item.rating ?? 0) > (best.rating ?? 0) ? item : best
        ));
    }, [content.movies.loaded, content.series.loaded, filteredMovies, filteredSeries]);

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

    // =============================================================================
    // CATEGORY-BASED SECTIONS (Dynamic - shows content by category)
    // =============================================================================

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

        return rails
            .sort((a, b) => b.items.length - a.items.length)
            .slice(0, MAX_CATEGORY_RAILS_PER_DOMAIN);
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

        return rails
            .sort((a, b) => b.items.length - a.items.length)
            .slice(0, MAX_CATEGORY_RAILS_PER_DOMAIN);
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

        return rails
            .sort((a, b) => b.items.length - a.items.length)
            .slice(0, MAX_CATEGORY_RAILS_PER_DOMAIN);
    }, [content.live.categories, content.live.loaded, liveCategoryMap]);

    // =============================================================================
    // HANDLERS
    // =============================================================================

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await forceRefresh();
        } catch (error) {
            logger.error('Refresh failed', error);
        }
        setIsRefreshing(false);
    }, [forceRefresh]);

    const handleSearch = useCallback(() => {
        navigation.navigate('Search');
    }, [navigation]);

    const handleNotifications = useCallback(() => {
        logger.debug('Notifications clicked - feature coming soon');
    }, []);

    const handleProfile = useCallback(() => {
        navigation.navigate('SettingsTab');
    }, [navigation]);

    const handleContentPress = useCallback((item: any) => {
        if (item.type === 'live') {
            navigation.navigate('Player', {
                type: 'live',
                item: {
                    stream_id: item.data.stream_id,
                    name: item.data.name,
                    stream_icon: item.data.stream_icon,
                },
            });
        } else if (item.type === 'movie') {
            // Navigate to MovieDetail instead of direct play
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
            navigation.navigate('Player', {
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
            navigation.navigate('Player', {
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

    const handleSeeAll = useCallback((section: string) => {
        switch (section) {
            case 'recent-movies':
            case 'top-rated':
                navigation.navigate('MoviesTab');
                break;
            case 'recent-series':
                navigation.navigate('SeriesTab');
                break;
            case 'live':
                navigation.navigate('LiveTab');
                break;
        }
    }, [navigation]);

    // =============================================================================
    // SECTION DATA (Virtualized)
    // =============================================================================

    const sections = useMemo<HomeSection[]>(() => {
        const list: HomeSection[] = [];

        if (featuredContent) {
            list.push({
                key: `hero-${featuredContent.id}`,
                type: 'hero',
                item: featuredContent,
            });
        }

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
        handleContinueItemPress,
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
        handleContentPress,
        handleSeeAll,
    ]);

    useEffect(() => {
        const preload: Array<string | undefined> = [featuredContent?.image];

        const addRowImages = (items: ContentItem[]) => {
            for (const item of items.slice(0, PREFETCH_ITEMS_PER_ROW)) {
                preload.push(item.image);
            }
        };

        addRowImages(continueRowItems);
        addRowImages(popularChannels);
        addRowImages(recentMovies);
        addRowImages(recentSeries);

        prefetchImages(preload);
    }, [continueRowItems, featuredContent?.image, popularChannels, recentMovies, recentSeries]);

    const renderSection = useCallback(({ item }: { item: HomeSection }) => {
        switch (item.type) {
            case 'hero':
                return (
                    <HeroBanner
                        item={item.item}
                        onPress={() => handleContentPress(item.item)}
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
    }, [handleContentPress]);

    const getItemType = useCallback((item: HomeSection) => item.type, []);

    // =============================================================================
    // RENDER - NO LOADING STATE! Data is already prefetched!
    // =============================================================================

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            {/* NavBar */}
            <NavBar
                variant="home"
                username={userInfo?.username}
                onSearchPress={handleSearch}
                onNotificationPress={handleNotifications}
                onProfilePress={handleProfile}
            />

            <FlashList
                style={styles.scrollView}
                data={sections}
                renderItem={renderSection}
                keyExtractor={(item) => item.key}
                // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                estimatedItemSize={320}
                getItemType={getItemType}
                drawDistance={600}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 100 }
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
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
