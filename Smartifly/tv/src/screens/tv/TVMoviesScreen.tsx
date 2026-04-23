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
import { XtreamMovie } from '../../api/xtream';
import { TVMoviesScreenProps } from '../../navigation/types';
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
const CATEGORY_ROW_SIZE = scale(62); // row height + margin (approx)

// =============================================================================
// TV MOVIES SCREEN
// =============================================================================


const TVMoviesScreen: React.FC<TVMoviesScreenProps> = ({ navigation, focusEntryRef }) => {
    // State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, XtreamMovie[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);
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
            const nextMap: Record<string, XtreamMovie[]> = {
                all: filteredAllMovies,
            };

            for (const movie of filteredAllMovies) {
                const catId = String(movie.category_id);
                if (!nextMap[catId]) nextMap[catId] = [];
                nextMap[catId].push(movie);
            }

            const nextCategories: Category[] = [
                { id: 'all', name: 'All Movies', count: filteredAllMovies.length },
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
    }, [moviesLoaded, moviesCategories, moviesItems, filterContent]);

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
            width={scale(180)}
            height={scale(270)}
            disableZoom={true}
        />
    ), [handleMoviePress]);

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
                    estimatedItemSize={scale(300)}
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
        backgroundColor: '#E50914',
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
        backgroundColor: '#E50914',
        transform: [{ scale: 1.02 }],
        elevation: 10,
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
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
        fontSize: scaleFont(26),
        fontWeight: '800',
        color: '#FFF',
        marginRight: scale(15),
    },
    movieCount: {
        fontSize: scaleFont(16),
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '500',
    },
    moviesGrid: {
        paddingBottom: scale(60),
        paddingRight: scale(20),
    },
    moviesRow: {
        justifyContent: 'flex-start',
        marginBottom: scale(30),
    },
    loadingState: {
        paddingVertical: scale(40),
        alignItems: 'center',
    },
});

export default TVMoviesScreen;
