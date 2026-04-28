/**
 * TV Live Screen
 *
 * Category-focused live TV browsing.
 * - Left panel: Category list
 * - Right panel: Channels grid
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
import { scale, typographyTV, useTheme } from '../../theme';
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
    styles: ReturnType<typeof createStyles>;
};

type CategoryItemProps = {
    item: Category;
    isSelected: boolean;
    onSelect: (categoryId: string) => void;
    focusEntryRef?: React.Ref<View>;
    styles: ReturnType<typeof createStyles>;
};

// =============================================================================
// LIST CONFIG
// =============================================================================

const GRID_COLUMNS = 5;
const CATEGORY_ROW_SIZE = scale(58);
const LIVE_GRID_CARD_GAP_X = scale(10);
const LIVE_GRID_CARD_GAP_Y = scale(22);

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
        container: { flex: 1, backgroundColor: background, flexDirection: 'row' },
        categoryPanel: { width: scale(350), backgroundColor: 'transparent', paddingTop: scale(40) },
        panelHeader: { paddingHorizontal: scale(20), marginBottom: scale(20) },
        panelTitle: { ...typographyTV.h2, color: textPrimary, letterSpacing: 1, textTransform: 'uppercase' as const },
        titleUnderline: { width: scale(40), height: scale(4), backgroundColor: primaryColor, marginTop: scale(8), borderRadius: scale(2) },
        categoryList: { paddingHorizontal: scale(12) },
        categoryItem: {
            flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
            paddingVertical: scale(12), paddingHorizontal: scale(16), marginBottom: scale(4),
            borderRadius: scale(8), backgroundColor: glassColor,
        },
        categoryItemSelected: { backgroundColor: glassMedium, borderWidth: 1, borderColor: borderMedium },
        categoryItemFocused: { backgroundColor: primaryColor },
        categoryName: { ...typographyTV.bodyMedium, color: textMuted, flex: 1 },
        categoryNameSelected: { color: textPrimary, fontWeight: '600' as const },
        categoryNameFocused: { color: textOnPrimary, fontWeight: 'bold' as const },
        categoryCount: { ...typographyTV.captionSmall, color: textDisabled, marginLeft: scale(8) },
        categoryCountFocused: { color: textOnPrimary },
        channelsPanel: { flex: 1, paddingTop: scale(40), paddingHorizontal: scale(20) },
        gridHeader: { flexDirection: 'row' as const, alignItems: 'baseline' as const, marginBottom: scale(20) },
        selectedCategoryName: { ...typographyTV.h3, color: textPrimary, marginRight: scale(15) },
        channelCount: { ...typographyTV.caption, color: textMuted },
        channelsGrid: { paddingBottom: scale(40), paddingRight: LIVE_GRID_CARD_GAP_X },
        channelsRow: { marginBottom: 0 },
        channelCard: { marginRight: LIVE_GRID_CARD_GAP_X, marginBottom: LIVE_GRID_CARD_GAP_Y },
        loadingState: { paddingVertical: scale(40), alignItems: 'center' as const },
    });
}

// =============================================================================
// CATEGORY ITEM
// =============================================================================

const CategoryItem: React.FC<CategoryItemProps> = React.memo(
    ({ item, isSelected, onSelect, focusEntryRef, styles }) => {
        const [isFocused, setIsFocused] = useState(false);
        const handlePress = useCallback(() => { onSelect(item.id); }, [item.id, onSelect]);
        return (
            <Pressable
                ref={item.id === 'all' ? focusEntryRef : undefined}
                onPress={handlePress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[styles.categoryItem, isSelected && styles.categoryItemSelected, isFocused && styles.categoryItemFocused]}
            >
                <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected, isFocused && styles.categoryNameFocused]} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={[styles.categoryCount, isFocused && styles.categoryCountFocused]}>
                    {item.count}
                </Text>
            </Pressable>
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
                const isSelected = selectedCategoryId === item.id || (selectedCategoryId === null && item.id === 'all');
                return <CategoryItem item={item} isSelected={isSelected} onSelect={onSelect} focusEntryRef={focusEntryRef} styles={styles} />;
            },
            [selectedCategoryId, onSelect, focusEntryRef, styles]
        );
        return (
            <FlatList
                data={categories} renderItem={renderCategory} keyExtractor={(item) => item.id}
                extraData={selectedCategoryId} showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.categoryList} removeClippedSubviews={true}
                getItemLayout={(_, index) => ({ length: CATEGORY_ROW_SIZE, offset: CATEGORY_ROW_SIZE * index, index })}
                initialNumToRender={listPerf.initialNumToRender} maxToRenderPerBatch={listPerf.maxToRenderPerBatch} windowSize={listPerf.windowSize}
            />
        );
    }
);

// =============================================================================
// TV LIVE SCREEN
// =============================================================================

const TVLiveScreen: React.FC<TVLiveScreenProps> = ({ navigation, focusEntryRef }) => {
    const { colors } = useTheme();
    const primaryColor  = colors.primary;
    const textPrimary   = colors.textPrimary;
    const textMuted     = colors.textMuted;
    const textDisabled  = colors.textDisabled;
    const textOnPrimary = colors.textOnPrimary;
    const glassColor    = colors.glass;
    const glassMedium   = colors.glassMedium;
    const borderMedium  = colors.borderMedium;
    const background    = colors.background;

    const styles = useMemo(
        () => createStyles(primaryColor, textPrimary, textMuted, textDisabled, textOnPrimary, glassColor, glassMedium, borderMedium, background),
        [primaryColor, textPrimary, textMuted, textDisabled, textOnPrimary, glassColor, glassMedium, borderMedium, background]
    );

    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, XtreamLiveStream[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);
    const perf = usePerfProfile();
    const gridPerf = perf.grid;
    const gridInitialRender = GRID_COLUMNS * gridPerf.initialRows;
    const gridMaxRenderBatch = GRID_COLUMNS * gridPerf.maxRenderBatchRows;

    const liveLoaded = useStore((state) => state.content.live.loaded);
    const liveItems = useStore((state) => state.content.live.items);
    const liveCategories = useStore((state) => state.content.live.categories);

    useEffect(() => {
        if (!liveLoaded || !liveCategories) { setCategories([]); setCategoryMap({}); setIsPrepared(false); return; }
        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            const items = liveItems;
            const nextMap: Record<string, XtreamLiveStream[]> = { all: items };
            const countMap: Record<string, number> = {};
            for (const ch of items) {
                const catId = String(ch.category_id);
                countMap[catId] = (countMap[catId] || 0) + 1;
                if (!nextMap[catId]) nextMap[catId] = [];
                nextMap[catId].push(ch);
            }
            const nextCategories: Category[] = [{ id: 'all', name: 'All Channels', count: items.length }];
            for (const cat of liveCategories) {
                const catId = String(cat.category_id);
                const count = countMap[catId] || 0;
                if (count > 0) nextCategories.push({ id: catId, name: cat.category_name, count });
            }
            setCategoryMap(nextMap); setCategories(nextCategories); setIsPrepared(true);
        });
        return () => { task.cancel(); };
    }, [liveLoaded, liveCategories, liveItems]);

    const channels = useMemo((): XtreamLiveStream[] => {
        if (!liveLoaded || !isPrepared) return [];
        if (selectedCategoryId && selectedCategoryId !== 'all') return categoryMap[selectedCategoryId] || [];
        return categoryMap.all || [];
    }, [liveLoaded, isPrepared, selectedCategoryId, categoryMap]);

    const selectedCategoryName = useMemo(
        () => categories.find((c) => c.id === (selectedCategoryId || 'all'))?.name,
        [categories, selectedCategoryId]
    );

    const handleChannelPress = useCallback((item: TVContentItem) => {
        if (item.data) navigation.navigate('FullscreenPlayer', { type: 'live', item: item.data });
    }, [navigation]);

    const handleCategorySelect = useCallback((categoryId: string) => { setSelectedCategoryId(categoryId); }, []);

    const renderChannel = useCallback(({ item }: { item: XtreamLiveStream }) => (
        <TVContentCard
            item={{ id: String(item.stream_id), title: item.name, image: item.stream_icon, type: 'live', data: item }}
            onPress={handleChannelPress}
            width={scale(250)}
            height={scale(192)}
            style={styles.channelCard}
            disableZoom={true}
        />
    ), [handleChannelPress, styles.channelCard]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <View style={styles.categoryPanel}>
                <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Live TV</Text>
                    <View style={styles.titleUnderline} />
                </View>
                <CategoryList categories={categories} selectedCategoryId={selectedCategoryId} onSelect={handleCategorySelect} focusEntryRef={focusEntryRef} styles={styles} />
            </View>
            <View style={styles.channelsPanel}>
                <View style={styles.gridHeader}>
                    <Text style={styles.selectedCategoryName}>{selectedCategoryName}</Text>
                    <Text style={styles.channelCount}>{channels.length} channels</Text>
                </View>
                <FlashList
                    data={channels} renderItem={renderChannel} keyExtractor={(item) => String(item.stream_id)}
                    numColumns={GRID_COLUMNS}
                    // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                    estimatedItemSize={scale(205)}
                    showsVerticalScrollIndicator={false} contentContainerStyle={styles.channelsGrid}
                    columnWrapperStyle={styles.channelsRow} removeClippedSubviews={true}
                    maxToRenderPerBatch={gridMaxRenderBatch} initialNumToRender={gridInitialRender}
                    windowSize={gridPerf.windowSize} updateCellsBatchingPeriod={gridPerf.updateCellsBatchingPeriod}
                    ListEmptyComponent={!isPrepared ? <TVLoadingState style={styles.loadingState} /> : null}
                />
            </View>
        </View>
    );
};

export default TVLiveScreen;
