/**
 * Smartifly Content Row Component
 * 
 * Horizontal scrollable content row with:
 * - Section header with title and "See All" link
 * - Color-coded accent indicator
 * - Horizontal FlatList of content cards
 * - Loading skeleton state
 * - Empty state handling
 * Uses Phosphor icons for modern UI.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    ListRenderItem,
} from 'react-native';
import { Icon } from '../../../../theme';
import ContentCard, { ContentItem, ContentCardSkeleton } from './ContentCard';
import { colors, spacing, borderRadius } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

export type RowType = 'live' | 'movies' | 'series' | 'continue' | 'favorites' | 'recent';

export interface ContentRowProps {
    title: string;
    type: RowType;
    items: ContentItem[];
    onSeeAllPress?: () => void;
    onItemPress?: (item: ContentItem) => void;
    isLoading?: boolean;
    showSeeAll?: boolean;
    maxItems?: number;
    style?: ViewStyle;
    icon?: string;
    accentColor?: string;
}

// =============================================================================
// ROW CONFIGURATION
// =============================================================================

const getRowIcon = (type: RowType, color: string, size: number = 18) => {
    switch (type) {
        case 'live':
            return <Icon name="broadcast" size={size} color={color} weight="bold" />;
        case 'movies':
            return <Icon name="filmStrip" size={size} color={color} weight="bold" />;
        case 'series':
            return <Icon name="monitorPlay" size={size} color={color} weight="bold" />;
        case 'continue':
            return <Icon name="play" size={size} color={color} weight="fill" />;
        case 'favorites':
            return <Icon name="heart" size={size} color={color} weight="fill" />;
        case 'recent':
            return <Icon name="clock" size={size} color={color} weight="bold" />;
        default:
            return <Icon name="filmStrip" size={size} color={color} weight="bold" />;
    }
};

const ROW_COLORS: Record<RowType, string> = {
    live: colors.live,
    movies: colors.movies,
    series: colors.series,
    continue: colors.accent,
    favorites: colors.primary,
    recent: colors.warning,
};

// =============================================================================
// ROW HEADER COMPONENT
// =============================================================================

interface RowHeaderProps {
    title: string;
    type: RowType;
    icon?: string;
    onSeeAllPress?: () => void;
    showSeeAll?: boolean;
    itemCount?: number;
    accentColor?: string;
}

const RowHeader: React.FC<RowHeaderProps> = ({
    title,
    type,
    onSeeAllPress,
    showSeeAll = true,
    itemCount,
    accentColor,
}) => {
    const activeColor = accentColor || ROW_COLORS[type] || colors.primary;

    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                {/* Accent Indicator */}
                <View style={[styles.accentDot, { backgroundColor: activeColor }]} />

                {/* Icon */}
                {getRowIcon(type, activeColor)}

                {/* Title */}
                <Text style={styles.headerTitle}>{title}</Text>

                {/* Count Badge */}
                {itemCount !== undefined && itemCount > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{itemCount}</Text>
                    </View>
                )}
            </View>

            {/* See All Button */}
            {showSeeAll && onSeeAllPress && (
                <TouchableOpacity
                    style={styles.seeAllButton}
                    onPress={onSeeAllPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={[styles.seeAllText, { color: activeColor }]}>
                        See All
                    </Text>
                    <Icon name="caretRight" size={14} color={activeColor} weight="bold" />
                </TouchableOpacity>
            )}
        </View>
    );
};

// =============================================================================
// LOADING SKELETON
// =============================================================================

const LoadingSkeleton: React.FC = () => (
    <View style={styles.skeletonContainer}>
        {[1, 2, 3, 4, 5].map((i) => (
            <ContentCardSkeleton key={i} variant="poster" />
        ))}
    </View>
);

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
    type: RowType;
}

const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
    const getMessage = () => {
        switch (type) {
            case 'live': return 'No live channels available';
            case 'movies': return 'No movies available';
            case 'series': return 'No series available';
            case 'continue': return 'Start watching to see your progress here';
            case 'favorites': return 'Add favorites to see them here';
            case 'recent': return 'Your recently watched content will appear here';
            default: return 'No content available';
        }
    };

    return (
        <View style={styles.emptyContainer}>
            {getRowIcon(type, colors.textMuted, 32)}
            <Text style={styles.emptyText}>{getMessage()}</Text>
        </View>
    );
};

const Separator = () => <View style={styles.separator} />;

// =============================================================================
// CONTENT ROW COMPONENT
// =============================================================================

const ContentRow: React.FC<ContentRowProps> = ({
    title,
    type,
    items, // mapped from items
    onSeeAllPress,
    onItemPress,
    isLoading = false,
    showSeeAll = true,
    maxItems = 15,
    style,
    icon,
    accentColor,
}) => {
    // Limit items displayed
    const displayData = useMemo(() => (items ? items.slice(0, maxItems) : []), [items, maxItems]);
    const cardVariant = type === 'live' ? 'channel' : 'poster';

    // Don't render if no data and not loading
    if (!isLoading && displayData.length === 0) {
        return null;
    }

    const handleItemPress = useCallback((item: ContentItem) => {
        onItemPress?.(item);
    }, [onItemPress]);

    // Render individual content card
    const renderItem = useCallback<ListRenderItem<ContentItem>>(
        ({ item }) => (
            <ContentCard
                item={item}
                onPress={handleItemPress}
                variant={cardVariant}
                showRating={type !== 'live'}
            />
        ),
        [cardVariant, handleItemPress, type]
    );

    // Key extractor
    const keyExtractor = useCallback((item: ContentItem) => String(item.id), []);

    return (
        <View style={[styles.container, style]}>
            {/* Header */}
            <RowHeader
                title={title}
                type={type}
                icon={icon}
                onSeeAllPress={onSeeAllPress}
                showSeeAll={showSeeAll && items && items.length > maxItems}
                itemCount={items ? items.length : 0}
                accentColor={accentColor}
            />

            {/* Content */}
            {isLoading ? (
                <LoadingSkeleton />
            ) : displayData.length === 0 ? (
                <EmptyState type={type} />
            ) : (
                <FlatList
                    horizontal
                    data={displayData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={Separator}
                    // Performance optimizations
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={5}
                    getItemLayout={(_, index) => ({
                        length: type === 'live' ? 108 : 128,
                        offset: (type === 'live' ? 108 : 128) * index,
                        index,
                    })}
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
        marginBottom: spacing.lg,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.base,
        marginBottom: spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    accentDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    countBadge: {
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    countText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xxs,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // List
    listContent: {
        paddingHorizontal: spacing.base,
    },
    separator: {
        width: spacing.sm,
    },

    // Skeleton
    skeletonContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
});

export default memo(ContentRow);
