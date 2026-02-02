/**
 * Smartifly SearchScreen
 * 
 * Global search across all content:
 * - Auto-focus search input
 * - Debounced search with cancellation guard
 * - Tab filtering (All, Live, Movies, Series)
 * - Persisted recent searches history
 * - Categorized results
 * - Empty states
 * - Uses domain structure for content access
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    StatusBar,
    Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import SearchInput, { SearchInputRef } from './components/SearchInput';
import SearchTabs, { SearchTabType } from './components/SearchTabs';
import RecentSearches, { RecentSearch, TrendingSearches } from './components/RecentSearches';
import SearchResults, { SearchResultItem, SearchResultsData, SearchResultsSkeleton } from './components/SearchResults';
import EmptySearchState from './components/EmptySearchState';

// Store and utilities
import useStore from '../../../store';
import { colors, spacing } from '../../../theme';
import { logger } from '../../../config';

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

interface SearchScreenProps {
    navigation: any;
}

const TRENDING_SEARCHES = [
    'News',
    'Sports',
    'Movies 2024',
    'Action',
];

const RECENT_SEARCHES_KEY = '@smartifly_recent_searches';

// =============================================================================
// SEARCH SCREEN COMPONENT
// =============================================================================

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const searchInputRef = useRef<SearchInputRef>(null);

    // Search cancellation token - prevents out-of-order results
    const searchTokenRef = useRef(0);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTabType>('all');
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Results state
    const [results, setResults] = useState<SearchResultsData>({
        live: [],
        movies: [],
        series: [],
    });

    // Recent searches state
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

    // Store integration - uses new domain structure
    const content = useStore((state) => state.content);

    // =============================================================================
    // RECENT SEARCHES PERSISTENCE
    // =============================================================================

    // Load recent searches on mount
    useEffect(() => {
        const loadRecentSearches = async () => {
            try {
                const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setRecentSearches(parsed);
                    }
                }
            } catch (error: any) {
                logger.error('Failed to load recent searches', {
                    message: error?.message || 'Unknown error',
                });
            }
        };
        loadRecentSearches();
    }, []);

    // Persist recent searches whenever they change
    const persistRecentSearches = useCallback(async (searches: RecentSearch[]) => {
        try {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
        } catch (error: any) {
            logger.error('Failed to persist recent searches', {
                message: error?.message || 'Unknown error',
            });
        }
    }, []);

    // =============================================================================
    // SEARCH LOGIC
    // =============================================================================

    // Perform search with cancellation guard
    const performSearch = useCallback(async (query: string) => {
        // Increment search token for this search
        const currentToken = ++searchTokenRef.current;

        if (!query.trim()) {
            setResults({ live: [], movies: [], series: [] });
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        try {
            // Pre-normalize query once (micro-optimization)
            const lowerQuery = query.trim().toLowerCase();

            // 1. Filter Live Channels (using new domain structure)
            const liveStreams = content.live.loaded ? content.live.items : [];
            const liveResults: SearchResultItem[] = liveStreams
                .filter(item => item.name && item.name.toLowerCase().includes(lowerQuery))
                .slice(0, 20) // Limit to 20 results
                .map(item => ({
                    id: String(item.stream_id),
                    name: item.name,
                    image: item.stream_icon,
                    type: 'live',
                    category: String(item.category_id || ''),
                    data: item, // Keep original data for navigation
                }));

            // 2. Filter Movies (using new domain structure)
            const vodStreams = content.movies.loaded ? content.movies.items : [];
            const movieResults: SearchResultItem[] = vodStreams
                .filter(item => item.name && item.name.toLowerCase().includes(lowerQuery))
                .slice(0, 20)
                .map(item => ({
                    id: String(item.stream_id),
                    name: item.name,
                    image: item.stream_icon,
                    type: 'movie',
                    rating: item.rating_5based,
                    category: String(item.category_id || ''),
                    data: item,
                }));

            // 3. Filter Series (using new domain structure)
            const seriesList = content.series.loaded ? content.series.items : [];
            const seriesResults: SearchResultItem[] = seriesList
                .filter(item => item.name && item.name.toLowerCase().includes(lowerQuery))
                .slice(0, 20)
                .map(item => ({
                    id: String(item.series_id),
                    name: item.name,
                    image: item.cover,
                    type: 'series',
                    rating: item.rating_5based,
                    year: item.releaseDate ? item.releaseDate.split('-')[0] : '',
                    data: item,
                }));

            // Check if this search is still the latest (prevents out-of-order results)
            if (currentToken !== searchTokenRef.current) {
                return; // Stale search, discard results
            }

            const hasResults = liveResults.length > 0 || movieResults.length > 0 || seriesResults.length > 0;

            setResults({
                live: liveResults,
                movies: movieResults,
                series: seriesResults,
            });

            // Add to recent searches if successful
            if (hasResults) {
                addToRecentSearches(query, liveResults.length + movieResults.length + seriesResults.length);
            }

        } catch (error: any) {
            // Safe error logging - avoid dumping huge error objects
            logger.error('Search failed', {
                message: error?.message || 'Unknown error',
            });
        } finally {
            // Only update loading state if this is still the current search
            if (currentToken === searchTokenRef.current) {
                setIsSearching(false);
            }
        }
    }, [content]);

    // Debounced search handler
    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
        if (text.trim()) {
            performSearch(text);
        } else {
            setResults({ live: [], movies: [], series: [] });
            setHasSearched(false);
        }
    }, [performSearch]);

    // Submit search
    const handleSearchSubmit = useCallback((text: string) => {
        Keyboard.dismiss();
        if (text.trim()) {
            performSearch(text);
        }
    }, [performSearch]);

    // =============================================================================
    // RECENT SEARCHES
    // =============================================================================

    // Add to recent searches (with persistence)
    const addToRecentSearches = useCallback((query: string, resultCount: number) => {
        setRecentSearches(prev => {
            // Remove duplicate
            const filtered = prev.filter(s => s.query.toLowerCase() !== query.toLowerCase());

            // Add new search at the beginning
            const newSearch: RecentSearch = {
                id: Date.now().toString(),
                query,
                timestamp: Date.now(),
                resultCount,
            };

            const updated = [newSearch, ...filtered].slice(0, 20);

            // Persist to AsyncStorage
            persistRecentSearches(updated);

            return updated;
        });
    }, [persistRecentSearches]);

    // Delete recent search
    const handleDeleteSearch = useCallback((id: string) => {
        setRecentSearches(prev => {
            const updated = prev.filter(s => s.id !== id);
            persistRecentSearches(updated);
            return updated;
        });
    }, [persistRecentSearches]);

    // Clear all recent searches
    const handleClearSearches = useCallback(() => {
        setRecentSearches([]);
        persistRecentSearches([]);
    }, [persistRecentSearches]);

    // Use recent search
    const handleRecentSearchPress = useCallback((query: string) => {
        setSearchQuery(query);
        performSearch(query);
    }, [performSearch]);

    // =============================================================================
    // RESULTS HANDLING
    // =============================================================================

    // Filter results by tab
    const filteredResults = useMemo((): SearchResultsData => {
        switch (activeTab) {
            case 'live':
                return { live: results.live, movies: [], series: [] };
            case 'movies':
                return { live: [], movies: results.movies, series: [] };
            case 'series':
                return { live: [], movies: [], series: results.series };
            default:
                return results;
        }
    }, [results, activeTab]);

    // Result counts for tabs
    const resultCounts = useMemo(() => ({
        live: results.live.length,
        movies: results.movies.length,
        series: results.series.length,
    }), [results]);

    // Total results
    const totalResults = results.live.length + results.movies.length + results.series.length;

    // Handle result item press
    const handleResultPress = useCallback((item: SearchResultItem) => {
        Keyboard.dismiss();

        // Ensure we pass the correct data structure expected by Player/Detail screens
        if (item.type === 'live' && item.data) {
            navigation.navigate('Player', {
                type: 'live',
                item: item.data
            });
        } else if (item.type === 'movie' && item.data) {
            navigation.navigate('Player', {
                type: 'movie',
                item: {
                    ...item.data,
                    stream_id: item.data.stream_id,
                    extension: item.data.container_extension
                }
            });
        } else if (item.type === 'series' && item.data) {
            navigation.navigate('SeriesDetail', {
                series: item.data
            });
        }
    }, [navigation]);

    // Handle "See All" press
    const handleSeeAllPress = useCallback((type: 'live' | 'movies' | 'series') => {
        setActiveTab(type);
    }, []);

    // =============================================================================
    // CANCEL / CLOSE
    // =============================================================================

    const handleCancel = useCallback(() => {
        Keyboard.dismiss();
        setSearchQuery('');
        setResults({ live: [], movies: [], series: [] });
        setHasSearched(false);
        navigation.goBack();
    }, [navigation]);

    const handleClear = useCallback(() => {
        setSearchQuery('');
        setResults({ live: [], movies: [], series: [] });
        setHasSearched(false);
    }, []);

    // =============================================================================
    // RENDER
    // =============================================================================

    const showRecentSearches = !hasSearched && recentSearches.length > 0;
    const showTrending = !hasSearched && !searchQuery;
    const showResults = hasSearched && totalResults > 0;
    const showNoResults = hasSearched && totalResults === 0 && !isSearching;
    const showInitial = !hasSearched && !searchQuery && recentSearches.length === 0;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                {/* Search Input */}
                <SearchInput
                    ref={searchInputRef}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    onSubmit={handleSearchSubmit}
                    onClear={handleClear}
                    onCancel={handleCancel}
                    placeholder="Search movies, series, channels..."
                    autoFocus
                    showCancel
                    isLoading={isSearching}
                    debounceMs={300}
                />
            </View>

            {/* Tabs (show when there are results) */}
            {hasSearched && (
                <SearchTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    counts={resultCounts}
                />
            )}

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: insets.bottom + spacing.lg },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Loading State */}
                {isSearching && !showResults && (
                    <SearchResultsSkeleton />
                )}

                {/* Initial State */}
                {showInitial && (
                    <EmptySearchState
                        type="initial"
                        suggestions={TRENDING_SEARCHES}
                        onSuggestionPress={handleRecentSearchPress}
                    />
                )}

                {/* Recent Searches */}
                {showRecentSearches && (
                    <RecentSearches
                        searches={recentSearches}
                        onSearchPress={handleRecentSearchPress}
                        onDeleteSearch={handleDeleteSearch}
                        onClearAll={handleClearSearches}
                    />
                )}

                {/* Trending Searches */}
                {showTrending && (
                    <TrendingSearches
                        searches={TRENDING_SEARCHES}
                        onSearchPress={handleRecentSearchPress}
                    />
                )}

                {/* Search Results */}
                {showResults && (
                    <SearchResults
                        results={filteredResults}
                        query={searchQuery}
                        onItemPress={handleResultPress}
                        onSeeAllPress={handleSeeAllPress}
                        showAll={activeTab !== 'all'}
                    />
                )}

                {/* No Results */}
                {showNoResults && (
                    <EmptySearchState
                        type="no-results"
                        query={searchQuery}
                        suggestions={TRENDING_SEARCHES}
                        onSuggestionPress={handleRecentSearchPress}
                    />
                )}
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
    header: {
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
    },
});

export default SearchScreen;