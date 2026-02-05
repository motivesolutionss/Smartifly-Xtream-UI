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

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    StatusBar,

} from 'react-native';
import useStore from '../../store';
import { colors, scale, scaleFont } from '../../theme';
import TVContentCard, { TVContentItem } from './home/components/TVContentCard';
import { XtreamLiveStream } from '../../api/xtream';
import { TVLiveScreenProps } from '../../navigation/types';

// =============================================================================
// TYPES
// =============================================================================

interface Category {
    id: string;
    name: string;
    count: number;
}

// =============================================================================
// TV LIVE SCREEN
// =============================================================================

const TVLiveScreen: React.FC<TVLiveScreenProps> = ({ navigation }) => {
    // State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);

    // Store
    const { content } = useStore();

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    const categories = useMemo((): Category[] => {
        if (!content.live.loaded || !content.live.categories) return [];

        // 1. Single pass to count channels per category (O(N))
        const countMap: Record<string, number> = {};
        content.live.items.forEach((ch: XtreamLiveStream) => {
            const catId = String(ch.category_id);
            countMap[catId] = (countMap[catId] || 0) + 1;
        });

        const cats: Category[] = [
            { id: 'all', name: 'All Channels', count: content.live.items.length },
        ];

        // 2. Build category list using the map (O(M))
        for (const cat of content.live.categories) {
            const catId = String(cat.category_id);
            const count = countMap[catId] || 0;

            if (count > 0) {
                cats.push({
                    id: catId,
                    name: cat.category_name,
                    count,
                });
            }
        }

        return cats;
    }, [content.live.loaded, content.live.categories, content.live.items]);

    // ==========================================================================
    // CHANNELS (filtered by category)
    // ==========================================================================

    const channels = useMemo((): TVContentItem[] => {
        if (!content.live.loaded) return [];

        let items = content.live.items;

        if (selectedCategoryId && selectedCategoryId !== 'all') {
            items = items.filter(
                (ch: XtreamLiveStream) => String(ch.category_id) === selectedCategoryId
            );
        }

        return items.map((ch: XtreamLiveStream) => ({
            id: String(ch.stream_id),
            title: ch.name,
            image: ch.stream_icon,
            type: 'live' as const,
            data: ch,
        }));
    }, [content.live.items, content.live.loaded, selectedCategoryId]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    // BackHandler is now managed by the parent TVHomeScreen
    // to switch sections instead of navigating


    const handleChannelPress = (item: TVContentItem) => {
        // Navigate to FullscreenPlayer with the raw item data (which has stream_id)
        if (item.data) {
            navigation.navigate('FullscreenPlayer', {
                type: 'live',
                item: item.data
            });
        }
    };

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const renderCategory = ({ item }: { item: Category }) => {
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
    };

    const renderChannel = ({ item }: { item: TVContentItem }) => (
        <TVContentCard
            item={item}
            onPress={handleChannelPress}
            width={scale(160)} // Increased size
            height={scale(110)}
        />
    );

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
                />
            </View>

            {/* Channels Grid */}
            <View style={styles.channelsPanel}>
                <Text style={styles.channelCount}>
                    {channels.length} channels
                </Text>
                <FlatList
                    key={`grid-${7}`} // Force re-render on column change
                    data={channels}
                    renderItem={renderChannel}
                    keyExtractor={(item) => String(item.id)}
                    numColumns={7} // Increased columns
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.channelsGrid}
                    columnWrapperStyle={styles.channelsRow}
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
        backgroundColor: colors.background,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
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
});

export default TVLiveScreen;
