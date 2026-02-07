/**
 * Smartifly Series Screen
 * 
 * Uses PREFETCHED data from store - NO loading after login!
 * - Instant display of series from cache
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
import SeriesCard from '../../components/SeriesCard';
import NavBar from '../../components/NavBar';
import CategoryList from '../../components/CategoryList';
import { colors, spacing, borderRadius } from '../../theme';
import useStore from '../../store';
import useFilterStore from '../../store/filterStore';
import { useDebounce } from '../../hooks';
import { XtreamSeries } from '../../api/xtream';
import { SeriesStackParamList } from '../../navigation/types';
import { useContentFilter } from '../../store/profileStore';

interface Props {
    navigation: NativeStackNavigationProp<SeriesStackParamList, 'SeriesMain'>;
}

const SeriesScreen: React.FC<Props> = ({ navigation }) => {
    const seriesDomain = useStore((state) => state.content.series);
    const username = useStore((state) => state.userInfo?.username);

    // Profile Store
    const { filterContent } = useContentFilter();

    // Use GLOBAL filter store with domain-specific category (series domain)
    const selectedCategory = useFilterStore((s) => s.selectedCategory.series);
    const setCategory = useFilterStore((s) => s.setCategory);

    // Local UI state for search only
    const [searchQuery, setSearchQuery] = useState('');

    // Debounce + defer keeps typing responsive on large datasets
    const debouncedQuery = useDebounce(searchQuery, 300);
    const deferredQuery = useDeferredValue(debouncedQuery);

    // Pre-filter content for profile restrictions
    const filteredAllSeries = useMemo(() => {
        if (!seriesDomain.loaded) return [];
        return filterContent(seriesDomain.items);
    }, [seriesDomain.items, seriesDomain.loaded, filterContent]);

    // O(n) category count map - PERFORMANCE FIX
    const categoryCountMap = useMemo(() => {
        const countMap: Record<string, number> = {};
        filteredAllSeries.forEach(s => {
            countMap[s.category_id] = (countMap[s.category_id] || 0) + 1;
        });
        return countMap;
    }, [filteredAllSeries]);

    const searchableSeries = useMemo(() => (
        filteredAllSeries.map((series) => ({
            series,
            nameLower: (series.name ?? '').toLowerCase(),
            categoryId: String(series.category_id),
        }))
    ), [filteredAllSeries]);

    // Transform categories from store format (using new domain structure)
    const categories = useMemo(() => {
        if (!seriesDomain.loaded || !seriesDomain.categories) return [];

        return seriesDomain.categories
            .map(cat => ({
                id: cat.category_id,
                name: cat.category_name,
                count: categoryCountMap[cat.category_id] || 0,
            }))
            .filter(cat => cat.count > 0); // Hide empty categories
    }, [seriesDomain.categories, seriesDomain.loaded, categoryCountMap]);

    // Filtered series - uses debounced query for smooth performance
    const filteredSeries = useMemo(() => {
        if (!seriesDomain.loaded) return [];

        const query = deferredQuery.trim().toLowerCase();
        const hasQuery = query.length > 0;
        const hasCategory = !!selectedCategory;
        const activeCategory = String(selectedCategory ?? '');

        const result: XtreamSeries[] = [];
        for (const entry of searchableSeries) {
            if (hasCategory && entry.categoryId !== activeCategory) continue;
            if (hasQuery && !entry.nameLower.includes(query)) continue;
            result.push(entry.series);
        }
        return result;
    }, [deferredQuery, searchableSeries, selectedCategory, seriesDomain.loaded]);

    // Memoized series press handler - prevents unnecessary re-renders
    const handleSeriesPress = useCallback((series: XtreamSeries) => {
        navigation.navigate('SeriesDetail', { series });
    }, [navigation]);

    // Handle category selection using domain-specific setter
    const handleCategorySelect = useCallback((categoryId: string | null, categoryName: string | null) => {
        setCategory('series', categoryId, categoryName);
    }, [setCategory]);

    const renderSeriesItem = useCallback(({ item }: { item: XtreamSeries }) => (
        <SeriesCard item={item} onPress={handleSeriesPress} />
    ), [handleSeriesPress]);

    // FIX: Check domain.loaded flag, not just content existence
    if (!seriesDomain.loaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading series...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* NavBar - removed showSearch since we have inline search */}
            <NavBar
                variant="content"
                title="Series"
                username={username}
                onProfilePress={() => (navigation as any).navigate('Settings')}
            />

            {/* Content Count */}
            <View style={styles.countContainer}>
                <Text style={styles.count}>{filteredSeries.length} shows</Text>
            </View>

            {/* Inline Search - single search UX */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search series..."
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
                    totalCount={filteredAllSeries.length}
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                    activeColor={colors.series}
                />
            )}

            {/* Series Grid */}
            {filteredSeries.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No series found</Text>
                    <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                </View>
            ) : (
                <FlashList
                    data={filteredSeries}
                    numColumns={3}
                    // @ts-ignore: estimatedItemSize is valid but types are missing in this version
                    estimatedItemSize={180}
                    keyExtractor={(item) => String(item.series_id)}
                    contentContainerStyle={styles.grid}
                    removeClippedSubviews
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    drawDistance={300}
                    renderItem={renderSeriesItem}
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
        backgroundColor: colors.series,
        borderColor: colors.series,
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

export default SeriesScreen;
