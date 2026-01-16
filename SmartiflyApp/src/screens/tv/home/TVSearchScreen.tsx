import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Animated,
    TouchableOpacity,
} from 'react-native';
import { colors, scale, scaleFont, Icon } from '../../../theme';
import TVSearchKeypad from './components/TVSearchKeypad';
import useStore from '../../../store';
import TVContentCard from './components/TVContentCard';
import { useNavigation } from '@react-navigation/native';

// =============================================================================
// TYPES
// =============================================================================

interface TVSearchScreenProps {
    navigation: any; // Provided by parent or useNavigation
}

import {
    XtreamLiveStream,
    XtreamMovie,
    XtreamSeries,
} from '../../../api/xtream';

// =============================================================================
// TV SEARCH SCREEN
// =============================================================================

const TVSearchScreen: React.FC<TVSearchScreenProps> = () => {
    const navigation = useNavigation();
    const [query, setQuery] = useState('');
    // State for text suggestions
    const [textSuggestions, setTextSuggestions] = useState<string[]>([]);
    const [results, setResults] = useState<{ live: any[], movies: any[], series: any[] }>({ live: [], movies: [], series: [] });
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
    const { searchContent, isLoading: isStoreLoading } = useStore();

    // =========================================================================
    // LISTENERS
    // =========================================================================

    // Load suggested content on mount
    useEffect(() => {
        const { content } = useStore.getState();
        const getRandomItems = (items: any[], count: number) => {
            if (!items || items.length === 0) return [];
            const shuffled = [...items].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        };

        if (content.movies.loaded || content.series.loaded || content.live.loaded) {
            setSuggestedContent({
                movies: getRandomItems(content.movies.items, 10),
                series: getRandomItems(content.series.items, 10),
                live: getRandomItems(content.live.items, 10),
            });
        }
    }, []);

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
    }, [query]);

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
    }, []);

    // =========================================================================
    // ACTIONS
    // =========================================================================

    const performSearch = (searchText: string) => {
        setIsSearching(true);
        // We accept the sync result immediately, or if it's async we await it.
        // Based on store definition, searchContent returns object synchronously from cache.
        try {
            const result = searchContent(searchText);
            setResults(result);
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    };

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

    const handleContentPress = (item: any, type: 'live' | 'movie' | 'series') => {
        if (type === 'live') {
            navigation.navigate('FullscreenPlayer', { type: 'live', item });
        } else if (type === 'movie') {
            navigation.navigate('TVMovieDetail', { movie: item });
        } else if (type === 'series') {
            navigation.navigate('TVSeriesDetail', { series: item });
        }
    };

    // =========================================================================
    // RENDER HELPERS
    // =========================================================================

    const renderResultSection = (title: string, data: any[], type: 'live' | 'movie' | 'series') => {
        if (!data || data.length === 0) return null;

        return (
            <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>{title} ({data.length})</Text>
                <View style={styles.cardsGrid}>
                    {data.slice(0, 12).map((item) => ( // Limit to 12 items per section for perf
                        <View key={item.stream_id || item.series_id || item.id} style={styles.cardWrapper}>
                            <TVContentCard
                                item={{
                                    ...item,
                                    id: item.stream_id || item.series_id || item.id, // Ensure a unique ID
                                    title: item.name || item.title,
                                    image: item.stream_icon || item.cover,
                                    type: type
                                }}
                                onPress={() => handleContentPress(item, type)}
                                width={scale(140)} // Smaller cards for search results
                            />
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* LEFT: KEYPAD (1/3 Width) */}
            <View style={styles.leftPanel}>
                {/* <Text style={styles.inputLabel}>Search</Text> */}

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

            {/* RIGHT: RESULTS (2/3 Width) */}
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
        flex: 1.2, // ~35-40% width
        padding: scale(20),
        paddingTop: scale(40),
        backgroundColor: 'transparent', // Unified background
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
        zIndex: 10,
    },
    rightPanel: {
        flex: 2, // ~60-65% width
        backgroundColor: 'transparent',
    },
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
