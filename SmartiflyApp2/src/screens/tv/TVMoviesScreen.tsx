/**
 * TV Movies Screen
 * 
 * Category-focused movie browsing.
 * - Left panel: Category list
 * - Right panel: Movies grid
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

interface TVMoviesScreenProps {
    navigation: any;
}

// =============================================================================
// TV MOVIES SCREEN
// =============================================================================

const TVMoviesScreen: React.FC<TVMoviesScreenProps> = ({ navigation }) => {
    // State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);

    // Store
    const { content } = useStore();

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    const categories = useMemo((): Category[] => {
        if (!content.movies.loaded || !content.movies.categories) return [];

        const cats: Category[] = [
            { id: 'all', name: 'All Movies', count: content.movies.items.length },
        ];

        for (const cat of content.movies.categories) {
            const count = content.movies.items.filter(
                (m: any) => String(m.category_id) === String(cat.category_id)
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
    }, [content.movies.loaded, content.movies.categories, content.movies.items]);

    // ==========================================================================
    // MOVIES (filtered by category)
    // ==========================================================================

    const movies = useMemo((): TVContentItem[] => {
        if (!content.movies.loaded) return [];

        let items = content.movies.items;

        if (selectedCategoryId && selectedCategoryId !== 'all') {
            items = items.filter(
                (m: any) => String(m.category_id) === selectedCategoryId
            );
        }

        return items.map((m: any) => ({
            id: String(m.stream_id),
            title: m.name,
            image: m.stream_icon,
            rating: m.rating_5based,
            quality: m.container_extension === 'mp4' ? 'HD' : undefined,
            type: 'movie' as const,
            data: m,
        }));
    }, [content.movies.items, content.movies.loaded, selectedCategoryId]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    // BackHandler is now managed by the parent TVHomeScreen
    // to switch sections instead of navigating


    const handleMoviePress = (item: TVContentItem) => {
        if (item.data) {
            navigation.navigate('TVMovieDetail', {
                movie: item.data
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

    const renderMovie = ({ item }: { item: TVContentItem }) => (
        <TVContentCard
            item={item}
            onPress={handleMoviePress}
            width={scale(140)}
            height={scale(210)}
        />
    );

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Category Panel */}
            <View style={styles.categoryPanel}>
                <Text style={styles.panelTitle}>Movies</Text>
                <FlatList
                    data={categories}
                    renderItem={renderCategory}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.categoryList}
                />
            </View>

            {/* Movies Grid */}
            <View style={styles.moviesPanel}>
                <Text style={styles.movieCount}>
                    {movies.length} movies
                </Text>
                <FlatList
                    data={movies}
                    renderItem={renderMovie}
                    keyExtractor={(item) => String(item.id)}
                    numColumns={6}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.moviesGrid}
                    columnWrapperStyle={styles.moviesRow}
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
    // Movies Panel
    moviesPanel: {
        flex: 1,
        paddingTop: scale(40),
        paddingHorizontal: scale(20),
    },
    movieCount: {
        fontSize: scaleFont(18),
        color: colors.textMuted || '#666',
        marginBottom: scale(20),
    },
    moviesGrid: {
        paddingBottom: scale(40),
    },
    moviesRow: {
        marginBottom: scale(20),
    },
});

export default TVMoviesScreen;
