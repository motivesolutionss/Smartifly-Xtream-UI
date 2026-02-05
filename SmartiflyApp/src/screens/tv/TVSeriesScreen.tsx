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
import { XtreamSeries } from '../../api/xtream';
import { TVSeriesScreenProps } from '../../navigation/types';
import { useContentFilter } from '../../store/profileStore';

// =============================================================================
// TYPES
// =============================================================================

interface Category {
    id: string;
    name: string;
    count: number;
}

// =============================================================================
// TV SERIES SCREEN
// =============================================================================

const TVSeriesScreen: React.FC<TVSeriesScreenProps> = ({ navigation }) => {
    // State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);

    // Store
    const { content } = useStore();
    const { filterContent } = useContentFilter();

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    const categories = useMemo((): Category[] => {
        if (!content.series.loaded || !content.series.categories) return [];

        // Apply parental control filter to all items first for accurate counts
        const filteredAllSeries = filterContent(content.series.items as any[]);

        // 1. Single pass to count items per category (O(N))
        const countMap: Record<string, number> = {};
        filteredAllSeries.forEach((s: XtreamSeries) => {
            const catId = String(s.category_id);
            countMap[catId] = (countMap[catId] || 0) + 1;
        });

        const cats: Category[] = [
            { id: 'all', name: 'All Series', count: filteredAllSeries.length },
        ];

        // 2. Build category list using the map (O(M))
        for (const cat of content.series.categories) {
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
    }, [content.series.loaded, content.series.categories, content.series.items, filterContent]);

    // ==========================================================================
    // SERIES (filtered by category)
    // ==========================================================================

    const series = useMemo((): TVContentItem[] => {
        if (!content.series.loaded) return [];

        // Apply parental control filter
        const filteredAllSeries = filterContent(content.series.items as any[]);

        let items = filteredAllSeries;

        if (selectedCategoryId && selectedCategoryId !== 'all') {
            items = items.filter(
                (s: XtreamSeries) => String(s.category_id) === selectedCategoryId
            );
        }

        return items.map((s: XtreamSeries) => ({
            id: String(s.series_id),
            title: s.name,
            image: s.cover,
            rating: s.rating_5based,
            type: 'series' as const,
            data: s,
        }));
    }, [content.series.items, content.series.loaded, selectedCategoryId, filterContent]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    // BackHandler is now managed by the parent TVHomeScreen
    // to switch sections instead of navigating


    const handleSeriesPress = (item: TVContentItem) => {
        if (item.data) {
            navigation.navigate('TVSeriesDetail', {
                series: item.data
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

    const renderSeries = ({ item }: { item: TVContentItem }) => (
        <TVContentCard
            item={item}
            onPress={handleSeriesPress}
            width={scale(180)}
            height={scale(270)}
        />
    );

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Background Gradient / Overlay */}
            <View style={StyleSheet.absoluteFill}>
                <View style={[StyleSheet.absoluteFill, styles.bgOverlay]} />
                <View style={styles.bgGradient} />
            </View>

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
                />
            </View>

            {/* Series Grid */}
            <View style={styles.seriesPanel}>
                <View style={styles.gridHeader}>
                    <Text style={styles.selectedCategoryName}>
                        {categories.find(c => c.id === (selectedCategoryId || 'all'))?.name}
                    </Text>
                    <Text style={styles.seriesCount}>
                        {series.length} titles available
                    </Text>
                </View>

                <FlatList
                    data={series}
                    renderItem={renderSeries}
                    keyExtractor={(item) => String(item.id)}
                    numColumns={7}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.seriesGrid}
                    columnWrapperStyle={styles.seriesRow}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={16}
                    initialNumToRender={21}
                    windowSize={5}
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
        backgroundColor: '#050a12',
        flexDirection: 'row',
    },
    bgOverlay: {
        backgroundColor: '#050a12',
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
        backgroundColor: 'rgba(10, 20, 35, 0.4)', // Glass effect
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.06)',
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
});

export default TVSeriesScreen;
