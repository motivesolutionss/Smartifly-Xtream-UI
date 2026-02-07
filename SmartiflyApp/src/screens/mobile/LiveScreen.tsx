/**
 * Smartifly Live TV Screen
 * 
 * Uses PREFETCHED data from store - NO loading after login!
 * - Instant display of channels from cache
 * - Category filtering via global filterStore
 * - Debounced search for performance
 * - Uses domain.loaded flag to properly show loading vs empty states
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ChannelCard from '../../components/ChannelCard';
import NavBar from '../../components/NavBar';
import CategoryList from '../../components/CategoryList';
import { colors, spacing, borderRadius } from '../../theme';
import useStore from '../../store';
import useFilterStore from '../../store/filterStore';
import { useDebounce } from '../../hooks';
import { XtreamLiveStream } from '../../api/xtream';
import { LiveStackParamList } from '../../navigation/types';

interface Props {
    navigation: NativeStackNavigationProp<LiveStackParamList, 'LiveMain'>;
}

const LiveScreen: React.FC<Props> = ({ navigation }) => {


    // Get PREFETCHED content from store - uses new domain structure
    const content = useStore((state) => state.content);
    const userInfo = useStore((state) => state.userInfo);

    // Use GLOBAL filter store with domain-specific category (live domain)
    const selectedCategory = useFilterStore((s) => s.selectedCategory.live);
    const setCategory = useFilterStore((s) => s.setCategory);

    // Local UI state for search only
    const [searchQuery, setSearchQuery] = useState('');

    // Debounce search input (300ms) - big performance win for large lists
    const debouncedQuery = useDebounce(searchQuery, 300);

    // O(n) category count map - PERFORMANCE FIX
    const categoryCountMap = useMemo(() => {
        if (!content.live.loaded) return {};
        const countMap: Record<string, number> = {};
        content.live.items.forEach(s => {
            countMap[s.category_id] = (countMap[s.category_id] || 0) + 1;
        });
        return countMap;
    }, [content.live.items, content.live.loaded]);

    // Transform categories from store format (using new domain structure)
    const categories = useMemo(() => {
        if (!content.live.loaded || !content.live.categories) return [];

        return content.live.categories.map(cat => ({
            id: cat.category_id,
            name: cat.category_name,
            count: categoryCountMap[cat.category_id] || 0,
        }));
    }, [content.live.categories, content.live.loaded, categoryCountMap]);

    // Filtered channels - uses debounced query for smooth performance
    const filteredChannels = useMemo(() => {
        if (!content.live.loaded) return [];

        let result = content.live.items;

        // Filter by category (null = All)
        if (selectedCategory) {
            result = result.filter(stream => String(stream.category_id) === String(selectedCategory));
        }

        // Filter by debounced search query
        if (debouncedQuery.trim()) {
            const query = debouncedQuery.toLowerCase();
            result = result.filter(stream =>
                stream.name.toLowerCase().includes(query)
            );
        }

        return result;
    }, [content.live.items, content.live.loaded, selectedCategory, debouncedQuery]);

    // Memoized play handler - prevents unnecessary re-renders
    const handlePlay = useCallback((item: XtreamLiveStream) => {
        navigation.navigate('Player', {
            type: 'live',
            item: {
                stream_id: item.stream_id,
                name: item.name,
                stream_icon: item.stream_icon,
            },
        });
    }, [navigation]);

    // Handle category selection using domain-specific setter
    const handleCategorySelect = useCallback((categoryId: string | null, categoryName: string | null) => {
        setCategory('live', categoryId, categoryName);
    }, [setCategory]);

    // FIX: Check domain.loaded flag, not just content existence
    if (!content.live.loaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading channels...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* NavBar - removed showSearch since we have inline search */}
            <NavBar
                variant="content"
                title="Live TV"
                username={userInfo?.username}
                onProfilePress={() => (navigation as any).navigate('Settings')}
            />

            {/* Content Count */}
            <View style={styles.countContainer}>
                <Text style={styles.count}>{filteredChannels.length} channels</Text>
            </View>

            {/* Inline Search - single search UX */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search channels..."
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
                    totalCount={content.live.items.length}
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                    activeColor={colors.live}
                />
            )}

            {/* Channels Grid */}
            {filteredChannels.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No channels found</Text>
                    <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                </View>
            ) : (
                <FlashList
                    data={filteredChannels}
                    numColumns={3}
                    // @ts-ignore: estimatedItemSize is valid but types are missing in this version
                    estimatedItemSize={120}
                    keyExtractor={(item) => String(item.stream_id)}
                    contentContainerStyle={styles.grid}
                    removeClippedSubviews
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <ChannelCard item={item} onPress={handlePlay} />
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
        backgroundColor: colors.live,
        borderColor: colors.live,
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
        width: '31%',
        maxWidth: '32%',
    },
    logo: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        backgroundColor: colors.cardBackground,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontSize: 12,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
});

export default LiveScreen;
