/**
 * TV Movies Screen
 * 
 * Category-focused movie browsing.
 * - Left panel: Category list
 * - Right panel: Movies grid
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
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import useStore from '@smartifly/shared/src/store';
import { scale, typographyTV, useTheme } from '../theme';
import TVContentCard, { TVContentItem } from './home/components/TVContentCard';
import { XtreamMovie } from '@smartifly/shared/src/api/xtream';
import { TVMoviesScreenProps } from '../navigation/types';
import { useContentFilter } from '@smartifly/shared/src/store/profileStore';
import { scheduleIdleWork } from '@smartifly/shared/src/utils/idle';
import TVLoadingState from './components/TVLoadingState';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import { seededShuffle } from '@smartifly/shared/src/utils/shuffle';

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
        // Movies Panel
        moviesPanel: {
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
        movieCount: {
            ...typographyTV.caption,
            color: textMuted,
        },
        moviesGrid: {
            paddingBottom: scale(60),
            paddingRight: scale(18),
        },
        moviesRow: {
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
                        <Animated.Text
                            style={[
                                styles.categoryCount,
                                countStyle,
                            ]}
                        >
                            {item.count}
                        </Animated.Text>
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

const GRID_COLUMNS = 5;
const CATEGORY_ROW_SIZE = scale(62); // row height + margin (approx)
const GRID_CARD_WIDTH = scale(265);
const GRID_CARD_HEIGHT = scale(398);

// =============================================================================
// TV MOVIES SCREEN
// =============================================================================


const TVMoviesScreen: React.FC<TVMoviesScreenProps> = ({ navigation, focusEntryRef }) => {
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
    const [categoryMap, setCategoryMap] = useState<Record<string, XtreamMovie[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);
    const dayShuffleSeed = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const perf = usePerfProfile();
    const gridPerf = perf.grid;
    const gridInitialRender = GRID_COLUMNS * gridPerf.initialRows;
    const gridMaxRenderBatch = GRID_COLUMNS * gridPerf.maxRenderBatchRows;

    // Store (narrow selectors to avoid re-render on other domains)
    const moviesLoaded = useStore((state) => state.content.movies.loaded);
    const moviesItems = useStore((state) => state.content.movies.items);
    const moviesCategories = useStore((state) => state.content.movies.categories);
    const { filterContent } = useContentFilter();

    // ==========================================================================
    // CATEGORIES
    // ==========================================================================

    useEffect(() => {
        if (!moviesLoaded || !moviesCategories) {
            setCategories([]);
            setCategoryMap({});
            setIsPrepared(false);
            return;
        }

        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            const filteredAllMovies = filterContent(moviesItems as any[]);
            const shuffledAllMovies = seededShuffle(
                filteredAllMovies,
                (movie) => String(movie.stream_id || ''),
                `movies:all:${dayShuffleSeed}`
            );
            const nextMap: Record<string, XtreamMovie[]> = {
                all: shuffledAllMovies,
            };

            for (const movie of shuffledAllMovies) {
                const catId = String(movie.category_id);
                if (!nextMap[catId]) nextMap[catId] = [];
                nextMap[catId].push(movie);
            }

            for (const [catId, catMovies] of Object.entries(nextMap)) {
                if (catId === 'all') continue;
                nextMap[catId] = seededShuffle(
                    catMovies,
                    (movie) => String(movie.stream_id || ''),
                    `movies:${catId}:${dayShuffleSeed}`
                );
            }

            const nextCategories: Category[] = [
                { id: 'all', name: 'All Movies', count: shuffledAllMovies.length },
            ];

            for (const cat of moviesCategories) {
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
    }, [moviesLoaded, moviesCategories, moviesItems, filterContent, dayShuffleSeed]);

    // ==========================================================================
    // MOVIES (filtered by category)
    // ==========================================================================

    const movies = useMemo((): XtreamMovie[] => {
        if (!moviesLoaded || !isPrepared) return [];

        const key = selectedCategoryId && selectedCategoryId !== 'all'
            ? selectedCategoryId
            : 'all';

        return categoryMap[key] || [];
    }, [moviesLoaded, isPrepared, selectedCategoryId, categoryMap]);

    const selectedCategoryName = useMemo(() => {
        return categories.find((c) => c.id === (selectedCategoryId || 'all'))?.name;
    }, [categories, selectedCategoryId]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    // BackHandler is now managed by the parent TVHomeScreen
    // to switch sections instead of navigating


    const handleMoviePress = useCallback((item: TVContentItem) => {
        if (item.data) {
            navigation.navigate('TVMovieDetail', {
                movie: item.data
            });
        }
    }, [navigation]);

    const handleCategorySelect = useCallback((categoryId: string) => {
        setSelectedCategoryId(categoryId);
    }, []);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const renderMovie = useCallback(({ item }: { item: XtreamMovie }) => (
        <TVContentCard
            item={{
                id: String(item.stream_id),
                title: item.name,
                image: item.stream_icon,
                rating: item.rating_5based,
                quality: item.container_extension === 'mp4' ? 'HD' : undefined,
                type: 'movie',
                data: item,
            }}
            onPress={handleMoviePress}
            width={GRID_CARD_WIDTH}
            height={GRID_CARD_HEIGHT}
            style={styles.gridCardSpacing}
            disableZoom={true}
        />
    ), [handleMoviePress, styles]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />


            {/* Category Panel */}
            <View style={styles.categoryPanel}>
                <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Movies</Text>
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

            {/* Movies Grid */}
            <View style={styles.moviesPanel}>
                <View style={styles.gridHeader}>
                    <Text style={styles.selectedCategoryName}>
                        {selectedCategoryName}
                    </Text>
                    <Text style={styles.movieCount}>
                        {movies.length} titles available
                    </Text>
                </View>

                <FlashList
                    data={movies}
                    renderItem={renderMovie}
                    keyExtractor={(item) => String(item.stream_id)}
                    numColumns={GRID_COLUMNS}
                    // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                    estimatedItemSize={scale(390)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.moviesGrid}
                    columnWrapperStyle={styles.moviesRow}
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

export default TVMoviesScreen;
