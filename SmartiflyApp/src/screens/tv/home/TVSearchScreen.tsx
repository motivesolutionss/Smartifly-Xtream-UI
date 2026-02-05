import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Animated,
    TouchableOpacity,
    Image,
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

// =============================================================================
// TYPES
// =============================================================================

interface SearchResults {
    live: XtreamLiveStream[];
    movies: XtreamMovie[];
    series: XtreamSeries[];
}

// =============================================================================
// TV SEARCH SCREEN
// =============================================================================

const TVSearchScreen: React.FC<TVSearchScreenProps> = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [query, setQuery] = useState('');
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


    // Animation for the "focused" search bar state (since it's always the active input method here)
    const glowAnim = React.useRef(new Animated.Value(0.6)).current; // Constant subtle glow

    // Store access
    const { searchContent, content } = useStore();
    const { filterContent } = useContentFilter();

    // =========================================================================
    // ACTIONS
    // =========================================================================

    const performSearch = useCallback((searchText: string) => {
        setIsSearching(true);
        try {
            const result = searchContent(searchText);
            setResults({
                live: result.live,
                movies: filterContent(result.movies),
                series: filterContent(result.series),
            });
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    }, [searchContent, filterContent]);

    // =========================================================================
    // LISTENERS
    // =========================================================================

    // Load suggested content on mount or when profile changes
    useEffect(() => {
        const getRandomItems = <T extends XtreamLiveStream | XtreamMovie | XtreamSeries>(items: T[], count: number): T[] => {
            if (!items || items.length === 0) return [];
            // Slice first to avoid massive shuffles if list is big, but then shuffle the slice
            const pool = items.slice(0, 100);
            const shuffled = [...pool].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        };

        if (content.movies.loaded || content.series.loaded || content.live.loaded) {
            setSuggestedContent({
                movies: filterContent(getRandomItems(content.movies.items, 30)).slice(0, 10),
                series: filterContent(getRandomItems(content.series.items, 30)).slice(0, 10),
                live: getRandomItems(content.live.items, 10),
            });
        }
    }, [filterContent, content.movies.items, content.movies.loaded, content.series.items, content.series.loaded, content.live.items, content.live.loaded]);

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
        Animated.loop(
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
        ).start();
    }, [glowAnim]);



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

    const handleContentPress = (item: XtreamLiveStream | XtreamMovie | XtreamSeries, type: 'live' | 'movie' | 'series') => {
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
    };

    // =========================================================================
    // RENDER HELPERS
    // =========================================================================

    // Helper function to safely extract IDs and properties from different content types
    const getItemId = (item: XtreamLiveStream | XtreamMovie | XtreamSeries): string | number => {
        if ('stream_id' in item) return item.stream_id;
        if ('series_id' in item) return item.series_id;
        return 0;
    };

    const getItemName = (item: XtreamLiveStream | XtreamMovie | XtreamSeries): string => {
        return item.name;
    };

    const getItemImage = (item: XtreamLiveStream | XtreamMovie | XtreamSeries): string => {
        if ('stream_icon' in item && item.stream_icon) return item.stream_icon;
        if ('cover' in item && item.cover) return item.cover;
        return '';
    };

    const renderResultSection = (title: string, data: (XtreamLiveStream | XtreamMovie | XtreamSeries)[], type: 'live' | 'movie' | 'series') => {
        if (!data || data.length === 0) return null;

        return (
            <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>{title} ({data.length})</Text>
                <View style={styles.cardsGrid}>
                    {data.slice(0, 12).map((item) => ( // Limit to 12 items per section for perf
                        <View key={getItemId(item)} style={styles.cardWrapper}>
                            <TVContentCard
                                item={{
                                    id: getItemId(item),
                                    title: getItemName(item),
                                    image: getItemImage(item),
                                    type: type,
                                }}
                                onPress={() => handleContentPress(item, type)}
                                width={scale(160)} // Slightly larger cards to fill space
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
                        style={[
                            styles.glowEffect,
                            {
                                opacity: glowAnim,
                                shadowColor: colors.accent || '#00E5FF',
                            },
                        ]}
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
                />


                {/* SEARCH SUGGESTIONS */}
                {query.length > 0 && textSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        {textSuggestions.map((suggestion, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.suggestionButton}
                                onPress={() => {
                                    setQuery(suggestion);
                                    setResults(useStore.getState().searchContent(suggestion)); // Trigger search
                                }}
                            >
                                <Text style={styles.suggestionText} numberOfLines={1}>
                                    {suggestion}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* RIGHT: RESULTS (3/4 Width) - Expanded */}
            <View style={styles.rightPanel}>
                {isSearching ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
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
                                        {renderResultSection('Movies', results.movies, 'movie')}
                                        {renderResultSection('Series', results.series, 'series')}
                                        {renderResultSection('Live TV', results.live, 'live')}
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
        gap: scale(15),
    },
    cardWrapper: {
        marginBottom: scale(15),
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
    }
});

export default TVSearchScreen;
