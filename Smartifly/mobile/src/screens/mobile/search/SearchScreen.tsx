import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, Icon } from '../../../theme';
import NavBar from '../../../components/NavBar';
import ContentRow, { RowType } from '../home/components/ContentRow';
import { ContentItem } from '../home/components/ContentCard';
import useContentStore from '../../../store/contentStore';
import { useContentFilter } from '../../../store/profileStore';
import { scheduleIdleWork } from '../../../utils/idle';
import type { SearchScreenProps } from '../../../navigation/types';
import type { XtreamLiveStream, XtreamMovie, XtreamSeries } from '../../../api/xtream';

// =============================================================================
// TYPES
// =============================================================================

interface SearchResults {
    live: XtreamLiveStream[];
    movies: XtreamMovie[];
    series: XtreamSeries[];
}

interface SuggestedContent {
    movies: XtreamMovie[];
    series: XtreamSeries[];
    live: XtreamLiveStream[];
}

// =============================================================================
// CONFIG
// =============================================================================

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_MIN_CHARS = 2;
const RESULT_LIMIT = 12;
const SUGGESTION_LIMIT = 10;
const MOVIE_POOL_LIMIT = 200;
const SERIES_POOL_LIMIT = 200;
const LIVE_POOL_LIMIT = 120;
const SEARCH_WINDOW_SHORT_QUERY = 180;
const SEARCH_WINDOW_LONG_QUERY = 320;
const MAIN_TAB_BOTTOM_SPACER = 112;

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ live: [], movies: [], series: [] });
    const [suggestedContent, setSuggestedContent] = useState<SuggestedContent>({
        movies: [],
        series: [],
        live: [],
    });
    const [isSearching, setIsSearching] = useState(false);
    const [isPrepared, setIsPrepared] = useState(false);

    const searchContentLimited = useContentStore((state) => state.searchContentLimited);
    const moviesLoaded = useContentStore((state) => state.content.movies.loaded);
    const moviesItems = useContentStore((state) => state.content.movies.items);
    const seriesLoaded = useContentStore((state) => state.content.series.loaded);
    const seriesItems = useContentStore((state) => state.content.series.items);
    const liveLoaded = useContentStore((state) => state.content.live.loaded);
    const liveItems = useContentStore((state) => state.content.live.items);
    const contentPartial = useContentStore((state) => state.contentPartial);
    const ensureFullContent = useContentStore((state) => state.ensureFullContent);
    const { filterContent } = useContentFilter();

    const performSearch = useCallback((searchText: string) => {
        const trimmed = searchText.trim();
        if (!trimmed) {
            setResults({ live: [], movies: [], series: [] });
            return;
        }

        setIsSearching(true);
        try {
            const domainWindow = trimmed.length >= 5
                ? SEARCH_WINDOW_LONG_QUERY
                : SEARCH_WINDOW_SHORT_QUERY;
            const result = searchContentLimited(trimmed, {
                live: domainWindow,
                movies: domainWindow,
                series: domainWindow,
            });
            setResults({
                live: result.live,
                movies: filterContent(result.movies),
                series: filterContent(result.series),
            });
        } catch (error) {
            console.warn('[Search] Search failed', error);
        } finally {
            setIsSearching(false);
        }
    }, [filterContent, searchContentLimited]);

    useEffect(() => {
        if (contentPartial.live) {
            ensureFullContent('live');
        }
        if (contentPartial.movies) {
            ensureFullContent('movies');
        }
        if (contentPartial.series) {
            ensureFullContent('series');
        }
    }, [contentPartial.live, contentPartial.movies, contentPartial.series, ensureFullContent]);

    // Load suggested content (profile-aware)
    useEffect(() => {
        if (!moviesLoaded && !seriesLoaded && !liveLoaded) {
            setSuggestedContent({ movies: [], series: [], live: [] });
            setIsPrepared(false);
            return;
        }

        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            const getRandomItems = <T,>(items: T[], count: number): T[] => {
                if (!items || items.length === 0) return [];
                const max = Math.min(items.length, count);
                const result: T[] = [];
                const used = new Set<number>();
                while (result.length < max) {
                    const idx = Math.floor(Math.random() * items.length);
                    if (!used.has(idx)) {
                        used.add(idx);
                        result.push(items[idx]);
                    }
                }
                return result;
            };

            const moviePool = filterContent(moviesItems.slice(0, MOVIE_POOL_LIMIT));
            const seriesPool = filterContent(seriesItems.slice(0, SERIES_POOL_LIMIT));
            const livePool = liveItems.slice(0, LIVE_POOL_LIMIT);

            setSuggestedContent({
                movies: getRandomItems(moviePool, SUGGESTION_LIMIT),
                series: getRandomItems(seriesPool, SUGGESTION_LIMIT),
                live: getRandomItems(livePool, SUGGESTION_LIMIT),
            });
            setIsPrepared(true);
        });

        return () => task.cancel();
    }, [filterContent, liveItems, liveLoaded, moviesItems, moviesLoaded, seriesItems, seriesLoaded]);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim().length >= SEARCH_MIN_CHARS) {
                performSearch(query);
            } else {
                setResults({ live: [], movies: [], series: [] });
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
    }, [performSearch, query]);

    const handleClear = useCallback(() => {
        setQuery('');
        Keyboard.dismiss();
    }, []);

    const handleContentPress = useCallback((item: ContentItem) => {
        if (item.type === 'live') {
            const live = item.data as XtreamLiveStream | undefined;
            if (!live) return;
            (navigation as any).navigate('FullscreenPlayer', {
                type: 'live',
                item: {
                    stream_id: live.stream_id,
                    name: live.name,
                    stream_icon: live.stream_icon,
                    category_id: live.category_id,
                },
            });
            return;
        }

        if (item.type === 'movie') {
            const movie = item.data as XtreamMovie | undefined;
            if (!movie) return;
            navigation.navigate('MovieDetail', {
                movie: {
                    stream_id: movie.stream_id,
                    name: movie.name,
                    stream_icon: movie.stream_icon,
                    rating: movie.rating,
                    rating_5based: movie.rating_5based,
                    container_extension: movie.container_extension,
                    plot: movie.plot,
                    genre: movie.genre,
                    youtube_trailer: movie.youtube_trailer,
                },
            });
            return;
        }

        if (item.type === 'series') {
            const series = item.data as XtreamSeries | undefined;
            if (!series) return;
            navigation.navigate('SeriesDetail', { series });
        }
    }, [navigation]);

    const limitedResults = useMemo(() => ({
        movies: results.movies.slice(0, RESULT_LIMIT),
        series: results.series.slice(0, RESULT_LIMIT),
        live: results.live.slice(0, RESULT_LIMIT),
    }), [results]);

    const moviesResultItems = useMemo<ContentItem[]>(() => (
        limitedResults.movies.map((movie) => ({
            id: String(movie.stream_id),
            name: movie.name,
            image: movie.stream_icon,
            type: 'movie',
            rating: movie.rating_5based,
            data: movie,
        }))
    ), [limitedResults.movies]);

    const seriesResultItems = useMemo<ContentItem[]>(() => (
        limitedResults.series.map((series) => ({
            id: String(series.series_id),
            name: series.name,
            image: series.cover,
            type: 'series',
            rating: series.rating_5based,
            data: series,
        }))
    ), [limitedResults.series]);

    const liveResultItems = useMemo<ContentItem[]>(() => (
        limitedResults.live.map((live) => ({
            id: String(live.stream_id),
            name: live.name,
            image: live.stream_icon,
            type: 'live',
            data: live,
        }))
    ), [limitedResults.live]);

    const suggestedMovies = useMemo<ContentItem[]>(() => (
        suggestedContent.movies.map((movie) => ({
            id: String(movie.stream_id),
            name: movie.name,
            image: movie.stream_icon,
            type: 'movie',
            rating: movie.rating_5based,
            data: movie,
        }))
    ), [suggestedContent.movies]);

    const suggestedSeries = useMemo<ContentItem[]>(() => (
        suggestedContent.series.map((series) => ({
            id: String(series.series_id),
            name: series.name,
            image: series.cover,
            type: 'series',
            rating: series.rating_5based,
            data: series,
        }))
    ), [suggestedContent.series]);

    const suggestedLive = useMemo<ContentItem[]>(() => (
        suggestedContent.live.map((live) => ({
            id: String(live.stream_id),
            name: live.name,
            image: live.stream_icon,
            type: 'live',
            data: live,
        }))
    ), [suggestedContent.live]);

    const hasResults = useMemo(() => (
        moviesResultItems.length > 0 || seriesResultItems.length > 0 || liveResultItems.length > 0
    ), [liveResultItems.length, moviesResultItems.length, seriesResultItems.length]);

    const trimmedQuery = useMemo(() => query.trim(), [query]);
    const totalResults = useMemo(() => (
        moviesResultItems.length + seriesResultItems.length + liveResultItems.length
    ), [liveResultItems.length, moviesResultItems.length, seriesResultItems.length]);

    const renderSection = useCallback((title: string, type: RowType, items: ContentItem[], accentColor?: string) => {
        if (!items.length) return null;
        return (
            <ContentRow
                title={title}
                type={type}
                items={items}
                onItemPress={handleContentPress}
                showSeeAll={false}
                maxItems={RESULT_LIMIT}
                accentColor={accentColor}
            />
        );
    }, [handleContentPress]);

    return (
        <View style={styles.container}>
            <NavBar
                variant="content"
                title="Search"
                showBack
                showSearch={false}
            />

            <View style={styles.searchBarWrapper}>
                <Icon name="magnifyingGlass" size={20} color={colors.textMuted} />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search movies, series, live TV"
                    placeholderTextColor={colors.textMuted}
                    style={styles.searchInput}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    onSubmitEditing={() => performSearch(query)}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                        <Icon name="x" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {trimmedQuery.length >= SEARCH_MIN_CHARS && (
                <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                        <Icon
                            name={isSearching ? 'arrowCounterClockwise' : 'checkCircle'}
                            size={14}
                            color={isSearching ? colors.textMuted : colors.success}
                        />
                        <Text style={styles.metaChipText}>
                            {isSearching ? 'Searching...' : `${totalResults} results`}
                        </Text>
                    </View>
                    {!isSearching && trimmedQuery.length > 0 && (
                        <TouchableOpacity style={styles.metaClearChip} onPress={handleClear} activeOpacity={0.8}>
                            <Text style={styles.metaClearChipText}>Clear query</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <ScrollView
                style={styles.resultsScroll}
                contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {isSearching ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.helperText}>Searching...</Text>
                    </View>
                ) : trimmedQuery.length < SEARCH_MIN_CHARS ? (
                    <>
                        <Text style={styles.sectionHeading}>Suggested For You</Text>
                        {!isPrepared && (
                            <View style={styles.centerContent}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        )}
                        {isPrepared && !suggestedMovies.length && !suggestedSeries.length && !suggestedLive.length && (
                            <View style={styles.centerContent}>
                                <Text style={styles.helperText}>
                                    Type at least {SEARCH_MIN_CHARS} characters to search
                                </Text>
                            </View>
                        )}
                        {renderSection('Popular Movies', 'movies', suggestedMovies, colors.movies)}
                        {renderSection('Trending Series', 'series', suggestedSeries, colors.series)}
                        {renderSection('Live Channels', 'live', suggestedLive, colors.live)}
                    </>
                ) : !hasResults ? (
                    <View style={styles.centerContent}>
                        <Text style={styles.helperText}>No results found for "{trimmedQuery}"</Text>
                    </View>
                ) : (
                    <>
                        {renderSection('Movies', 'movies', moviesResultItems, colors.movies)}
                        {renderSection('Series', 'series', seriesResultItems, colors.series)}
                        {renderSection('Live TV', 'live', liveResultItems, colors.live)}
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.base,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.backgroundInput,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        minHeight: 54,
        gap: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 2,
    },
    metaRow: {
        marginHorizontal: spacing.base,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.round,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    metaChipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    metaClearChip: {
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    metaClearChipText: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 15,
        paddingVertical: spacing.sm,
    },
    clearButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultsScroll: {
        flex: 1,
    },
    resultsContent: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    sectionHeading: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        marginHorizontal: spacing.base,
        marginBottom: spacing.md,
        marginTop: spacing.sm,
        letterSpacing: 0.1,
    },
    centerContent: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.base,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
    },
    helperText: {
        color: colors.textMuted,
        fontSize: 14,
        marginTop: spacing.sm,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
    },
});

export default SearchScreen;

