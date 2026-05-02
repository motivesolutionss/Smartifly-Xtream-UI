import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    Pressable,
    Image,
    LayoutChangeEvent,
} from 'react-native';
import { colors, scale, scaleFont, Icon } from '../../../theme';
import TVSearchKeypad from './components/TVSearchKeypad';
import useStore from '../../../store';
import TVContentCard from './components/TVContentCard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    XtreamLiveStream,
    XtreamMovie,
    XtreamSeries,
} from '../../../api/xtream';
import { TVSearchScreenProps, RootStackParamList, MovieItem, SeriesItem, LiveStreamItem } from '../../../navigation/types';
import { useContentFilter } from '../../../store/profileStore';
import { scheduleIdleWork } from '../../../utils/idle';
import TVLoadingState from '../components/TVLoadingState';
import { usePerfProfile } from '../../../utils/perf';
import { logger } from '../../../config';

// =============================================================================
// TYPES
// =============================================================================

interface SearchResults {
    live: XtreamLiveStream[];
    movies: XtreamMovie[];
    series: XtreamSeries[];
}

const SEARCH_WINDOW_SHORT_QUERY = 160;
const SEARCH_WINDOW_LONG_QUERY = 320;
const SEARCH_GRID_GAP = 16;
const MOVIE_SERIES_COLUMNS = 4;
const LIVE_COLUMNS = 3;

// =============================================================================
// TV SEARCH SCREEN
// =============================================================================


const TVSearchScreen: React.FC<TVSearchScreenProps> = ({ focusEntryRef }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [rightPanelWidth, setRightPanelWidth] = useState(0);
    const [query, setQuery] = useState('');
    const [focusedSuggestion, setFocusedSuggestion] = useState<number | null>(null);
    // State for text suggestions
    const [textSuggestions] = useState<string[]>([]);
    const [results, setResults] = useState<SearchResults>({ live: [], movies: [], series: [] });
    // State for suggested content
    const [suggestedContent, setSuggestedContent] = useState<{
        movies: XtreamMovie[];
        series: XtreamSeries[];
        live: XtreamLiveStream[];
    }>({ movies: [], series: [], live: [] });

    const [isSearching, setIsSearching] = useState(false);
    const [isPrepared, setIsPrepared] = useState(false);
    const perf = usePerfProfile();
    const enableGlow = perf.enableFocusGlow;


    // Animation for the "focused" search bar state (since it's always the active input method here)
    const glowAnim = React.useRef(new Animated.Value(0.6)).current; // Constant subtle glow
    const glowStyle = useMemo(() => ({
        opacity: enableGlow ? glowAnim : 0,
        shadowColor: colors.accent || '#00E5FF',
    }), [enableGlow, glowAnim]);

    // Store access (narrow selectors to avoid re-render on other domains)
    const searchContentLimited = useStore((state) => state.searchContentLimited);
    const moviesLoaded = useStore((state) => state.content.movies.loaded);
    const moviesItems = useStore((state) => state.content.movies.items);
    const seriesLoaded = useStore((state) => state.content.series.loaded);
    const seriesItems = useStore((state) => state.content.series.items);
    const liveLoaded = useStore((state) => state.content.live.loaded);
    const liveItems = useStore((state) => state.content.live.items);
    const { filterContent } = useContentFilter();

    // =========================================================================
    // ACTIONS
    // =========================================================================

    const performSearch = useCallback((searchText: string) => {
        setIsSearching(true);
        try {
            const trimmed = searchText.trim();
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
        } catch (e) {
            logger.error('TVSearch: search failed', e);
        } finally {
            setIsSearching(false);
        }
    }, [searchContentLimited, filterContent]);

    // =========================================================================
    // LISTENERS
    // =========================================================================

    // Load suggested content on mount or when profile changes
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

            const movieLimit = perf.tier === 'low' ? 120 : 200;
            const seriesLimit = perf.tier === 'low' ? 120 : 200;
            const liveLimit = perf.tier === 'low' ? 80 : 120;
            const moviePool = filterContent(moviesItems.slice(0, movieLimit));
            const seriesPool = filterContent(seriesItems.slice(0, seriesLimit));
            const livePool = liveItems.slice(0, liveLimit);

            setSuggestedContent({
                movies: getRandomItems(moviePool, 10),
                series: getRandomItems(seriesPool, 10),
                live: getRandomItems(livePool, 10),
            });
            setIsPrepared(true);
        });

        return () => task.cancel();
    }, [
        filterContent,
        moviesItems,
        moviesLoaded,
        seriesItems,
        seriesLoaded,
        liveItems,
        liveLoaded,
        perf.tier
    ]);

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim().length > 1) { // Search after 2 chars
                performSearch(query);
            } else {
                setResults({ live: [], movies: [], series: [] });
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [query, performSearch]);

    // Pulse animation for the search bar to show it's active
    useEffect(() => {
        if (!enableGlow) {
            glowAnim.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.6,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => {
            loop.stop();
        };
    }, [enableGlow, glowAnim]);



    const handleKeyPress = useCallback((key: string) => {
        setQuery(prev => prev + key);
    }, []);

    const handleBackspace = useCallback(() => {
        setQuery(prev => prev.slice(0, -1));
    }, []);

    const handleSpace = useCallback(() => {
        setQuery(prev => prev + ' ');
    }, []);

    const handleClear = useCallback(() => {
        setQuery('');
    }, []);

    const handleContentPress = useCallback((
        item: XtreamLiveStream | XtreamMovie | XtreamSeries,
        type: 'live' | 'movie' | 'series'
    ) => {
        if (type === 'live') {
            // Cast to LiveStreamItem - XtreamLiveStream has compatible properties
            navigation.navigate('FullscreenPlayer', { type: 'live', item: item as unknown as LiveStreamItem });
        } else if (type === 'movie') {
            // Cast to MovieItem - XtreamMovie has compatible properties
            navigation.navigate('TVMovieDetail', { movie: item as unknown as MovieItem });
        } else if (type === 'series') {
            // Cast to SeriesItem - XtreamSeries has compatible properties
            navigation.navigate('TVSeriesDetail', { series: item as unknown as SeriesItem });
        }
    }, [navigation]);

    // =========================================================================
    // RENDER HELPERS
    // =========================================================================

    // Helper function to safely extract IDs and properties from different content types
    const getItemId = useCallback((item: XtreamLiveStream | XtreamMovie | XtreamSeries): string | number => {
        if ('stream_id' in item) return item.stream_id;
        if ('series_id' in item) return item.series_id;
        return 0;
    }, []);

    const getItemName = useCallback((item: XtreamLiveStream | XtreamMovie | XtreamSeries): string => {
        return item.name;
    }, []);

    const getItemImage = useCallback((item: XtreamLiveStream | XtreamMovie | XtreamSeries): string => {
        if ('stream_icon' in item && item.stream_icon) return item.stream_icon;
        if ('cover' in item && item.cover) return item.cover;
        return '';
    }, []);

    const limitedResults = useMemo(() => ({
        movies: results.movies.slice(0, 12),
        series: results.series.slice(0, 12),
        live: results.live.slice(0, 12),
    }), [results]);

    const cardLayout = useMemo(() => {
        const contentHorizontalPadding = scale(30) * 2;
        const gapPx = scale(SEARCH_GRID_GAP);
        const usableWidth = Math.max(0, rightPanelWidth - contentHorizontalPadding);

        const movieSeriesWidth = Math.floor(
            (usableWidth - (gapPx * (MOVIE_SERIES_COLUMNS - 1))) / MOVIE_SERIES_COLUMNS
        );
        const liveWidth = Math.floor(
            (usableWidth - (gapPx * (LIVE_COLUMNS - 1))) / LIVE_COLUMNS
        );

        return {
            movieSeriesWidth: Math.max(scale(150), movieSeriesWidth),
            movieSeriesHeight: Math.max(scale(220), Math.floor(movieSeriesWidth * 1.42)),
            liveWidth: Math.max(scale(220), liveWidth),
            liveHeight: scale(150),
        };
    }, [rightPanelWidth]);

    const handleRightPanelLayout = useCallback((event: LayoutChangeEvent) => {
        const nextWidth = Math.floor(event.nativeEvent.layout.width);
        setRightPanelWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    }, []);

    const renderResultSection = (title: string, data: (XtreamLiveStream | XtreamMovie | XtreamSeries)[], type: 'live' | 'movie' | 'series') => {
        if (!data || data.length === 0) return null;
        const isLiveSection = type === 'live';
        const columns = isLiveSection ? LIVE_COLUMNS : MOVIE_SERIES_COLUMNS;
        const sectionCardWidth = isLiveSection ? cardLayout.liveWidth : cardLayout.movieSeriesWidth;
        const sectionCardHeight = isLiveSection ? cardLayout.liveHeight : cardLayout.movieSeriesHeight;

        return (
            <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>{title} ({data.length})</Text>
                <View style={styles.cardsGrid}>
                    {data.map((item, index) => (
                        <View
                            key={getItemId(item)}
                            style={[
                                styles.cardWrapper,
                                {
                                    marginRight: (index + 1) % columns === 0 ? 0 : scale(SEARCH_GRID_GAP),
                                },
                            ]}
                        >
                            <TVContentCard
                                item={{
                                    id: getItemId(item),
                                    title: getItemName(item),
                                    image: getItemImage(item),
                                    type: type,
                                }}
                                onPress={() => handleContentPress(item, type)}
                                width={sectionCardWidth}
                                height={sectionCardHeight}
                                style={styles.searchCard}
                            />
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* LEFT: KEYPAD (1/4 Width) - Reduced width */}
            <View style={styles.leftPanel}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../../assets/smartifly_icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* SEARCH BAR - Styled like TVInput */}
                <View style={styles.searchBarWrapper}>
                    {/* Glow Effect (Absolute behind) */}
                    <Animated.View
                        style={[styles.glowEffect, glowStyle]}
                    />

                    {/* Background & Border */}
                    <View style={styles.searchBarContainer}>
                        {/* Left Icon */}
                        <View style={styles.searchIconContainer}>
                            <Icon name="search" size={scale(24)} color="#FFFFFF" />
                        </View>

                        {/* Input Text */}
                        <Text style={styles.inputText}>
                            {query || <Text style={styles.placeholderText}>Type to search...</Text>}
                        </Text>

                        {/* Right Icon / Clear */}
                        {query.length > 0 && (
                            <View style={styles.clearIconContainer}>
                                <Icon name="x" size={scale(20)} color="rgba(255,255,255,0.5)" />
                            </View>
                        )}
                    </View>
                </View>

                <TVSearchKeypad
                    onKeyPress={handleKeyPress}
                    onBackspace={handleBackspace}
                    onSpace={handleSpace}
                    onClear={handleClear}
                    // @ts-ignore - Prop exists in TVSearchKeypad but TS server sometimes fails to resolve it
                    firstKeyRef={focusEntryRef}
                />


                {/* SEARCH SUGGESTIONS */}
                {query.length > 0 && textSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        {textSuggestions.map((suggestion, index) => (
                            <Pressable
                                key={index}
                                style={[
                                    styles.suggestionButton,
                                    focusedSuggestion === index && styles.suggestionButtonFocused,
                                ]}
                                onFocus={() => setFocusedSuggestion(index)}
                                onBlur={() => setFocusedSuggestion((current) => current === index ? null : current)}
                                onPress={() => {
                                    setQuery(suggestion);
                                    const domainWindow = suggestion.length >= 5
                                        ? SEARCH_WINDOW_LONG_QUERY
                                        : SEARCH_WINDOW_SHORT_QUERY;
                                    const next = useStore.getState().searchContentLimited(suggestion, {
                                        live: domainWindow,
                                        movies: domainWindow,
                                        series: domainWindow,
                                    });
                                    setResults({
                                        live: next.live,
                                        movies: filterContent(next.movies),
                                        series: filterContent(next.series),
                                    });
                                }}
                            >
                                <Text style={styles.suggestionText} numberOfLines={1}>
                                    {suggestion}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>

            {/* RIGHT: RESULTS (3/4 Width) - Expanded */}
            <View style={styles.rightPanel} onLayout={handleRightPanelLayout}>
                {isSearching ? (
                    <TVLoadingState style={styles.centerContainer} />
                ) : !isPrepared ? (
                    <TVLoadingState style={styles.centerContainer} />
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        overScrollMode="never"
                        contentContainerStyle={styles.resultsContent}
                    >
                        {query.length < 2 ? (
                            // EMPTY STATE: Show Suggested Content
                            <>
                                <Text style={styles.sectionTitle}>Suggested For You</Text>

                                {suggestedContent.movies.length > 0 &&
                                    renderResultSection('Popular Movies', suggestedContent.movies, 'movie')}

                                {suggestedContent.series.length > 0 &&
                                    renderResultSection('Trending Series', suggestedContent.series, 'series')}

                                {suggestedContent.live.length > 0 &&
                                    renderResultSection('Live Channels', suggestedContent.live, 'live')}

                                {suggestedContent.movies.length === 0 &&
                                    suggestedContent.series.length === 0 &&
                                    suggestedContent.live.length === 0 && (
                                        <View style={styles.centerContainer}>
                                            <Text style={styles.emptyText}>
                                                Type at least 2 characters{'\n'}to search movies, series, and channels.
                                            </Text>
                                        </View>
                                    )}
                            </>
                        ) : (
                            // SEARCH RESULTS
                            <>
                                {results.movies.length === 0 && results.series.length === 0 && results.live.length === 0 ? (
                                    <View style={styles.centerContainer}>
                                        <Text style={styles.emptyText}>No results found for "{query}"</Text>
                                    </View>
                                ) : (
                                    <>
                                        {renderResultSection('Movies', limitedResults.movies, 'movie')}
                                        {renderResultSection('Series', limitedResults.series, 'series')}
                                        {renderResultSection('Live TV', limitedResults.live, 'live')}
                                    </>
                                )}
                            </>
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.background,
    },
    leftPanel: {
        flex: 1.2, // ~25% width (Adjusted ratio)
        padding: scale(20),
        paddingTop: scale(40),
        backgroundColor: 'transparent', // Unified background
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
        zIndex: 10,
    },
    rightPanel: {
        flex: 3, // ~75% width (Expanded)
        backgroundColor: 'transparent',
    },
    // ...
    inputLabel: {
        fontSize: scaleFont(14),
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.65)',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: scale(14),
    },
    // New Search Bar Styles
    searchBarWrapper: {
        marginBottom: scale(20),
        position: 'relative',
        height: scale(60), // Match container height for wrapper
    },
    glowEffect: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: scale(18),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: scale(30),
        elevation: 0, // Disable native elevation for custom glow view
        backgroundColor: 'transparent', // Ensure no background interferes
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundInput, // Theme color
        borderRadius: scale(18),
        borderWidth: 1,
        borderColor: colors.accent || '#00E5FF', // Focused border color
        height: '100%',
        paddingHorizontal: scale(16),
        zIndex: 2, // Ensure content is above glow
    },
    searchIconContainer: {
        marginRight: scale(12),
    },
    logoContainer: {
        alignItems: 'flex-start',
        marginBottom: scale(20),
    },
    logo: {
        width: scale(250),
        height: scale(100),
    },
    inputText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: scaleFont(20),
        fontWeight: '500',
    },
    placeholderText: {
        color: 'rgba(255, 255, 255, 0.3)',
    },
    clearIconContainer: {
        marginLeft: scale(8),
    },
    // Suggestion Styles
    suggestionsContainer: {
        marginTop: scale(20),
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(10),
    },
    suggestionButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: scale(8),
        paddingHorizontal: scale(16),
        borderRadius: scale(20),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    suggestionButtonFocused: {
        borderColor: colors.accent,
        backgroundColor: 'rgba(0, 229, 255, 0.12)',
        transform: [{ scale: 1.04 }],
    },
    suggestionText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: scaleFont(14),
    },
    // Results Styles
    resultsContent: {
        padding: scale(30),
        paddingBottom: scale(100),
    },
    resultSection: {
        marginBottom: scale(30),
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: scaleFont(24),
        fontWeight: '600',
        marginBottom: scale(15),
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        paddingLeft: scale(10),
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cardWrapper: {
        marginBottom: scale(16),
    },
    searchCard: {
        marginRight: 0,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: scale(400),
    },
    emptyText: {
        color: '#888',
        fontSize: scaleFont(18),
        textAlign: 'center',
        lineHeight: scale(28),
    },
});

export default TVSearchScreen;
