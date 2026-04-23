import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Pressable,
    TouchableOpacity,
    TextInput,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';

import NavBar from '../../../components/NavBar';
import ContentCard, { ContentItem } from '../home/components/ContentCard';
import useContentStore from '../../../store/contentStore';
import { useContentFilter } from '../../../store/profileStore';
import { colors, spacing, Icon, borderRadius } from '../../../theme';
import { scheduleIdleWork } from '../../../utils/idle';
import { usePerfProfile } from '../../../utils/perf';
import type { BrowseScreenProps } from '../../../navigation/types';
import type { XtreamLiveStream, XtreamMovie, XtreamSeries } from '../../../api/xtream';
import { config } from '../../../config';

// =============================================================================
// CONFIG
// =============================================================================

const GRID_COLUMNS_LIVE = 3;
const GRID_COLUMNS_POSTER = 3; // Increased to 3 for better density
const GRID_COLUMN_GAP = spacing.sm;
const MIN_CARD_WIDTH_CHANNEL = 96;
const MIN_CARD_WIDTH_POSTER = 92;
const POSTER_ASPECT_RATIO = 1.5;
const LARGE_CATALOG_THRESHOLD = config.catalog.serverPagination.threshold;
const SERVER_PAGING_ENABLED = config.catalog.serverPagination.enabled;
const SERVER_PAGE_SIZE = config.catalog.serverPagination.pageSize;
const MAIN_TAB_BOTTOM_SPACER = 112;

type CategoryItem = {
    id: string;
    name: string;
    count: number;
    color?: string;
};

const BrowseScreen: React.FC<BrowseScreenProps> = ({ navigation, route }) => {
    const { type } = route.params;
    const insets = useSafeAreaInsets();
    const { width: viewportWidth } = useWindowDimensions();
    const perf = usePerfProfile();
    const { filterContent } = useContentFilter();

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, ContentItem[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);
    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [sortMode, setSortMode] = useState<'default' | 'az' | 'za' | 'new'>('default');
    const [visibleCount, setVisibleCount] = useState(0);
    const [remoteItems, setRemoteItems] = useState<ContentItem[]>([]);
    const [remotePage, setRemotePage] = useState(0);
    const [remoteHasMore, setRemoteHasMore] = useState(false);
    const [remoteLoading, setRemoteLoading] = useState(false);
    const [remotePaginationSupported, setRemotePaginationSupported] = useState<boolean | null>(null);
    const remoteLoadingRef = useRef(false);

    const liveLoaded = useContentStore((state) => state.content.live.loaded);
    const liveItems = useContentStore((state) => state.content.live.items);
    const liveCategories = useContentStore((state) => state.content.live.categories);

    const moviesLoaded = useContentStore((state) => state.content.movies.loaded);
    const moviesItems = useContentStore((state) => state.content.movies.items);
    const movieCategories = useContentStore((state) => state.content.movies.categories);

    const seriesLoaded = useContentStore((state) => state.content.series.loaded);
    const seriesItems = useContentStore((state) => state.content.series.items);
    const seriesCategories = useContentStore((state) => state.content.series.categories);
    const contentPartial = useContentStore((state) => state.contentPartial);
    const ensureFullContent = useContentStore((state) => state.ensureFullContent);
    const getXtreamAPI = useContentStore((state) => state.getXtreamAPI);

    const isLoaded = useMemo(() => {
        if (type === 'live') return liveLoaded;
        if (type === 'movies') return moviesLoaded;
        return seriesLoaded;
    }, [liveLoaded, moviesLoaded, seriesLoaded, type]);

    useEffect(() => {
        const needsFull =
            type === 'live'
                ? contentPartial.live
                : type === 'movies'
                    ? contentPartial.movies
                    : contentPartial.series;
        if (needsFull) {
            ensureFullContent(type);
        }
    }, [contentPartial.live, contentPartial.movies, contentPartial.series, ensureFullContent, type]);

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
    const cardVariant = type === 'live' ? 'channel' : 'poster';
    const showRating = type !== 'live';
    const minCardWidth = type === 'live' ? MIN_CARD_WIDTH_CHANNEL : MIN_CARD_WIDTH_POSTER;

    const gridCardWidth = useMemo(() => {
        const totalGap = GRID_COLUMN_GAP * (gridColumns - 1);
        const available = Math.max(0, viewportWidth - totalGap);
        const calculated = Math.floor(available / gridColumns);
        return Math.max(minCardWidth, calculated);
    }, [gridColumns, minCardWidth, viewportWidth]);

    const gridCardHeight = useMemo(() => (
        type === 'live' ? gridCardWidth : Math.round(gridCardWidth * POSTER_ASPECT_RATIO)
    ), [gridCardWidth, type]);

    const estimatedItemSize = useMemo(() => (
        type === 'live'
            ? gridCardHeight + 42
            : gridCardHeight + 54
    ), [gridCardHeight, type]);

    const gridSideInset = useMemo(() => {
        const usedWidth = (gridCardWidth * gridColumns) + (GRID_COLUMN_GAP * (gridColumns - 1));
        return Math.max(0, Math.floor((viewportWidth - usedWidth) / 2));
    }, [gridCardWidth, gridColumns, viewportWidth]);

    const initialVisibleCount = useMemo(() => {
        const rows = perf.tier === 'low' ? 6 : perf.tier === 'high' ? 12 : 8;
        return rows * gridColumns;
    }, [gridColumns, perf.tier]);

    const visibleStep = useMemo(() => {
        const rows = perf.tier === 'low' ? 4 : perf.tier === 'high' ? 10 : 6;
        return rows * gridColumns;
    }, [gridColumns, perf.tier]);

    const rawItems = useMemo(() => {
        if (!isLoaded) return [];
        if (type === 'live') return liveItems;
        if (type === 'movies') return filterContent(moviesItems);
        return filterContent(seriesItems);
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
        const source = categoryMap[selectedCategoryId] || [];
        const query = deferredSearchQuery.trim().toLowerCase();

        let next = query.length > 0
            ? source.filter((entry) => entry.name.toLowerCase().includes(query))
            : source;

        if (sortMode === 'az') {
            next = [...next].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortMode === 'za') {
            next = [...next].sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortMode === 'new') {
            next = [...next].sort((a, b) => {
                const getNewestScore = (entry: ContentItem): number => {
                    if (entry.type === 'movie') {
                        return parseInt((entry.data as XtreamMovie)?.added || '0', 10) || 0;
                    }
                    if (entry.type === 'series') {
                        return new Date((entry.data as XtreamSeries)?.last_modified || 0).getTime() || 0;
                    }
                    return 0;
                };
                return getNewestScore(b) - getNewestScore(a);
            });
        }

        return next;
    }, [categoryMap, deferredSearchQuery, isPrepared, selectedCategoryId, sortMode]);

    const isLargeCatalog = displayItems.length >= LARGE_CATALOG_THRESHOLD;

    useEffect(() => {
        if (!isPrepared) {
            setVisibleCount(0);
            return;
        }
        setVisibleCount(Math.min(initialVisibleCount, displayItems.length));
    }, [
        displayItems.length,
        initialVisibleCount,
        isPrepared,
        searchQuery,
        selectedCategoryId,
        sortMode,
        type,
    ]);

    const visibleItems = useMemo(() => (
        displayItems.slice(0, visibleCount)
    ), [displayItems, visibleCount]);

    const hasMoreItems = visibleCount < displayItems.length;
    const serverPagingEligible = useMemo(() => (
        SERVER_PAGING_ENABLED &&
        isPrepared &&
        rawItems.length >= LARGE_CATALOG_THRESHOLD &&
        searchQuery.trim().length === 0 &&
        sortMode === 'default'
    ), [isPrepared, rawItems.length, searchQuery, sortMode]);

    const fetchRemotePage = useCallback(async (page: number, replace: boolean) => {
        if (remoteLoadingRef.current) return;
        const api = getXtreamAPI();
        if (!api) return;

        remoteLoadingRef.current = true;
        setRemoteLoading(true);
        try {
            const categoryId = selectedCategoryId === 'all' ? undefined : selectedCategoryId;

            const paged = type === 'live'
                ? await api.getLiveStreamsPage({ page, limit: SERVER_PAGE_SIZE, categoryId })
                : type === 'movies'
                    ? await api.getVodStreamsPage({ page, limit: SERVER_PAGE_SIZE, categoryId })
                    : await api.getSeriesPage({ page, limit: SERVER_PAGE_SIZE, categoryId });

            if (!paged.serverPaginated) {
                setRemotePaginationSupported(false);
                return;
            }

            const mappedItems = paged.items.map((entry) => mapToContentItem(entry));
            setRemotePaginationSupported(true);
            setRemotePage(page);
            setRemoteHasMore(paged.hasMore);

            let appendedCount = 0;
            setRemoteItems((prev) => {
                if (replace) return mappedItems;

                const seen = new Set(prev.map((entry) => String(entry.id)));
                const merged = [...prev];
                for (const entry of mappedItems) {
                    const id = String(entry.id);
                    if (seen.has(id)) continue;
                    seen.add(id);
                    merged.push(entry);
                    appendedCount += 1;
                }
                return merged;
            });

            // If next page added nothing, treat as non-paginated/stuck backend and stop requesting more.
            if (!replace && mappedItems.length > 0 && appendedCount === 0) {
                setRemoteHasMore(false);
                setRemotePaginationSupported(false);
            }
        } catch {
            setRemotePaginationSupported(false);
        } finally {
            remoteLoadingRef.current = false;
            setRemoteLoading(false);
        }
    }, [getXtreamAPI, mapToContentItem, selectedCategoryId, type]);

    useEffect(() => {
        setRemoteItems([]);
        setRemotePage(0);
        setRemoteHasMore(false);
        setRemotePaginationSupported(null);
        remoteLoadingRef.current = false;
    }, [selectedCategoryId, serverPagingEligible, type]);

    useEffect(() => {
        if (!serverPagingEligible) return;
        fetchRemotePage(1, true);
    }, [fetchRemotePage, serverPagingEligible]);

    const useRemoteData = serverPagingEligible && remotePaginationSupported === true;
    const listItems = useRemoteData ? remoteItems : visibleItems;

    const sortLabel = useMemo(() => {
        if (sortMode === 'az') return 'A-Z';
        if (sortMode === 'za') return 'Z-A';
        if (sortMode === 'new') return 'Newest';
        return 'Default';
    }, [sortMode]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCategoryId !== 'all') count += 1;
        if (searchQuery.trim().length > 0) count += 1;
        if (sortMode !== 'default') count += 1;
        return count;
    }, [searchQuery, selectedCategoryId, sortMode]);

    const hasActiveFilters = activeFilterCount > 0;

    const devPagingLabel = useMemo(() => {
        if (!__DEV__) return '';
        if (!serverPagingEligible) return 'Paging: local';
        if (remotePaginationSupported === null) return 'Paging: probing server...';
        if (useRemoteData) {
            const suffix = remoteHasMore ? 'more' : 'end';
            return `Paging: server (p${Math.max(1, remotePage)}, ${suffix})`;
        }
        return 'Paging: fallback (local)';
    }, [
        remoteHasMore,
        remotePage,
        remotePaginationSupported,
        serverPagingEligible,
        useRemoteData,
    ]);

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

    const handleSortToggle = useCallback(() => {
        setSortMode((prev) => {
            if (prev === 'default') return 'az';
            if (prev === 'az') return 'za';
            if (prev === 'za') return 'new';
            return 'default';
        });
    }, []);

    const handleResetFilters = useCallback(() => {
        setSearchQuery('');
        setSortMode('default');
        setSelectedCategoryId('all');
    }, []);

    const handleLoadMore = useCallback(() => {
        if (useRemoteData) {
            if (remoteLoadingRef.current || !remoteHasMore) return;
            fetchRemotePage(remotePage + 1, false);
            return;
        }
        if (!isPrepared || !hasMoreItems) return;
        setVisibleCount((prev) => Math.min(prev + visibleStep, displayItems.length));
    }, [
        displayItems.length,
        fetchRemotePage,
        hasMoreItems,
        isPrepared,
        remoteHasMore,
        remotePage,
        useRemoteData,
        visibleStep,
    ]);

    const renderItem = useCallback(({ item, index }: { item: ContentItem; index: number }) => {
        const shouldAnimate =
            perf.tier !== 'low' &&
            !isLargeCatalog &&
            index < gridColumns * perf.grid.initialRows;

        const card = (
            <ContentCard
                item={item}
                onPress={handleContentPress}
                variant={cardVariant}
                showRating={showRating}
                sizeOverride={{ width: gridCardWidth, height: gridCardHeight }}
                style={styles.card}
            />
        );

        if (!shouldAnimate) {
            return <View>{card}</View>;
        }

        return (
            <Animated.View entering={FadeInDown.delay(index % 12 * 45).duration(320)}>
                {card}
            </Animated.View>
        );
    }, [
        cardVariant,
        gridCardHeight,
        gridCardWidth,
        gridColumns,
        handleContentPress,
        perf.grid.initialRows,
        perf.tier,
        isLargeCatalog,
        showRating,
    ]);

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
                <Text style={styles.emptyText}>
                    {searchQuery.trim().length > 0
                        ? `No results for "${searchQuery.trim()}"`
                        : 'No items found in this category'}
                </Text>
            </View>
        );
    }, [isLoaded, isPrepared, searchQuery]);

    const listFooter = useMemo(() => {
        if (useRemoteData) {
            if (!remoteLoading) {
                return <View style={styles.listFooterSpacer} />;
            }
            return (
                <View style={styles.listFooter}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={styles.listFooterText}>Loading page...</Text>
                </View>
            );
        }

        if (!isPrepared || !hasMoreItems) {
            return <View style={styles.listFooterSpacer} />;
        }

        return (
            <View style={styles.listFooter}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.listFooterText}>Loading more...</Text>
            </View>
        );
    }, [hasMoreItems, isPrepared, remoteLoading, useRemoteData]);

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
                    <View style={styles.resultsMetaWrap}>
                        <Text style={styles.resultsCountText}>{displayItems.length} items</Text>
                        {hasActiveFilters && (
                            <View style={styles.activeFilterBadge}>
                                <Text style={styles.activeFilterBadgeText}>{activeFilterCount} filters</Text>
                            </View>
                        )}
                    </View>
                </View>
                {__DEV__ && devPagingLabel.length > 0 && (
                    <View style={styles.devPagingBadge}>
                        <Text style={styles.devPagingText}>{devPagingLabel}</Text>
                    </View>
                )}

                <View style={styles.toolsRow}>
                    <View style={styles.searchBox}>
                        <Icon name="magnifyingGlass" size={15} color={colors.textMuted} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                            placeholder={`Search ${headerTitle.toLowerCase()}`}
                            placeholderTextColor={colors.textMuted}
                            autoCorrect={false}
                            autoCapitalize="none"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearSearchButton}
                                onPress={() => setSearchQuery('')}
                                activeOpacity={0.7}
                            >
                                <Icon name="x" size={14} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.sortChip, sortMode !== 'default' && styles.sortChipActive]}
                        onPress={handleSortToggle}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.sortChipText, sortMode !== 'default' && styles.sortChipTextActive]}>
                            {sortLabel}
                        </Text>
                    </TouchableOpacity>

                    {hasActiveFilters && (
                        <TouchableOpacity
                            style={styles.resetChip}
                            onPress={handleResetFilters}
                            activeOpacity={0.8}
                        >
                            <Icon name="arrowCounterClockwise" size={13} color={colors.textSecondary} />
                            <Text style={styles.resetChipText}>Reset</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlashList
                data={listItems}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                numColumns={gridColumns}
                key={`grid-${type}-${gridColumns}`}
                // @ts-ignore FlashList runtime supports estimatedItemSize
                estimatedItemSize={estimatedItemSize}
                drawDistance={perf.home.drawDistance}
                initialNumToRender={gridColumns * perf.grid.initialRows}
                maxToRenderPerBatch={gridColumns * perf.grid.maxRenderBatchRows}
                updateCellsBatchingPeriod={perf.grid.updateCellsBatchingPeriod}
                windowSize={perf.grid.windowSize}
                removeClippedSubviews
                contentContainerStyle={[
                    styles.gridContent,
                    {
                        paddingHorizontal: gridSideInset,
                        paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER,
                    }
                ]}
                columnWrapperStyle={gridColumns > 1 ? styles.gridRow : undefined}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.4}
                ListEmptyComponent={emptyState}
                ListFooterComponent={listFooter}
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
        marginHorizontal: spacing.base,
        marginBottom: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: borderRadius.round,
        gap: 6,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        flexShrink: 0,
    },
    categoryDropdownText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    selectionText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        flexShrink: 1,
    },
    resultsMetaWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    resultsCountText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activeFilterBadge: {
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        backgroundColor: 'rgba(229, 9, 20, 0.14)',
        paddingHorizontal: spacing.xs,
        paddingVertical: 3,
    },
    activeFilterBadgeText: {
        color: colors.textPrimary,
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    devPagingBadge: {
        marginTop: spacing.xs,
        alignSelf: 'flex-start',
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    devPagingText: {
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '600',
    },
    toolsRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    searchBox: {
        flex: 1,
        minHeight: 46,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundInput,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 13,
        paddingVertical: spacing.xs,
    },
    clearSearchButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundElevated,
    },
    sortChip: {
        minHeight: 46,
        minWidth: 72,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundInput,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
    },
    sortChipActive: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.backgroundElevated,
    },
    sortChipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sortChipTextActive: {
        color: colors.textPrimary,
    },
    resetChip: {
        minHeight: 46,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundInput,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        gap: spacing.xxs,
    },
    resetChipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    gridContent: {
        paddingTop: spacing.sm,
    },
    gridRow: {
        justifyContent: 'flex-start',
        gap: GRID_COLUMN_GAP,
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
    listFooter: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    listFooterText: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    listFooterSpacer: {
        height: spacing.sm,
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
        backgroundColor: colors.backgroundSecondary,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: 60,
        paddingHorizontal: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalItemSelected: {
        backgroundColor: colors.backgroundInput,
        borderColor: colors.borderMedium,
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
