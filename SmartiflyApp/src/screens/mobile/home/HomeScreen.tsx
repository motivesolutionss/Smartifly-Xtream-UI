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
    ScrollView,
    StyleSheet,
    RefreshControl,
    StatusBar,
    Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import NavBar from '../../../components/NavBar';
import HeroBanner from './components/HeroBanner';
import ContentRow from './components/ContentRow';

// Store - Using prefetched data!
import useStore from '../../../store';
import useFilterStore from '../../../store/filterStore';
import { useWatchHistoryStore, WatchProgress } from '../../../store/watchHistoryStore';
import { useContentFilter } from '../../../store/profileStore';

// Theme and Config
import { colors, spacing } from '../../../theme';
import { logger } from '../../../config';

// =============================================================================
// TYPES
// =============================================================================

interface HomeScreenProps {
    navigation: any;
}

// =============================================================================
// HOME SCREEN COMPONENT
// =============================================================================

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    // Get PREFETCHED content from store - uses new domain structure
    const content = useStore((state) => state.content);
    const userInfo = useStore((state) => state.userInfo);
    const forceRefresh = useStore((state) => state.forceRefresh);
    const getContentStats = useStore((state) => state.getContentStats);
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const getContinueWatching = useWatchHistoryStore((state) => state.getContinueWatching);

    // Profile Store
    const { filterContent } = useContentFilter();

    // Local state
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get stats for footer (uses domain structure now)
    const stats = getContentStats();
    const continueWatching = useMemo(() => getContinueWatching(10), [getContinueWatching]);

    // Get filter state
    const { selectedType, selectedCategory, setCategory } = useFilterStore();

    // Determine which content sections to show based on filter
    const showLive = !selectedType || selectedType === 'live';
    const showMovies = !selectedType || selectedType === 'movies';
    const showSeries = !selectedType || selectedType === 'series';

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

    // Featured content for hero banner (random selection from movies/series)
    const featuredContent = useMemo(() => {
        // Check if domains are loaded
        if (!content.movies.loaded && !content.series.loaded) return null;

        const filteredMovies = filterContent(content.movies.items);
        const filteredSeries = filterContent(content.series.items);

        const allContent = [
            ...(content.movies.loaded ? filteredMovies.slice(0, 10).map(m => ({
                id: `movie-${m.stream_id}`,
                type: 'movie' as const,
                name: m.name,
                image: m.backdrop_path?.[0] || m.stream_icon,
                rating: m.rating_5based,
                plot: m.plot,
                genre: m.genre,
                data: m,
            })) : []),
            ...(content.series.loaded ? filteredSeries.slice(0, 10).map(s => ({
                id: `series-${s.series_id}`,
                type: 'series' as const,
                name: s.name,
                image: s.backdrop_path?.[0] || s.cover,
                rating: s.rating_5based,
                plot: s.plot,
                genre: s.genre,
                data: s,
            })) : []),
        ];

        return allContent.length > 0
            ? allContent[Math.floor(Math.random() * allContent.length)]
            : null;
    }, [content.movies.loaded, content.movies.items, content.series.loaded, content.series.items, filterContent]);

    // Recently added movies
    const recentMovies = useMemo(() => {
        if (!content.movies.loaded) return [];

        let streams = filterContent(content.movies.items);

        // Filter by category if one is selected and we're in movies mode
        if (selectedType === 'movies' && selectedCategory) {
            streams = streams.filter(m => String(m.category_id) === String(selectedCategory));
        }

        return [...streams]
            .sort((a, b) => parseInt(b.added || '0', 10) - parseInt(a.added || '0', 10))
            .slice(0, 15)
            .map(m => ({
                id: String(m.stream_id),
                name: m.name,
                image: m.stream_icon,
                type: 'movie' as const,
                rating: m.rating_5based,
                data: m,
            }));
    }, [content.movies.items, content.movies.loaded, selectedType, selectedCategory, filterContent]);

    // Recently added series
    const recentSeries = useMemo(() => {
        if (!content.series.loaded) return [];

        let streams = filterContent(content.series.items);

        // Filter by category if one is selected and we're in series mode
        if (selectedType === 'series' && selectedCategory) {
            streams = streams.filter(s => String(s.category_id) === String(selectedCategory));
        }

        return [...streams]
            .sort((a, b) => new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime())
            .slice(0, 15)
            .map(s => ({
                id: String(s.series_id),
                name: s.name,
                image: s.cover,
                type: 'series' as const,
                rating: s.rating_5based,
                data: s,
            }));
    }, [content.series.items, content.series.loaded, selectedType, selectedCategory, filterContent]);

    // Top rated movies
    const topRatedMovies = useMemo(() => {
        if (!content.movies.loaded) return [];

        let streams = filterContent(content.movies.items);

        // Filter by category if one is selected and we're in movies mode
        if (selectedType === 'movies' && selectedCategory) {
            streams = streams.filter(m => String(m.category_id) === String(selectedCategory));
        }

        return [...streams]
            .sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0))
            .slice(0, 15)
            .map(m => ({
                id: String(m.stream_id),
                name: m.name,
                image: m.stream_icon,
                type: 'movie' as const,
                rating: m.rating_5based,
                data: m,
            }));
    }, [content.movies.items, content.movies.loaded, selectedType, selectedCategory, filterContent]);

    // Popular live channels
    const popularChannels = useMemo(() => {
        if (!content.live.loaded) return [];

        let streams = content.live.items;

        // Filter by category if one is selected and we're in live mode
        if (selectedType === 'live' && selectedCategory) {
            streams = streams.filter(ch => String(ch.category_id) === String(selectedCategory));
        }

        return streams.slice(0, 15).map(ch => ({
            id: String(ch.stream_id),
            name: ch.name,
            image: ch.stream_icon,
            type: 'live' as const,
            data: ch,
        }));
    }, [content.live.items, content.live.loaded, selectedType, selectedCategory]);

    // =============================================================================
    // CATEGORY-BASED SECTIONS (Dynamic - shows content by category)
    // =============================================================================

    // Movies grouped by category - iterate through ALL categories
    const movieCategories = useMemo(() => {
        if (!content.movies.loaded || !content.movies.categories) return [];

        const categoriesWithContent: { id: string; name: string; items: any[] }[] = [];
        const filteredAllMovies = filterContent(content.movies.items);

        // Iterate through CATEGORIES (not movies) - this ensures all categories are shown
        for (const category of content.movies.categories) {
            const catId = String(category.category_id);
            const catName = category.category_name;

            // Skip if no name
            if (!catName) continue;

            // Get movies in this category (limit to 15)
            const categoryMovies = filteredAllMovies
                .filter((m: any) => String(m.category_id) === catId)
                .slice(0, 15)
                .map((m: any) => ({
                    id: String(m.stream_id),
                    name: m.name,
                    image: m.stream_icon,
                    type: 'movie' as const,
                    rating: m.rating_5based,
                    data: m,
                }));

            // Only show categories with content
            if (categoryMovies.length > 0) {
                categoriesWithContent.push({
                    id: catId,
                    name: catName,
                    items: categoryMovies,
                });
            }
        }

        return categoriesWithContent;
    }, [content.movies.items, content.movies.categories, content.movies.loaded, filterContent]);

    // Series grouped by category - iterate through ALL categories
    const seriesCategories = useMemo(() => {
        if (!content.series.loaded || !content.series.categories) return [];

        const categoriesWithContent: { id: string; name: string; items: any[] }[] = [];
        const filteredAllSeries = filterContent(content.series.items);

        // Iterate through CATEGORIES (not series) - ensures all categories are shown
        for (const category of content.series.categories) {
            const catId = String(category.category_id);
            const catName = category.category_name;

            // Skip if no name
            if (!catName) continue;

            // Get series in this category (limit to 15)
            const categorySeries = filteredAllSeries
                .filter((s: any) => String(s.category_id) === catId)
                .slice(0, 15)
                .map((s: any) => ({
                    id: String(s.series_id),
                    name: s.name,
                    image: s.cover,
                    type: 'series' as const,
                    rating: s.rating_5based,
                    data: s,
                }));

            // Only show categories with content
            if (categorySeries.length > 0) {
                categoriesWithContent.push({
                    id: catId,
                    name: catName,
                    items: categorySeries,
                });
            }
        }

        return categoriesWithContent;
    }, [content.series.items, content.series.categories, content.series.loaded, filterContent]);

    // Live channels grouped by category - iterate through ALL categories
    const liveCategories = useMemo(() => {
        if (!content.live.loaded || !content.live.categories) return [];

        const categoriesWithContent: { id: string; name: string; items: any[] }[] = [];

        // Iterate through CATEGORIES
        for (const category of content.live.categories) {
            const catId = String(category.category_id);
            const catName = category.category_name;

            if (!catName) continue;

            // Get channels in this category (limit to 15)
            const categoryChannels = content.live.items
                .filter((ch: any) => String(ch.category_id) === catId)
                .slice(0, 15)
                .map((ch: any) => ({
                    id: String(ch.stream_id),
                    name: ch.name,
                    image: ch.stream_icon,
                    type: 'live' as const,
                    data: ch,
                }));

            if (categoryChannels.length > 0) {
                categoriesWithContent.push({
                    id: catId,
                    name: catName,
                    items: categoryChannels,
                });
            }
        }

        return categoriesWithContent;
    }, [content.live.items, content.live.categories, content.live.loaded]);

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

    const handleSearch = () => {
        navigation.navigate('Search');
    };

    const handleNotifications = () => {
        logger.debug('Notifications clicked - feature coming soon');
    };

    const handleProfile = () => {
        navigation.navigate('SettingsTab');
    };

    const handleContentPress = (item: any) => {
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
    };

    const handleContinuePress = (item: WatchProgress) => {
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
    };

    const handleSeeAll = (section: string) => {
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
    };

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

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 100 }
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Hero Banner */}
                {featuredContent && (
                    <HeroBanner
                        item={featuredContent}
                        onPress={() => handleContentPress({
                            ...featuredContent,
                            data: featuredContent,
                        })}
                    />
                )}

                {/* Continue Watching */}
                {continueWatching.length > 0 && (
                    <ContentRow
                        title="Continue Watching"
                        type="continue"
                        items={continueWatching.map((progress: WatchProgress) => ({
                            id: progress.id,
                            name: progress.title,
                            image: progress.thumbnail,
                            type: progress.type === 'movie' ? 'movie' : progress.type === 'series' ? 'series' : 'live',
                            progress: progress.progress,
                        }))}
                        onItemPress={(item) => {
                            const entry = continueWatching.find((progress: WatchProgress) => progress.id === item.id);
                            if (entry) handleContinuePress(entry);
                        }}
                        showSeeAll={false}
                        accentColor={colors.accent}
                    />
                )}

                {/* Content Rows - All INSTANT from cache! */}

                {/* Popular Live Channels */}
                {showLive && popularChannels.length > 0 && (
                    <ContentRow
                        title="Live Now"
                        type="live"
                        items={popularChannels}
                        onItemPress={handleContentPress}
                        onSeeAllPress={() => handleSeeAll('live')}
                        accentColor={colors.live}
                    />
                )}

                {/* Recently Added Movies */}
                {showMovies && recentMovies.length > 0 && (
                    <ContentRow
                        title="Recently Added Movies"
                        type="movies"
                        items={recentMovies}
                        onItemPress={handleContentPress}
                        onSeeAllPress={() => handleSeeAll('recent-movies')}
                        accentColor={colors.movies}
                    />
                )}

                {/* Recently Added Series */}
                {showSeries && recentSeries.length > 0 && (
                    <ContentRow
                        title="Recently Added Series"
                        type="series"
                        items={recentSeries}
                        onItemPress={handleContentPress}
                        onSeeAllPress={() => handleSeeAll('recent-series')}
                        accentColor={colors.series}
                    />
                )}

                {/* Top Rated Movies */}
                {showMovies && topRatedMovies.length > 0 && (
                    <ContentRow
                        title="Top Rated"
                        type="movies"
                        items={topRatedMovies}
                        onItemPress={handleContentPress}
                        onSeeAllPress={() => handleSeeAll('top-rated')}
                        accentColor={colors.accent}
                    />
                )}

                {/* Movie Categories - Dynamic rows for each category */}
                {showMovies && movieCategories.map((category) => (
                    <ContentRow
                        key={`movie-cat-${category.id}`}
                        title={category.name}
                        type="movies"
                        items={category.items}
                        onItemPress={handleContentPress}
                        onSeeAllPress={() => handleSeeAll('recent-movies')}
                        accentColor={colors.movies}
                    />
                ))}

                {/* Series Categories - Dynamic rows for each category */}
                {showSeries && seriesCategories.map((category) => (
                    <ContentRow
                        key={`series-cat-${category.id}`}
                        title={category.name}
                        type="series"
                        items={category.items}
                        onItemPress={handleContentPress}
                        onSeeAllPress={() => handleSeeAll('recent-series')}
                        accentColor={colors.series}
                    />
                ))}

                {/* Live Channel Categories - Dynamic rows for each category */}
                {showLive && liveCategories.map((category) => (
                    <ContentRow
                        key={`live-cat-${category.id}`}
                        title={category.name}
                        type="live"
                        items={category.items}
                        onItemPress={handleContentPress}
                        onSeeAllPress={() => handleSeeAll('live')}
                        accentColor={colors.live}
                    />
                ))}

                {/* Stats Footer */}
                <View style={styles.statsFooter}>
                    <Text style={styles.statsText}>
                        {stats.live} Live Channels • {stats.movies} Movies • {stats.series} Series
                    </Text>
                    <Text style={styles.cacheInfo}>
                        Content cached for instant access
                    </Text>
                </View>
            </ScrollView>
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
