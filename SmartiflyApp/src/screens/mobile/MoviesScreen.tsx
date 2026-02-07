/**
 * Smartifly Movies Screen
 * 
 * Uses PREFETCHED data from store - NO loading after login!
 * - Instant display of movies from cache
 * - Category filtering via global filterStore
 * - Debounced search for performance
 * - Uses domain.loaded flag to properly show loading vs empty states
 */

import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MovieCard from '../../components/MovieCard';
import NavBar from '../../components/NavBar';
import CategoryList from '../../components/CategoryList';
import { colors, spacing, borderRadius } from '../../theme';
import useStore from '../../store';
import useFilterStore from '../../store/filterStore';
import { useDebounce } from '../../hooks';
import { XtreamMovie } from '../../api/xtream';
import { MoviesStackParamList } from '../../navigation/types';
import { useContentFilter } from '../../store/profileStore';

interface Props {
    navigation: NativeStackNavigationProp<MoviesStackParamList, 'MoviesMain'>;
}

const MoviesScreen: React.FC<Props> = ({ navigation }) => {
    const moviesDomain = useStore((state) => state.content.movies);
    const username = useStore((state) => state.userInfo?.username);

    // Profile Store
    const { filterContent } = useContentFilter();

    // Use GLOBAL filter store with domain-specific category (movies domain)
    const selectedCategory = useFilterStore((s) => s.selectedCategory.movies);
    const setCategory = useFilterStore((s) => s.setCategory);

    // Local UI state for search only
    const [searchQuery, setSearchQuery] = useState('');

    // Debounce + defer keeps typing smooth while large lists are filtered
    const debouncedQuery = useDebounce(searchQuery, 300);
    const deferredQuery = useDeferredValue(debouncedQuery);

    // Pre-filter content for profile restrictions
    const filteredAllMovies = useMemo(() => {
        if (!moviesDomain.loaded) return [];
        return filterContent(moviesDomain.items);
    }, [moviesDomain.items, moviesDomain.loaded, filterContent]);

    // O(n) category count map - PERFORMANCE FIX
    const categoryCountMap = useMemo(() => {
        const countMap: Record<string, number> = {};
        filteredAllMovies.forEach(m => {
            countMap[m.category_id] = (countMap[m.category_id] || 0) + 1;
        });
        return countMap;
    }, [filteredAllMovies]);

    const searchableMovies = useMemo(() => (
        filteredAllMovies.map((movie) => ({
            movie,
            nameLower: (movie.name ?? '').toLowerCase(),
            categoryId: String(movie.category_id),
        }))
    ), [filteredAllMovies]);

    // Transform categories from store format (using new domain structure)
    const categories = useMemo(() => {
        if (!moviesDomain.loaded || !moviesDomain.categories) return [];

        return moviesDomain.categories
            .map(cat => ({
                id: cat.category_id,
                name: cat.category_name,
                count: categoryCountMap[cat.category_id] || 0,
            }))
            .filter(cat => cat.count > 0); // Hide empty categories
    }, [moviesDomain.categories, moviesDomain.loaded, categoryCountMap]);

    // Filtered movies - uses debounced query for smooth performance
    const filteredMovies = useMemo(() => {
        if (!moviesDomain.loaded) return [];

        const query = deferredQuery.trim().toLowerCase();
        const hasQuery = query.length > 0;
        const hasCategory = !!selectedCategory;
        const activeCategory = String(selectedCategory ?? '');

        const result: XtreamMovie[] = [];
        for (const entry of searchableMovies) {
            if (hasCategory && entry.categoryId !== activeCategory) continue;
            if (hasQuery && !entry.nameLower.includes(query)) continue;
            result.push(entry.movie);
        }
        return result;
    }, [deferredQuery, moviesDomain.loaded, searchableMovies, selectedCategory]);

    // Navigate to movie detail screen instead of direct play
    const handleMoviePress = useCallback((item: XtreamMovie) => {
        navigation.navigate('MovieDetail', {
            movie: {
                stream_id: item.stream_id,
                name: item.name,
                stream_icon: item.stream_icon,
                rating: item.rating,
                rating_5based: item.rating_5based,
                container_extension: item.container_extension,
                plot: item.plot,
                genre: item.genre,
            },
        });
    }, [navigation]);

    // Handle category selection using domain-specific setter
    const handleCategorySelect = useCallback((categoryId: string | null, categoryName: string | null) => {
        setCategory('movies', categoryId, categoryName);
    }, [setCategory]);

    const renderMovieItem = useCallback(({ item }: { item: XtreamMovie }) => (
        <MovieCard item={item} onPress={handleMoviePress} />
    ), [handleMoviePress]);

    // FIX: Check domain.loaded flag, not just content existence
    if (!moviesDomain.loaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading movies...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* NavBar - removed showSearch since we have inline search */}
            <NavBar
                variant="content"
                title="Movies"
                username={username}
                onProfilePress={() => (navigation as any).navigate('Settings')}
            />

            {/* Content Count */}
            <View style={styles.countContainer}>
                <Text style={styles.count}>{filteredMovies.length} movies</Text>
            </View>

            {/* Inline Search - single search UX */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search movies..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                />
            </View>

            {/* Categories */}
            {categories.length > 0 && (
                <CategoryList
                    categories={categories}
                    totalCount={filteredAllMovies.length}
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                    activeColor={colors.movies}
                />
            )}

            {/* Movies Grid */}
            {filteredMovies.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No movies found</Text>
                    <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                </View>
            ) : (
                <FlashList
                    data={filteredMovies}
                    numColumns={3}
                    // @ts-ignore: estimatedItemSize is valid but types are missing in this version
                    estimatedItemSize={180}
                    keyExtractor={(item) => String(item.stream_id)}
                    contentContainerStyle={styles.grid}
                    removeClippedSubviews
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    drawDistance={300}
                    renderItem={renderMovieItem}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: colors.textMuted,
        marginTop: spacing.md,
    },
    countContainer: {
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.sm,
    },
    count: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    searchContainer: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    searchInput: {
        backgroundColor: colors.cardBackground,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        fontSize: 16,
    },
    categoryList: {
        maxHeight: 50,
    },
    categoryListContent: {
        paddingHorizontal: spacing.md,
    },
    categoryChip: {
        backgroundColor: colors.cardBackground,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        backgroundColor: colors.movies,
        borderColor: colors.movies,
    },
    categoryChipText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    categoryChipTextActive: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    emptySubtext: {
        color: colors.textMuted,
        fontSize: 14,
        marginTop: spacing.xs,
    },
    grid: {
        padding: spacing.md,
    },
    card: {
        flex: 1,
        margin: spacing.xs,
        maxWidth: '31%',
    },
    poster: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: borderRadius.md,
        backgroundColor: colors.cardBackground,
    },
    ratingBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: colors.overlay,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    ratingText: {
        color: colors.warning,
        fontSize: 10,
        fontWeight: '700',
    },
    cardTitle: {
        color: colors.textPrimary,
        fontSize: 12,
        marginTop: spacing.xs,
    },
});

export default MoviesScreen;
