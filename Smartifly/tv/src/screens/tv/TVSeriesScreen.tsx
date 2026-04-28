/**
 * TV Series Screen
 * 
 * Category-focused series browsing.
 * - Left panel: Category list
 * - Right panel: Series grid
 * - No duplicate sidebar (main sidebar is on Home only)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    StatusBar,

} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import useStore from '../../store';
import { scale, typographyTV, useTheme } from '../../theme';
import TVContentCard, { TVContentItem } from './home/components/TVContentCard';
import { XtreamSeries } from '../../api/xtream';
import { TVSeriesScreenProps } from '../../navigation/types';
import { useContentFilter } from '../../store/profileStore';
import { scheduleIdleWork } from '../../utils/idle';
import TVLoadingState from './components/TVLoadingState';
import { usePerfProfile } from '../../utils/perf';

// =============================================================================
// TYPES
// =============================================================================

interface Category {
    id: string;
    name: string;
    count: number;
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
        categoryItemFocused: {
            backgroundColor: primaryColor,
            transform: [{ scale: 1.02 }],
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
            paddingRight: scale(20),
        },
        seriesRow: {
            justifyContent: 'flex-start',
            marginBottom: scale(30),
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
    ({ item, isSelected, onSelect, focusEntryRef, styles }) => {
        const [isFocused, setIsFocused] = useState(false);
        const handlePress = useCallback(() => {
            onSelect(item.id);
        }, [item.id, onSelect]);

        return (
            <Pressable
                ref={item.id === 'all' ? focusEntryRef : undefined}
                onPress={handlePress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[
                    styles.categoryItem,
                    isSelected && styles.categoryItemSelected,
                    isFocused && styles.categoryItemFocused,
                ]}
            >
                <Text
                    style={[
                        styles.categoryName,
                        isSelected && styles.categoryNameSelected,
                        isFocused && styles.categoryNameFocused,
                    ]}
                    numberOfLines={1}
                >
                    {item.name}
                </Text>
                <Text
                    style={[
                        styles.categoryCount,
                        isFocused && styles.categoryCountFocused,
                    ]}
                >
                    {item.count}
                </Text>
            </Pressable>
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
                removeClippedSubviews={true}
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

const GRID_COLUMNS = 7;
const CATEGORY_ROW_SIZE = scale(62); // row height + margin (approx)

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
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, XtreamSeries[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);
    const perf = usePerfProfile();
    const gridPerf = perf.grid;
    const gridInitialRender = GRID_COLUMNS * gridPerf.initialRows;
    const gridMaxRenderBatch = GRID_COLUMNS * gridPerf.maxRenderBatchRows;

    // Store (narrow selectors to avoid re-render on other domains)
    const seriesLoaded = useStore((state) => state.content.series.loaded);
    const seriesItems = useStore((state) => state.content.series.items);
    const seriesCategories = useStore((state) => state.content.series.categories);
    const { filterContent } = useContentFilter();

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    useEffect(() => {
        if (!seriesLoaded || !seriesCategories) {
            setCategories([]);
            setCategoryMap({});
            setIsPrepared(false);
            return;
        }

        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            const filteredAllSeries = filterContent(seriesItems as any[]);
            const nextMap: Record<string, XtreamSeries[]> = {
                all: filteredAllSeries,
            };

            for (const series of filteredAllSeries) {
                const catId = String(series.category_id);
                if (!nextMap[catId]) nextMap[catId] = [];
                nextMap[catId].push(series);
            }

            const nextCategories: Category[] = [
                { id: 'all', name: 'All Series', count: filteredAllSeries.length },
            ];

            for (const cat of seriesCategories) {
                const catId = String(cat.category_id);
                const count = nextMap[catId]?.length || 0;

                if (count > 0) {
                    nextCategories.push({
                        id: catId,
                        name: cat.category_name,
                        count,
                    });
                }
            }

            setCategoryMap(nextMap);
            setCategories(nextCategories);
            setIsPrepared(true);
        });

        return () => {
            task.cancel();
        };
    }, [seriesLoaded, seriesCategories, seriesItems, filterContent]);

    // ==========================================================================
    // SERIES (filtered by category)
    // ==========================================================================

    const series = useMemo((): XtreamSeries[] => {
        if (!seriesLoaded || !isPrepared) return [];

        const key = selectedCategoryId && selectedCategoryId !== 'all'
            ? selectedCategoryId
            : 'all';

        return categoryMap[key] || [];
    }, [seriesLoaded, isPrepared, selectedCategoryId, categoryMap]);

    const selectedCategoryName = useMemo(() => {
        return categories.find((c) => c.id === (selectedCategoryId || 'all'))?.name;
    }, [categories, selectedCategoryId]);

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
    }, []);

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
            width={scale(180)}
            height={scale(270)}
            disableZoom={true}
        />
    ), [handleSeriesPress]);

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
                    <Text style={styles.seriesCount}>
                        {series.length} titles available
                    </Text>
                </View>

                <FlashList
                    data={series}
                    renderItem={renderSeries}
                    keyExtractor={(item) => String(item.series_id)}
                    numColumns={GRID_COLUMNS}
                    // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                    estimatedItemSize={scale(300)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.seriesGrid}
                    columnWrapperStyle={styles.seriesRow}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={gridMaxRenderBatch}
                    initialNumToRender={gridInitialRender}
                    windowSize={gridPerf.windowSize}
                    updateCellsBatchingPeriod={gridPerf.updateCellsBatchingPeriod}
                    ListEmptyComponent={
                        !isPrepared ? (
                            <TVLoadingState style={styles.loadingState} />
                        ) : null
                    }
                />
            </View>
        </View>
    );
};

export default TVSeriesScreen;
