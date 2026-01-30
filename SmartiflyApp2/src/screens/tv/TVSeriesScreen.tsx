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

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    StatusBar,
    BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useStore from '../../store';
import { colors, scale, scaleFont } from '../../theme';
import TVContentCard, { TVContentItem } from './home/components/TVContentCard';

// =============================================================================
// TYPES
// =============================================================================

interface Category {
    id: string;
    name: string;
    count: number;
}

interface TVSeriesScreenProps {
    navigation: any;
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

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    const categories = useMemo((): Category[] => {
        if (!content.series.loaded || !content.series.categories) return [];

        const cats: Category[] = [
            { id: 'all', name: 'All Series', count: content.series.items.length },
        ];

        for (const cat of content.series.categories) {
            const count = content.series.items.filter(
                (s: any) => String(s.category_id) === String(cat.category_id)
            ).length;

            if (count > 0) {
                cats.push({
                    id: String(cat.category_id),
                    name: cat.category_name,
                    count,
                });
            }
        }

        return cats;
    }, [content.series.loaded, content.series.categories, content.series.items]);

    // ==========================================================================
    // SERIES (filtered by category)
    // ==========================================================================

    const series = useMemo((): TVContentItem[] => {
        if (!content.series.loaded) return [];

        let items = content.series.items;

        if (selectedCategoryId && selectedCategoryId !== 'all') {
            items = items.filter(
                (s: any) => String(s.category_id) === selectedCategoryId
            );
        }

        return items.map((s: any) => ({
            id: String(s.series_id),
            title: s.name,
            image: s.cover,
            rating: s.rating_5based,
            type: 'series' as const,
            data: s,
        }));
    }, [content.series.items, content.series.loaded, selectedCategoryId]);

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
            width={scale(140)}
            height={scale(210)}
        />
    );

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Category Panel */}
            <View style={styles.categoryPanel}>
                <Text style={styles.panelTitle}>Series</Text>
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
                <Text style={styles.seriesCount}>
                    {series.length} series
                </Text>
                <FlatList
                    data={series}
                    renderItem={renderSeries}
                    keyExtractor={(item) => String(item.id)}
                    numColumns={6}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.seriesGrid}
                    columnWrapperStyle={styles.seriesRow}
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
    // Series Panel
    seriesPanel: {
        flex: 1,
        paddingTop: scale(40),
        paddingHorizontal: scale(20),
    },
    seriesCount: {
        fontSize: scaleFont(18),
        color: colors.textMuted || '#666',
        marginBottom: scale(20),
    },
    seriesGrid: {
        paddingBottom: scale(40),
    },
    seriesRow: {
        marginBottom: scale(20),
    },
});

export default TVSeriesScreen;
