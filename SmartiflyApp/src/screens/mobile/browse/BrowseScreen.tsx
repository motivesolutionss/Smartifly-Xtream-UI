import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Pressable,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';

import NavBar from '../../../components/NavBar';
import ContentCard, { ContentItem } from '../home/components/ContentCard';
import useStore from '../../../store';
import { useContentFilter } from '../../../store/profileStore';
import { colors, spacing, Icon, borderRadius } from '../../../theme';
import { scheduleIdleWork } from '../../../utils/idle';
import type { BrowseScreenProps } from '../../../navigation/types';
import type { XtreamLiveStream, XtreamMovie, XtreamSeries } from '../../../api/xtream';

// =============================================================================
// CONFIG
// =============================================================================

const GRID_COLUMNS_LIVE = 3;
const GRID_COLUMNS_POSTER = 3; // Increased to 3 for better density
const GRID_ITEM_ESTIMATE_LIVE = 150;
const GRID_ITEM_ESTIMATE_POSTER = 200;
const POOL_LIMIT_LIVE = 2000;
const POOL_LIMIT_MOVIES = 2000;
const POOL_LIMIT_SERIES = 2000;

type CategoryItem = {
    id: string;
    name: string;
    count: number;
    color?: string;
};

const BrowseScreen: React.FC<BrowseScreenProps> = ({ navigation, route }) => {
    const { type } = route.params;
    const insets = useSafeAreaInsets();
    const { filterContent } = useContentFilter();

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, ContentItem[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);
    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);

    const liveLoaded = useStore((state) => state.content.live.loaded);
    const liveItems = useStore((state) => state.content.live.items);
    const liveCategories = useStore((state) => state.content.live.categories);

    const moviesLoaded = useStore((state) => state.content.movies.loaded);
    const moviesItems = useStore((state) => state.content.movies.items);
    const movieCategories = useStore((state) => state.content.movies.categories);

    const seriesLoaded = useStore((state) => state.content.series.loaded);
    const seriesItems = useStore((state) => state.content.series.items);
    const seriesCategories = useStore((state) => state.content.series.categories);

    const isLoaded = useMemo(() => {
        if (type === 'live') return liveLoaded;
        if (type === 'movies') return moviesLoaded;
        return seriesLoaded;
    }, [liveLoaded, moviesLoaded, seriesLoaded, type]);

    const headerTitle = useMemo(() => {
        if (type === 'live') return 'Live TV';
        if (type === 'movies') return 'Movies';
        return 'Series';
    }, [type]);

    const accentColor = useMemo(() => {
        if (type === 'live') return colors.live;
        if (type === 'movies') return colors.movies;
        return colors.series;
    }, [type]);

    const selectedCategoryLabel = useMemo(() => {
        const match = categoryItems.find((cat) => cat.id === selectedCategoryId);
        if (match) return match.name;
        return type === 'live' ? 'All Channels' : 'All Categories';
    }, [categoryItems, selectedCategoryId, type]);

    const gridColumns = type === 'live' ? GRID_COLUMNS_LIVE : GRID_COLUMNS_POSTER;
    const estimatedItemSize = type === 'live' ? GRID_ITEM_ESTIMATE_LIVE : GRID_ITEM_ESTIMATE_POSTER;
    const cardVariant = type === 'live' ? 'channel' : 'poster';
    const showRating = type !== 'live';

    const rawItems = useMemo(() => {
        if (!isLoaded) return [];
        if (type === 'live') return liveItems.slice(0, POOL_LIMIT_LIVE);
        if (type === 'movies') return filterContent(moviesItems.slice(0, POOL_LIMIT_MOVIES));
        return filterContent(seriesItems.slice(0, POOL_LIMIT_SERIES));
    }, [filterContent, isLoaded, liveItems, moviesItems, seriesItems, type]);

    const rawCategories = useMemo(() => {
        if (type === 'live') return liveCategories || [];
        if (type === 'movies') return movieCategories || [];
        return seriesCategories || [];
    }, [liveCategories, movieCategories, seriesCategories, type]);

    const mapToContentItem = useCallback((item: XtreamLiveStream | XtreamMovie | XtreamSeries): ContentItem => {
        if (type === 'live') {
            const live = item as XtreamLiveStream;
            return {
                id: String(live.stream_id),
                name: live.name,
                image: live.stream_icon,
                type: 'live',
                data: live,
            };
        }

        if (type === 'movies') {
            const movie = item as XtreamMovie;
            return {
                id: String(movie.stream_id),
                name: movie.name,
                image: movie.stream_icon,
                type: 'movie',
                rating: movie.rating_5based,
                data: movie,
            };
        }

        const series = item as XtreamSeries;
        return {
            id: String(series.series_id),
            name: series.name,
            image: series.cover,
            type: 'series',
            rating: series.rating_5based,
            data: series,
        };
    }, [type]);

    useEffect(() => {
        if (!isLoaded) {
            setCategoryItems([]);
            setCategoryMap({});
            setIsPrepared(false);
            return;
        }

        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            const nextMap: Record<string, ContentItem[]> = { all: [] };
            const countMap: Record<string, number> = {};

            for (const raw of rawItems) {
                const mapped = mapToContentItem(raw);
                nextMap.all.push(mapped);

                const catId = String((raw as XtreamLiveStream).category_id || '');
                if (!catId) continue;
                countMap[catId] = (countMap[catId] || 0) + 1;
                if (!nextMap[catId]) nextMap[catId] = [];
                nextMap[catId].push(mapped);
            }

            const nextCategories: CategoryItem[] = [
                {
                    id: 'all',
                    name: type === 'live' ? 'All Channels' : 'All',
                    count: nextMap.all.length,
                    color: accentColor,
                },
            ];

            for (const category of rawCategories) {
                const catId = String(category.category_id);
                const count = countMap[catId] || 0;
                if (!count) continue;
                nextCategories.push({
                    id: catId,
                    name: category.category_name,
                    count,
                });
            }

            setCategoryMap(nextMap);
            setCategoryItems(nextCategories);
            setIsPrepared(true);
            setSelectedCategoryId((prev) => (nextMap[prev] ? prev : 'all'));
        });

        return () => task.cancel();
    }, [accentColor, isLoaded, mapToContentItem, rawCategories, rawItems, type]);

    const displayItems = useMemo(() => {
        if (!isPrepared) return [];
        return categoryMap[selectedCategoryId] || [];
    }, [categoryMap, isPrepared, selectedCategoryId]);

    const handleContentPress = useCallback((item: ContentItem) => {
        if (item.type === 'live') {
            const live = item.data as XtreamLiveStream | undefined;
            if (!live) return;
            navigation.navigate('Player', {
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

    const handleSearchPress = useCallback(() => {
        navigation.navigate('Search');
    }, [navigation]);

    const handleOpenCategories = useCallback(() => {
        setCategoryModalVisible(true);
    }, []);

    const handleCloseCategories = useCallback(() => {
        setCategoryModalVisible(false);
    }, []);

    const handleCategorySelect = useCallback((categoryId: string) => {
        setSelectedCategoryId(categoryId);
        setCategoryModalVisible(false);
    }, []);

    const renderItem = useCallback(({ item, index }: { item: ContentItem; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index % 12 * 50).duration(400)}>
            <ContentCard
                item={item}
                onPress={handleContentPress}
                variant={cardVariant}
                showRating={showRating}
                style={styles.card}
            />
        </Animated.View>
    ), [cardVariant, handleContentPress, showRating]);

    const keyExtractor = useCallback((item: ContentItem) => String(item.id), []);

    const emptyState = useMemo(() => {
        if (!isLoaded || !isPrepared) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            );
        }

        return (
            <View style={styles.emptyState}>
                <Icon name="monitor" size={48} color={colors.textMuted} weight="thin" />
                <Text style={styles.emptyText}>No items found in this category</Text>
            </View>
        );
    }, [isLoaded, isPrepared]);

    return (
        <View style={styles.container}>
            <NavBar
                variant="content"
                title={headerTitle}
                showBack
                showSearch
                onSearchPress={handleSearchPress}
            />

            <View style={styles.categorySection}>
                <View style={styles.categoryRow}>
                    <View style={styles.leftFilterGroup}>
                        <TouchableOpacity
                            style={styles.categoryDropdown}
                            onPress={handleOpenCategories}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.categoryDropdownText}>Categories</Text>
                            <Icon name="caretDown" size={12} color={colors.textSecondary} weight="bold" />
                        </TouchableOpacity>

                        <Text style={styles.selectionText} numberOfLines={1}>
                            {selectedCategoryLabel}
                        </Text>
                    </View>
                    <Text style={styles.resultsCountText}>{displayItems.length} items</Text>
                </View>
            </View>

            <FlashList
                data={displayItems}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                numColumns={gridColumns}
                key={`grid-${type}-${gridColumns}`}
                // @ts-ignore FlashList runtime supports estimatedItemSize
                estimatedItemSize={estimatedItemSize}
                contentContainerStyle={[
                    styles.gridContent,
                    { paddingBottom: insets.bottom + spacing.xl }
                ]}
                columnWrapperStyle={gridColumns > 1 ? styles.gridRow : undefined}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={emptyState}
            />

            <Modal
                visible={isCategoryModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseCategories}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={handleCloseCategories} />
                    <View style={[styles.modalContent, { paddingTop: insets.top + spacing.xl }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{headerTitle} Categories</Text>
                            <TouchableOpacity onPress={handleCloseCategories} style={styles.modalCloseBtn}>
                                <Icon name="x" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <FlashList
                            data={categoryItems}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const isSelected = item.id === selectedCategoryId;
                                return (
                                    <TouchableOpacity
                                        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                                        onPress={() => handleCategorySelect(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.modalItemTextRow}>
                                            <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                                                {item.name}
                                            </Text>
                                            <View style={styles.countBadge}>
                                                <Text style={styles.modalItemCount}>{item.count}</Text>
                                            </View>
                                        </View>
                                        {isSelected && (
                                            <Icon name="check" size={20} color={accentColor} weight="bold" />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            // @ts-ignore FlashList runtime supports estimatedItemSize
                            estimatedItemSize={56}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={[styles.modalListContent, { paddingBottom: insets.bottom + spacing.md }]}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    categorySection: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftFilterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    categoryDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.round,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        flexShrink: 0,
    },
    categoryDropdownText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    selectionText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
        flexShrink: 1,
    },
    resultsCountText: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    gridContent: {
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.xs,
    },
    gridRow: {
        justifyContent: 'flex-start',
        gap: spacing.sm,
    },
    card: {
        marginRight: 0,
    },
    emptyState: {
        flex: 1,
        minHeight: 400,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 15,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        flex: 1,
        backgroundColor: colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: 60,
        paddingHorizontal: spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
        paddingTop: spacing.md,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalListContent: {
        paddingBottom: spacing.base,
    },
    modalItem: {
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    modalItemSelected: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    modalItemTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flexShrink: 1,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textSecondary,
        flexShrink: 1,
    },
    modalItemTextSelected: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    countBadge: {
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    modalItemCount: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textMuted,
    },
});

export default BrowseScreen;

