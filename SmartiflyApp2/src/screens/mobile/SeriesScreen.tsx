/**
 * Smartifly Series Screen
 * 
 * Uses PREFETCHED data from store - NO loading after login!
 * - Instant display of series from cache
 * - Category filtering via global filterStore
 * - Debounced search for performance
 * - Uses domain.loaded flag to properly show loading vs empty states
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SeriesCard from '../../components/SeriesCard';
import NavBar from '../../components/NavBar';
import { colors, spacing, borderRadius } from '../../theme';
import useStore from '../../store';
import useFilterStore from '../../store/filterStore';
import { useDebounce } from '../../hooks';

interface Props {
    navigation: any;
}

const SeriesScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    // Get PREFETCHED content from store - uses new domain structure
    const content = useStore((state) => state.content);
    const userInfo = useStore((state) => state.userInfo);

    // Use GLOBAL filter store with domain-specific category (series domain)
    const selectedCategory = useFilterStore((s) => s.selectedCategory.series);
    const setCategory = useFilterStore((s) => s.setCategory);

    // Local UI state for search only
    const [searchQuery, setSearchQuery] = useState('');

    // Debounce search input (300ms) - big performance win for large series lists
    const debouncedQuery = useDebounce(searchQuery, 300);

    // Transform categories from store format (using new domain structure)
    const categories = useMemo(() => {
        if (!content.series.loaded || !content.series.categories) return [];

        return content.series.categories.map(cat => ({
            id: cat.category_id,
            name: cat.category_name,
            count: content.series.items.filter(s => s.category_id === cat.category_id).length,
        }));
    }, [content.series.categories, content.series.items, content.series.loaded]);

    // Filtered series - uses debounced query for smooth performance
    const filteredSeries = useMemo(() => {
        if (!content.series.loaded) return [];

        let result = content.series.items;

        // Filter by category (null = All)
        if (selectedCategory) {
            result = result.filter(series => String(series.category_id) === String(selectedCategory));
        }

        // Filter by debounced search query
        if (debouncedQuery.trim()) {
            const query = debouncedQuery.toLowerCase();
            result = result.filter(series =>
                series.name.toLowerCase().includes(query)
            );
        }

        return result;
    }, [content.series.items, content.series.loaded, selectedCategory, debouncedQuery]);

    // Memoized series press handler - prevents unnecessary re-renders
    const handleSeriesPress = useCallback((series: any) => {
        navigation.navigate('SeriesDetail', { series });
    }, [navigation]);

    // Handle category selection using domain-specific setter
    const handleCategorySelect = useCallback((categoryId: string | null, categoryName: string | null) => {
        setCategory('series', categoryId, categoryName);
    }, [setCategory]);

    // FIX: Check domain.loaded flag, not just content existence
    if (!content.series.loaded) {
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
                username={userInfo?.username}
                onProfilePress={() => navigation.navigate('Settings')}
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
                <FlatList
                    horizontal
                    data={[{ id: null, name: 'All', count: content.series.items.length }, ...categories]}
                    keyExtractor={(item) => String(item.id ?? 'all')}
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryList}
                    contentContainerStyle={styles.categoryListContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.categoryChip,
                                selectedCategory === item.id && styles.categoryChipActive,
                            ]}
                            onPress={() => handleCategorySelect(item.id, item.name)}
                        >
                            <Text
                                style={[
                                    styles.categoryChipText,
                                    selectedCategory === item.id && styles.categoryChipTextActive,
                                ]}
                            >
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    )}
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
                    renderItem={({ item }) => (
                        <SeriesCard item={item} onPress={handleSeriesPress} />
                    )}
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
