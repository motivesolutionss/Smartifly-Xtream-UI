/**
 * TV Series Screen
 * 
 * Category-focused series browsing.
 * - Left panel: Category list
 * - Right panel: Series grid
 * - No duplicate sidebar (main sidebar is on Home only)
 */

import React, { useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    StatusBar,

} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import useStore from '@smartifly/shared/src/store';
import { scale, typographyTV, useTheme } from '../theme';
import TVContentCard, { TVContentItem } from './home/components/TVContentCard';
import { XtreamSeries } from '@smartifly/shared/src/api/xtream';
import { TVSeriesScreenProps } from '../navigation/types';
import { useContentFilter } from '@smartifly/shared/src/store/profileStore';
import TVLoadingState from './components/TVLoadingState';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import usePagedCatalog from './hooks/usePagedCatalog';
import { seededShuffle } from '@smartifly/shared/src/utils/shuffle';

// =============================================================================
// TYPES
// =============================================================================

interface Category {
    id: string;
    name: string;
    countLabel?: string;
}

type CategoryListProps = {
    categories: Category[];
    selectedCategoryId: string | null;
    onSelect: (categoryId: string) => void;
    focusEntryRef?: React.Ref<View>;
    styles: ReturnType<typeof createStyles>;
};

type CategoryItemProps = {
    item: Category;
    isSelected: boolean;
    onSelect: (categoryId: string) => void;
    focusEntryRef?: React.Ref<View>;
    styles: ReturnType<typeof createStyles>;
    textOnPrimary: string;
    textDisabled: string;
};

// =============================================================================
// STYLE FACTORY
// =============================================================================

function createStyles(
    primaryColor: string,
    textPrimary: string,
    textMuted: string,
    textDisabled: string,
    textOnPrimary: string,
    glassColor: string,
    glassMedium: string,
    borderMedium: string,
    background: string,
) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: background,
            flexDirection: 'row',
        },
        // Category Panel
        categoryPanel: {
            width: scale(320),
            backgroundColor: 'transparent',
            paddingTop: scale(40),
        },
        panelHeader: {
            paddingHorizontal: scale(24),
            marginBottom: scale(30),
        },
        panelTitle: {
            ...typographyTV.h2,
            color: textPrimary,
            letterSpacing: 1,
            textTransform: 'uppercase',
        },
        titleUnderline: {
            width: scale(40),
            height: scale(4),
            backgroundColor: primaryColor,
            marginTop: scale(8),
            borderRadius: scale(2),
        },
        categoryList: {
            paddingHorizontal: scale(16),
            paddingBottom: scale(40),
        },
        categoryItem: {
            position: 'relative',
            overflow: 'hidden',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: scale(14),
            paddingHorizontal: scale(20),
            marginBottom: scale(6),
            borderRadius: scale(12),
            backgroundColor: glassColor,
        },
        categoryItemSelected: {
            backgroundColor: glassMedium,
            borderWidth: 1,
            borderColor: borderMedium,
        },
        categoryItemContent: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1,
        },
        categoryItemFocusFill: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: primaryColor,
        },
        categoryName: {
            ...typographyTV.bodyMedium,
            color: textMuted,
            flex: 1,
        },
        categoryNameSelected: {
            color: textPrimary,
            fontWeight: '700',
        },
        categoryNameFocused: {
            color: textOnPrimary,
            fontWeight: '900',
        },
        categoryCount: {
            ...typographyTV.captionSmall,
            color: textDisabled,
            marginLeft: scale(10),
            fontVariant: ['tabular-nums'],
        },
        categoryCountFocused: {
            color: textOnPrimary,
            fontWeight: 'bold',
        },
        // Series Panel
        seriesPanel: {
            flex: 1,
            paddingTop: scale(40),
            paddingLeft: scale(30),
        },
        gridHeader: {
            flexDirection: 'row',
            alignItems: 'baseline',
            marginBottom: scale(24),
            paddingRight: scale(40),
        },
        selectedCategoryName: {
            ...typographyTV.h3,
            color: textPrimary,
            marginRight: scale(15),
        },
        seriesCount: {
            ...typographyTV.caption,
            color: textMuted,
        },
        seriesGrid: {
            paddingBottom: scale(60),
            paddingRight: scale(18),
        },
        seriesRow: {
            justifyContent: 'flex-start',
            marginBottom: 0,
        },
        gridCardSpacing: {
            marginRight: scale(10),
            marginBottom: scale(20),
        },
        loadingState: {
            paddingVertical: scale(40),
            alignItems: 'center',
        },
    });
}

// =============================================================================
// CATEGORY ITEM
// =============================================================================

const CategoryItem: React.FC<CategoryItemProps> = React.memo(
    ({ item, isSelected, onSelect, focusEntryRef, styles, textOnPrimary, textDisabled }) => {
        const focused = useSharedValue(0);
        const handlePress = useCallback(() => {
            onSelect(item.id);
        }, [item.id, onSelect]);
        const handleFocus = useCallback(() => {
            focused.value = withTiming(1, { duration: 90 });
        }, [focused]);
        const handleBlur = useCallback(() => {
            focused.value = withTiming(0, { duration: 90 });
        }, [focused]);
        const shellStyle = useAnimatedStyle(() => ({
            transform: [{ scale: focused.value ? 1.02 : 1 }],
        }));
        const focusFillStyle = useAnimatedStyle(() => ({
            opacity: focused.value,
        }));
        const nameStyle = useAnimatedStyle(() => ({
            color: interpolateColor(
                focused.value,
                [0, 1],
                [isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.72)', textOnPrimary]
            ),
        }), [isSelected, textOnPrimary]);
        const countStyle = useAnimatedStyle(() => ({
            color: interpolateColor(
                focused.value,
                [0, 1],
                [textDisabled, textOnPrimary]
            ),
        }), [textDisabled, textOnPrimary]);

        return (
            <Animated.View style={shellStyle}>
                <Pressable
                    ref={item.id === 'all' ? focusEntryRef : undefined}
                    onPress={handlePress}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={[
                        styles.categoryItem,
                        isSelected && styles.categoryItemSelected,
                    ]}
                >
                    <Animated.View pointerEvents="none" style={[styles.categoryItemFocusFill, focusFillStyle]} />
                    <View style={styles.categoryItemContent}>
                        <Animated.Text
                            style={[
                                styles.categoryName,
                                isSelected && styles.categoryNameSelected,
                                nameStyle,
                            ]}
                            numberOfLines={1}
                        >
                            {item.name}
                        </Animated.Text>
                        {item.countLabel ? (
                            <Animated.Text
                                style={[
                                    styles.categoryCount,
                                    countStyle,
                                ]}
                            >
                                {item.countLabel}
                            </Animated.Text>
                        ) : null}
                    </View>
                </Pressable>
            </Animated.View>
        );
    }
);

// =============================================================================
// CATEGORY LIST
// =============================================================================

const CategoryList: React.FC<CategoryListProps> = React.memo(
    ({ categories, selectedCategoryId, onSelect, focusEntryRef, styles }) => {
        const perf = usePerfProfile();
        const listPerf = perf.categoryList;

        const renderCategory = useCallback(
            ({ item }: { item: Category }) => {
                const isSelected = selectedCategoryId === item.id ||
                    (selectedCategoryId === null && item.id === 'all');
                return (
                    <CategoryItem
                        item={item}
                        isSelected={isSelected}
                        onSelect={onSelect}
                        focusEntryRef={focusEntryRef}
                        styles={styles}
                        textOnPrimary={styles.categoryNameFocused.color as string}
                        textDisabled={styles.categoryCount.color as string}
                    />
                );
            },
            [selectedCategoryId, onSelect, focusEntryRef, styles]
        );

        return (
            <FlatList
                data={categories}
                renderItem={renderCategory}
                keyExtractor={(item) => item.id}
                extraData={selectedCategoryId}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
                removeClippedSubviews={false}
                getItemLayout={(_, index) => ({
                    length: CATEGORY_ROW_SIZE,
                    offset: CATEGORY_ROW_SIZE * index,
                    index,
                })}
                initialNumToRender={listPerf.initialNumToRender}
                maxToRenderPerBatch={listPerf.maxToRenderPerBatch}
                windowSize={listPerf.windowSize}
            />
        );
    }
);

// =============================================================================
// LIST CONFIG
// =============================================================================

const GRID_COLUMNS = 5;
const CATEGORY_ROW_SIZE = scale(62); // row height + margin (approx)
const GRID_CARD_WIDTH = scale(265);
const GRID_CARD_HEIGHT = scale(398);

// =============================================================================
// TV SERIES SCREEN
// =============================================================================


const TVSeriesScreen: React.FC<TVSeriesScreenProps> = ({ navigation, focusEntryRef }) => {
    // Theme tokens (primitive strings for stable memo deps)
    const { colors } = useTheme();
    const primaryColor    = colors.primary;
    const textPrimary     = colors.textPrimary;
    const textMuted       = colors.textMuted;
    const textDisabled    = colors.textDisabled;
    const textOnPrimary   = colors.textOnPrimary;
    const glassColor      = colors.glass;
    const glassMedium     = colors.glassMedium;
    const borderMedium    = colors.borderMedium;
    const background      = colors.background;

    const styles = useMemo(
        () => createStyles(primaryColor, textPrimary, textMuted, textDisabled, textOnPrimary, glassColor, glassMedium, borderMedium, background),
        [primaryColor, textPrimary, textMuted, textDisabled, textOnPrimary, glassColor, glassMedium, borderMedium, background]
    );

    // State
    const perf = usePerfProfile();
    const gridPerf = perf.grid;
    const gridInitialRender = GRID_COLUMNS * gridPerf.initialRows;
    const gridMaxRenderBatch = GRID_COLUMNS * gridPerf.maxRenderBatchRows;
    const dayShuffleSeed = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // Store (narrow selectors to avoid re-render on other domains)
    const seriesLoaded = useStore((state) => state.content.series.loaded);
    const seriesCategories = useStore((state) => state.content.series.categories);
    const { filterContent, maxRating, isKidsMode } = useContentFilter();

    const {
        selectedCategoryId,
        setSelectedCategoryId,
        categories,
        items: series,
        selectedCategoryName,
        countLabel,
        isInitialLoading,
        isLoadingMore,
        hasMore,
        loadMore,
    } = usePagedCatalog<XtreamSeries>({
        categories: seriesCategories,
        fetchPage: (api, page, limit, categoryId) => api.getSeriesPage({ page, limit, categoryId }),
        getItemId: (item) => String(item.series_id),
        filterItems: (items) => filterContent(items as any[]),
        shuffleItems: (items, categoryId, page) => seededShuffle(
            items,
            (item) => String(item.series_id || ''),
            `series:${categoryId}:page:${page}:${dayShuffleSeed}`
        ),
        countNoun: 'titles',
        allCategoryName: 'All Series',
        resetKey: `${seriesLoaded ? 'ready' : 'pending'}:${maxRating}:${isKidsMode ? 'kids' : 'adult'}`,
    });

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    // BackHandler is now managed by the parent TVHomeScreen
    // to switch sections instead of navigating


    const handleSeriesPress = useCallback((item: TVContentItem) => {
        if (item.data) {
            navigation.navigate('TVSeriesDetail', {
                series: item.data
            });
        }
    }, [navigation]);

    const handleCategorySelect = useCallback((categoryId: string) => {
        setSelectedCategoryId(categoryId);
    }, [setSelectedCategoryId]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const renderSeries = useCallback(({ item }: { item: XtreamSeries }) => (
        <TVContentCard
            item={{
                id: String(item.series_id),
                title: item.name,
                image: item.cover,
                rating: item.rating_5based,
                type: 'series',
                data: item,
            }}
            onPress={handleSeriesPress}
            width={GRID_CARD_WIDTH}
            height={GRID_CARD_HEIGHT}
            style={styles.gridCardSpacing}
            disableZoom={true}
        />
    ), [handleSeriesPress, styles]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />


            {/* Category Panel */}
            <View style={styles.categoryPanel}>
                <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Series</Text>
                    <View style={styles.titleUnderline} />
                </View>
                <CategoryList
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={handleCategorySelect}
                    focusEntryRef={focusEntryRef}
                    styles={styles}
                />
            </View>

            {/* Series Grid */}
            <View style={styles.seriesPanel}>
                <View style={styles.gridHeader}>
                    <Text style={styles.selectedCategoryName}>
                        {selectedCategoryName}
                    </Text>
                    <Text style={styles.seriesCount}>{countLabel}</Text>
                </View>

                <FlashList
                    data={series}
                    renderItem={renderSeries}
                    keyExtractor={(item) => String(item.series_id)}
                    numColumns={GRID_COLUMNS}
                    // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                    estimatedItemSize={scale(390)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.seriesGrid}
                    columnWrapperStyle={styles.seriesRow}
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={gridMaxRenderBatch}
                    initialNumToRender={gridInitialRender}
                    windowSize={gridPerf.windowSize}
                    updateCellsBatchingPeriod={gridPerf.updateCellsBatchingPeriod}
                    onEndReached={hasMore ? loadMore : undefined}
                    onEndReachedThreshold={0.7}
                    ListEmptyComponent={isInitialLoading ? <TVLoadingState style={styles.loadingState} /> : null}
                    ListFooterComponent={isLoadingMore ? <TVLoadingState style={styles.loadingState} size="small" /> : null}
                />
            </View>
        </View>
    );
};

export default TVSeriesScreen;
