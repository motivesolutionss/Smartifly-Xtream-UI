/**
 * TV Series Screen
 * 
 * Category-focused series browsing.
 * - Left panel: Category list
 * - Right panel: Series grid
 * - No duplicate sidebar (main sidebar is on Home only)
 * 
 * @enterprise-grade
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
import { colors, scale, scaleFont } from '../../theme';
import TVContentCard, { TVContentItem } from './home/components/TVContentCard';
import { XtreamSeries } from '../../api/xtream';
import { TVSeriesScreenProps } from '../../navigation/types';
import { useContentFilter } from '../../store/profileStore';
import { scheduleIdleWork } from '../../utils/idle';
import TVLoadingState from './components/TVLoadingState';

// =============================================================================
// TYPES
// =============================================================================

interface Category {
    id: string;
    name: string;
    count: number;
}

// =============================================================================
// LIST CONFIG
// =============================================================================

const GRID_COLUMNS = 7;
const GRID_INITIAL_ROWS = 3;
const GRID_INITIAL_RENDER = GRID_COLUMNS * GRID_INITIAL_ROWS;
const GRID_MAX_RENDER_BATCH = GRID_COLUMNS * 2;
const GRID_WINDOW_SIZE = 5;
const GRID_BATCH_PERIOD = 16;

// =============================================================================
// TV SERIES SCREEN
// =============================================================================

const TVSeriesScreen: React.FC<TVSeriesScreenProps> = ({ navigation }) => {
    // State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, XtreamSeries[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);

    // Store
    const content = useStore((state) => state.content);
    const { filterContent } = useContentFilter();

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    useEffect(() => {
        if (!content.series.loaded || !content.series.categories) {
            setCategories([]);
            setCategoryMap({});
            setIsPrepared(false);
            return;
        }

        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            const filteredAllSeries = filterContent(content.series.items as any[]);
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

            for (const cat of content.series.categories) {
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
    }, [content.series.loaded, content.series.categories, content.series.items, filterContent]);

    // ==========================================================================
    // SERIES (filtered by category)
    // ==========================================================================

    const series = useMemo((): XtreamSeries[] => {
        if (!content.series.loaded || !isPrepared) return [];

        const key = selectedCategoryId && selectedCategoryId !== 'all'
            ? selectedCategoryId
            : 'all';

        return categoryMap[key] || [];
    }, [content.series.loaded, isPrepared, selectedCategoryId, categoryMap]);

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

    const renderCategory = useCallback(({ item }: { item: Category }) => {
        const isSelected = selectedCategoryId === item.id ||
            (selectedCategoryId === null && item.id === 'all');
        const isFocused = focusedCategoryId === item.id;

        return (
            <Pressable
                onPress={() => handleCategorySelect(item.id)}
                onFocus={() => setFocusedCategoryId(item.id)}
                onBlur={() => setFocusedCategoryId(null)}
                style={[
                    styles.categoryItem,
                    isSelected && styles.categoryItemSelected,
                    isFocused && styles.categoryItemFocused,
                ]}
            >
                <Text style={[
                    styles.categoryName,
                    isSelected && styles.categoryNameSelected,
                    isFocused && styles.categoryNameFocused,
                ]} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={[
                    styles.categoryCount,
                    isFocused && styles.categoryCountFocused,
                ]}>
                    {item.count}
                </Text>
            </Pressable>
        );
    }, [focusedCategoryId, selectedCategoryId, handleCategorySelect]);

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
                <FlatList
                    data={categories}
                    renderItem={renderCategory}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.categoryList}
                    removeClippedSubviews={true}
                    initialNumToRender={12}
                    maxToRenderPerBatch={12}
                    windowSize={5}
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
                    maxToRenderPerBatch={GRID_MAX_RENDER_BATCH}
                    initialNumToRender={GRID_INITIAL_RENDER}
                    windowSize={GRID_WINDOW_SIZE}
                    updateCellsBatchingPeriod={GRID_BATCH_PERIOD}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        flexDirection: 'row',
    },
    bgOverlay: {
        backgroundColor: colors.background,
    },
    bgGradient: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '50%',
        opacity: 0.5,
        backgroundColor: 'rgba(0, 229, 255, 0.03)',
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
        fontSize: scaleFont(34),
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    titleUnderline: {
        width: scale(40),
        height: scale(4),
        backgroundColor: colors.accent || '#00E5FF',
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
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    categoryItemSelected: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    categoryItemFocused: {
        backgroundColor: colors.accent || '#00E5FF',
        transform: [{ scale: 1.02 }],
        elevation: 10,
        shadowColor: colors.accent || '#00E5FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    categoryName: {
        fontSize: scaleFont(18),
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
        flex: 1,
    },
    categoryNameSelected: {
        color: '#FFF',
        fontWeight: '700',
    },
    categoryNameFocused: {
        color: '#000',
        fontWeight: '900',
    },
    categoryCount: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.3)',
        marginLeft: scale(10),
        fontVariant: ['tabular-nums'],
    },
    categoryCountFocused: {
        color: 'rgba(0,0,0,0.6)',
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
        fontSize: scaleFont(26),
        fontWeight: '800',
        color: '#FFF',
        marginRight: scale(15),
    },
    seriesCount: {
        fontSize: scaleFont(16),
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '500',
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

export default TVSeriesScreen;
