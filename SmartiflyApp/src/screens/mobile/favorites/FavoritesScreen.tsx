/**
 * Smartifly FavoritesScreen
 * 
 * View and manage favorite content:
 * - Filter by type (All, Live, Movies, Series)
 * - Grid display with cards
 * - Long press for quick actions
 * - Empty states
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import FavoritesTabs, { FavoritesTabType } from './components/FavoritesTabs';
import FavoriteCard, { FavoriteCardSkeleton } from './components/FavoriteCard';
import EmptyFavorites from './components/EmptyFavorites';

// Store
import { useFavoritesStore, FavoriteItem } from './store/favoritesStore';

import { colors, spacing, borderRadius } from '../../../theme';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

interface FavoritesScreenProps {
    navigation: any;
}

// =============================================================================
// FAVORITES SCREEN COMPONENT
// =============================================================================

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    // State
    const [activeTab, setActiveTab] = useState<FavoritesTabType>('all');

    // Store
    const {
        favorites,
        isLoaded,
        loadFavorites,
        clearFavorites,
        getFavoritesCount,
    } = useFavoritesStore();

    // Load favorites on mount
    useEffect(() => {
        if (!isLoaded) {
            loadFavorites();
        }
    }, [isLoaded, loadFavorites]);

    // Get counts
    const counts = useMemo(() => getFavoritesCount(), [favorites]);

    // Filter favorites by tab
    const filteredFavorites = useMemo(() => {
        if (activeTab === 'all') return favorites;

        const typeMap: Record<FavoritesTabType, string> = {
            all: '',
            live: 'live',
            movies: 'movie',
            series: 'series',
        };

        return favorites.filter(f => f.type === typeMap[activeTab]);
    }, [favorites, activeTab]);

    // =============================================================================
    // HANDLERS
    // =============================================================================

    const handleBack = () => {
        navigation.goBack();
    };

    const handleClearAll = () => {
        const typeLabel = activeTab === 'all' ? 'all favorites' : `${activeTab} favorites`;

        Alert.alert(
            'Clear Favorites',
            `Are you sure you want to remove ${typeLabel}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        clearFavorites(activeTab === 'all' ? undefined :
                            activeTab === 'live' ? 'live' :
                                activeTab === 'movies' ? 'movie' : 'series'
                        );
                    },
                },
            ]
        );
    };

    const handleItemPress = useCallback((item: FavoriteItem) => {
        switch (item.type) {
            case 'live':
                navigation.navigate('Player', { type: 'live', item });
                break;
            case 'movie':
                // Navigate to MovieDetail instead of direct play
                navigation.navigate('MovieDetail', { movie: item });
                break;
            case 'series':
                navigation.navigate('SeriesDetail', { series: item });
                break;
        }
    }, [navigation]);

    const handleExplore = () => {
        // Navigate to appropriate screen based on tab
        switch (activeTab) {
            case 'live':
                navigation.navigate('Live');
                break;
            case 'movies':
                navigation.navigate('Movies');
                break;
            case 'series':
                navigation.navigate('Series');
                break;
            default:
                navigation.navigate('Home');
        }
    };

    // =============================================================================
    // RENDER FUNCTIONS
    // =============================================================================

    const renderItem = ({ item }: { item: FavoriteItem }) => (
        <FavoriteCard
            item={item}
            onPress={() => handleItemPress(item)}
            columns={3}
        />
    );

    const renderSkeleton = () => (
        <View style={styles.skeletonGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
                <FavoriteCardSkeleton key={i} columns={3} />
            ))}
        </View>
    );

    const keyExtractor = (item: FavoriteItem) => `${item.type}-${item.id}`;

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>

                    <View style={styles.headerTitle}>
                        <Text style={styles.title}>My Favorites</Text>
                        <Text style={styles.subtitle}>
                            {counts.total} {counts.total === 1 ? 'item' : 'items'} saved
                        </Text>
                    </View>

                    {/* Clear All Button */}
                    {filteredFavorites.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={handleClearAll}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.clearText}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Tabs */}
            <FavoritesTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={counts}
            />

            {/* Content */}
            {!isLoaded ? (
                renderSkeleton()
            ) : filteredFavorites.length === 0 ? (
                <EmptyFavorites
                    activeTab={activeTab}
                    onExplore={handleExplore}
                />
            ) : (
                <FlatList
                    data={filteredFavorites}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    numColumns={3}
                    contentContainerStyle={[
                        styles.gridContent,
                        { paddingBottom: insets.bottom + spacing.lg },
                    ]}
                    columnWrapperStyle={styles.gridRow}
                    showsVerticalScrollIndicator={false}
                    // Performance
                    removeClippedSubviews
                    maxToRenderPerBatch={12}
                    windowSize={5}
                    initialNumToRender={12}
                />
            )}
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
    },
    header: {
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    backIcon: {
        fontSize: 20,
        color: colors.textPrimary,
    },
    headerTitle: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    clearButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    clearText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
    gridContent: {
        paddingHorizontal: spacing.base,
    },
    gridRow: {
        justifyContent: 'space-between',
    },
    skeletonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.base,
        justifyContent: 'space-between',
    },
});

export default FavoritesScreen;