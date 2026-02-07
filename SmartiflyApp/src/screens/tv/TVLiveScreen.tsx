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
// TV LIVE SCREEN
// =============================================================================

const TVLiveScreen: React.FC<TVLiveScreenProps> = ({ navigation }) => {
    // State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, XtreamLiveStream[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);

    // Store
    const content = useStore((state) => state.content);

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    useEffect(() => {
        if (!content.live.loaded || !content.live.categories) {
            setCategories([]);
            setCategoryMap({});
            setIsPrepared(false);
            return;
        }

        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            const items = content.live.items;
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

            for (const cat of content.live.categories) {
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
    }, [content.live.loaded, content.live.categories, content.live.items]);

    // ==========================================================================
    // CHANNELS (filtered by category)
    // ==========================================================================

    const channels = useMemo((): XtreamLiveStream[] => {
        if (!content.live.loaded || !isPrepared) return [];

        if (selectedCategoryId && selectedCategoryId !== 'all') {
            return categoryMap[selectedCategoryId] || [];
        }

        return categoryMap.all || [];
    }, [content.live.loaded, isPrepared, selectedCategoryId, categoryMap]);

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
        backgroundColor: colors.accent || '#00E5FF',
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
