/**
 * Smartifly SearchResults Component
 *
 * Renders search results grouped by content type.
 */

import React, { memo, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import FastImageComponent from '../../../../components/FastImageComponent';
import { colors, spacing, borderRadius, Icon, IconName } from '../../../../theme';

const skeletonColors = {
    base: colors.skeleton,
};

export interface SearchResultItem {
    id: string | number;
    name: string;
    image?: string;
    type: 'live' | 'movie' | 'series';
    rating?: number;
    year?: string;
    category?: string;
    seasonCount?: number;
    data?: any;
}

export interface SearchResultsData {
    live: SearchResultItem[];
    movies: SearchResultItem[];
    series: SearchResultItem[];
}

export interface SearchResultsProps {
    results: SearchResultsData;
    query: string;
    onItemPress: (item: SearchResultItem) => void;
    onSeeAllPress: (type: 'live' | 'movies' | 'series') => void;
    maxItemsPerCategory?: number;
    showAll?: boolean;
    style?: ViewStyle;
}

interface ResultItemProps {
    item: SearchResultItem;
    onPress: (item: SearchResultItem) => void;
}

const ResultItem: React.FC<ResultItemProps> = memo(({ item, onPress }) => {
    const isLive = item.type === 'live';
    const itemWidth = isLive ? 100 : 110;
    const itemHeight = isLive ? 100 : 165;

    const accentColor =
        item.type === 'live'
            ? colors.live
            : item.type === 'movie'
                ? colors.movies
                : colors.series;

    return (
        <TouchableOpacity
            style={[styles.resultItem, { width: itemWidth }]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            <View
                style={[
                    styles.resultImage,
                    { width: itemWidth },
                    isLive ? styles.resultImageLive : { height: itemHeight - 50 },
                ]}
            >
                <FastImageComponent
                    source={{ uri: item.image }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                />

                {isLive && (
                    <View style={[styles.liveBadge, { backgroundColor: accentColor }]}>
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                )}

                {item.rating !== undefined && item.rating > 0 && !isLive && (
                    <View style={styles.ratingBadge}>
                        <Icon name="star" size={10} color={colors.qualityUHD} />
                        <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                    </View>
                )}
            </View>

            <View style={styles.resultInfo}>
                <Text style={styles.resultName} numberOfLines={2}>
                    {item.name}
                </Text>
                {(item.year || item.seasonCount) && (
                    <Text style={styles.resultMeta} numberOfLines={1}>
                        {item.year}
                        {item.seasonCount && ` - ${item.seasonCount}S`}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
});

interface ResultSectionProps {
    title: string;
    icon: IconName;
    color: string;
    items: SearchResultItem[];
    onItemPress: (item: SearchResultItem) => void;
    onSeeAllPress: () => void;
    maxItems: number;
}

const ResultSection: React.FC<ResultSectionProps> = memo(({
    title,
    icon,
    color,
    items,
    onItemPress,
    onSeeAllPress,
    maxItems,
}) => {
    if (items.length === 0) return null;

    const displayItems = maxItems >= items.length ? items : items.slice(0, maxItems);
    const hasMore = items.length > maxItems;

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionDot, { backgroundColor: color }]} />
                    <Icon name={icon} size={16} color={colors.textPrimary} />
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <View style={styles.sectionCount}>
                        <Text style={styles.sectionCountText}>{items.length}</Text>
                    </View>
                </View>
                {hasMore && (
                    <TouchableOpacity
                        style={styles.seeAllButton}
                        onPress={onSeeAllPress}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={[styles.seeAllText, { color }]}>See All</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={items[0].type === 'live' ? styles.liveSectionContainer : styles.vodSectionContainer}>
                <FlashList
                    horizontal
                    data={displayItems}
                    // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                    estimatedItemSize={110}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    renderItem={({ item }) => (
                        <ResultItem
                            item={item}
                            onPress={onItemPress}
                        />
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sectionList}
                />
            </View>
        </View>
    );
});

const SearchResults: React.FC<SearchResultsProps> = ({
    results,
    query,
    onItemPress,
    onSeeAllPress,
    maxItemsPerCategory = 10,
    showAll = false,
    style,
}) => {
    const totalResults = results.live.length + results.movies.length + results.series.length;

    if (totalResults === 0) {
        return null;
    }

    const maxItemsBySection = useMemo(() => ({
        live: showAll ? results.live.length : maxItemsPerCategory,
        movies: showAll ? results.movies.length : maxItemsPerCategory,
        series: showAll ? results.series.length : maxItemsPerCategory,
    }), [maxItemsPerCategory, results.live.length, results.movies.length, results.series.length, showAll]);

    return (
        <View style={[styles.container, style]}>
            <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                    {totalResults} results for "{query}"
                </Text>
            </View>

            <ResultSection
                title="Live Channels"
                icon="television"
                color={colors.live}
                items={results.live}
                onItemPress={onItemPress}
                onSeeAllPress={() => onSeeAllPress('live')}
                maxItems={maxItemsBySection.live}
            />

            <ResultSection
                title="Movies"
                icon="filmStrip"
                color={colors.movies}
                items={results.movies}
                onItemPress={onItemPress}
                onSeeAllPress={() => onSeeAllPress('movies')}
                maxItems={maxItemsBySection.movies}
            />

            <ResultSection
                title="Series"
                icon="monitorPlay"
                color={colors.series}
                items={results.series}
                onItemPress={onItemPress}
                onSeeAllPress={() => onSeeAllPress('series')}
                maxItems={maxItemsBySection.series}
            />
        </View>
    );
};

export const SearchResultsSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
    <View style={[styles.container, style]}>
        {['live', 'movies', 'series'].map((type) => (
            <View key={type} style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={styles.skeletonHeader} />
                </View>

                <View style={styles.skeletonRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <View key={i} style={styles.skeletonItem}>
                            <View style={styles.skeletonImage} />
                            <View style={styles.skeletonTitle} />
                            <View style={styles.skeletonMeta} />
                        </View>
                    ))}
                </View>
            </View>
        ))}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    resultsHeader: {
        paddingHorizontal: spacing.base,
        marginBottom: spacing.md,
    },
    resultsCount: {
        fontSize: 14,
        color: colors.textMuted,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.base,
        marginBottom: spacing.md,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    sectionCount: {
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.round,
    },
    sectionCountText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
    },
    seeAllButton: {
        padding: spacing.xs,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    sectionList: {
        paddingHorizontal: spacing.base,
    },
    resultItem: {
        marginRight: spacing.sm,
    },
    resultImage: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.backgroundTertiary,
        position: 'relative',
    },
    liveBadge: {
        position: 'absolute',
        top: spacing.xxs,
        left: spacing.xxs,
        paddingHorizontal: spacing.xxs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    liveBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    ratingBadge: {
        position: 'absolute',
        bottom: spacing.xxs,
        right: spacing.xxs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: colors.overlay,
        paddingHorizontal: spacing.xxs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.qualityUHD,
    },
    resultInfo: {
        marginTop: spacing.xs,
    },
    resultName: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textPrimary,
        lineHeight: 15,
    },
    resultMeta: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    skeletonHeader: {
        width: 150,
        height: 18,
        backgroundColor: skeletonColors.base,
        borderRadius: borderRadius.sm,
    },
    skeletonRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.base,
    },
    skeletonItem: {
        width: 110,
        marginRight: spacing.sm,
    },
    skeletonImage: {
        width: 110,
        height: 120,
        backgroundColor: skeletonColors.base,
        borderRadius: borderRadius.lg,
    },
    skeletonTitle: {
        width: '80%',
        height: 12,
        backgroundColor: skeletonColors.base,
        borderRadius: borderRadius.sm,
        marginTop: spacing.sm,
    },
    skeletonMeta: {
        width: '50%',
        height: 10,
        backgroundColor: skeletonColors.base,
        borderRadius: borderRadius.sm,
        marginTop: spacing.xxs,
    },
    liveSectionContainer: {
        height: 140,
    },
    vodSectionContainer: {
        height: 190,
    },
    resultImageLive: {
        height: 60,
        borderRadius: borderRadius.md,
    },
});

export default memo(SearchResults);
