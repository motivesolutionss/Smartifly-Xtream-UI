/**
 * TV Live Screen
 * 
 * Category-focused live TV browsing.
 * - Left panel: Category list
 * - Right panel: Channels grid
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
import { XtreamLiveStream } from '../../api/xtream';
import { TVLiveScreenProps } from '../../navigation/types';
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
};

const CategoryList: React.FC<CategoryListProps> = React.memo(
    ({ categories, selectedCategoryId, onSelect, focusEntryRef }) => {
        const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
        const perf = usePerfProfile();
        const listPerf = perf.categoryList;

        const renderCategory = useCallback(
            ({ item }: { item: Category }) => {
                const isSelected = selectedCategoryId === item.id ||
                    (selectedCategoryId === null && item.id === 'all');
                const isFocused = focusedCategoryId === item.id;

                return (
                    <Pressable
                        ref={item.id === 'all' ? focusEntryRef : undefined}
                        onPress={() => onSelect(item.id)}
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
            },
            [focusedCategoryId, selectedCategoryId, onSelect, focusEntryRef]
        );

        return (
            <FlatList
                data={categories}
                renderItem={renderCategory}
                keyExtractor={(item) => item.id}
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
const CATEGORY_ROW_SIZE = scale(58); // row height + margin (approx)

// =============================================================================
// TV LIVE SCREEN
// =============================================================================


const TVLiveScreen: React.FC<TVLiveScreenProps> = ({ navigation, focusEntryRef }) => {
    // State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, XtreamLiveStream[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);
    const perf = usePerfProfile();
    const gridPerf = perf.grid;
    const gridInitialRender = GRID_COLUMNS * gridPerf.initialRows;
    const gridMaxRenderBatch = GRID_COLUMNS * gridPerf.maxRenderBatchRows;

    // Store (narrow selectors to avoid re-render on other domains)
    const liveLoaded = useStore((state) => state.content.live.loaded);
    const liveItems = useStore((state) => state.content.live.items);
    const liveCategories = useStore((state) => state.content.live.categories);

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    useEffect(() => {
        if (!liveLoaded || !liveCategories) {
            setCategories([]);
            setCategoryMap({});
            setIsPrepared(false);
            return;
        }

        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            const items = liveItems;
            const nextMap: Record<string, XtreamLiveStream[]> = {
                all: items,
            };
            const countMap: Record<string, number> = {};

            for (const ch of items) {
                const catId = String(ch.category_id);
                countMap[catId] = (countMap[catId] || 0) + 1;
                if (!nextMap[catId]) nextMap[catId] = [];
                nextMap[catId].push(ch);
            }

            const nextCategories: Category[] = [
                { id: 'all', name: 'All Channels', count: items.length },
            ];

            for (const cat of liveCategories) {
                const catId = String(cat.category_id);
                const count = countMap[catId] || 0;
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
    }, [liveLoaded, liveCategories, liveItems]);

    // ==========================================================================
    // CHANNELS (filtered by category)
    // ==========================================================================

    const channels = useMemo((): XtreamLiveStream[] => {
        if (!liveLoaded || !isPrepared) return [];

        if (selectedCategoryId && selectedCategoryId !== 'all') {
            return categoryMap[selectedCategoryId] || [];
        }

        return categoryMap.all || [];
    }, [liveLoaded, isPrepared, selectedCategoryId, categoryMap]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    // BackHandler is now managed by the parent TVHomeScreen
    // to switch sections instead of navigating


    const handleChannelPress = useCallback((item: TVContentItem) => {
        // Navigate to FullscreenPlayer with the raw item data (which has stream_id)
        if (item.data) {
            navigation.navigate('FullscreenPlayer', {
                type: 'live',
                item: item.data
            });
        }
    }, [navigation]);

    const handleCategorySelect = useCallback((categoryId: string) => {
        setSelectedCategoryId(categoryId);
    }, []);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const renderChannel = useCallback(({ item }: { item: XtreamLiveStream }) => (
        <TVContentCard
            item={{
                id: String(item.stream_id),
                title: item.name,
                image: item.stream_icon,
                type: 'live',
                data: item,
            }}
            onPress={handleChannelPress}
            width={scale(160)} // Increased size
            height={scale(110)}
            disableZoom={true}
        />
    ), [handleChannelPress]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Category Panel */}
            <View style={styles.categoryPanel}>
                <Text style={styles.panelTitle}>Live TV</Text>
                <CategoryList
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={handleCategorySelect}
                    focusEntryRef={focusEntryRef}
                />
            </View>

            {/* Channels Grid */}
            <View style={styles.channelsPanel}>
                <Text style={styles.channelCount}>
                    {channels.length} channels
                </Text>
                <FlashList
                    key={`grid-${7}`} // Force re-render on column change
                    data={channels}
                    renderItem={renderChannel}
                    keyExtractor={(item) => String(item.stream_id)}
                    numColumns={GRID_COLUMNS} // Increased columns
                    // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                    estimatedItemSize={scale(140)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.channelsGrid}
                    columnWrapperStyle={styles.channelsRow}
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

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        flexDirection: 'row',
    },
    // Category Panel
    categoryPanel: {
        width: scale(350),
        backgroundColor: 'transparent',
        paddingTop: scale(40),
    },
    panelTitle: {
        fontSize: scaleFont(30),
        fontWeight: 'bold',
        color: colors.textPrimary || '#FFF',
        paddingHorizontal: scale(20),
        marginBottom: scale(20),
    },
    categoryList: {
        paddingHorizontal: scale(12),
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(12),
        paddingHorizontal: scale(16),
        marginBottom: scale(4),
        borderRadius: scale(8),
    },
    categoryItemSelected: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    categoryItemFocused: {
        backgroundColor: '#E50914',
    },
    categoryName: {
        fontSize: scaleFont(20),
        color: colors.textSecondary || '#AAA',
        flex: 1,
    },
    categoryNameSelected: {
        color: colors.textPrimary || '#FFF',
        fontWeight: '600',
    },
    categoryNameFocused: {
        color: '#000',
        fontWeight: 'bold',
    },
    categoryCount: {
        fontSize: scaleFont(16),
        color: colors.textMuted || '#666',
        marginLeft: scale(8),
    },
    categoryCountFocused: {
        color: '#000',
    },
    // Channels Panel
    channelsPanel: {
        flex: 1,
        paddingTop: scale(40),
        paddingHorizontal: scale(20),
    },
    channelCount: {
        fontSize: scaleFont(18),
        color: colors.textMuted || '#666',
        marginBottom: scale(20),
    },
    channelsGrid: {
        paddingBottom: scale(40),
    },
    channelsRow: {
        marginBottom: scale(20),
    },
    loadingState: {
        paddingVertical: scale(40),
        alignItems: 'center',
    },
});

export default TVLiveScreen;
