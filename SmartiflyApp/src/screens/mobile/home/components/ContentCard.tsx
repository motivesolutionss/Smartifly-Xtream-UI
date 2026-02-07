/**
 * Smartifly Content Card Component
 *
 * Shared card used by Home rails for Live, Movies, and Series.
 */

import React, { memo, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    ImageStyle,
} from 'react-native';

import FastImageComponent from '../../../../components/FastImageComponent';
import { colors, spacing, borderRadius, Icon } from '../../../../theme';

export type ContentType = 'live' | 'movie' | 'series';

export interface ContentItem {
    id: string | number;
    name: string;
    image?: string;
    type: ContentType;
    rating?: number;
    isNew?: boolean;
    quality?: 'HD' | '4K' | 'SD';
    year?: string;
    episodeCount?: number;
    progress?: number;
    data?: any;
}

export interface ContentCardProps {
    item: ContentItem;
    onPress?: (item: ContentItem) => void;
    variant?: 'poster' | 'thumbnail' | 'channel';
    showTitle?: boolean;
    showRating?: boolean;
    style?: ViewStyle;
    imageStyle?: ImageStyle;
}

const cardSizes = {
    poster: { width: 120, height: 180 },
    thumbnail: { width: 160, height: 90 },
    channel: { width: 100, height: 100 },
} as const;

const ContentCard: React.FC<ContentCardProps> = ({
    item,
    onPress,
    variant = 'poster',
    showTitle = true,
    showRating = true,
    style,
    imageStyle,
}) => {
    const size = variant === 'channel'
        ? cardSizes.channel
        : variant === 'thumbnail'
            ? cardSizes.thumbnail
            : cardSizes.poster;

    const placeholderText = useMemo(() => {
        if (!item.name) return 'NA';
        return item.name.slice(0, 2).toUpperCase();
    }, [item.name]);

    return (
        <TouchableOpacity
            style={[styles.container, { width: size.width }, style]}
            onPress={() => onPress?.(item)}
            activeOpacity={0.8}
        >
            <View
                style={[
                    styles.imageContainer,
                    { width: size.width, height: size.height },
                    variant === 'channel' && styles.channelContainer,
                ]}
            >
                {item.image ? (
                    <FastImageComponent
                        source={{ uri: item.image }}
                        style={[styles.fastImage, { width: size.width, height: size.height }, imageStyle]}
                        showLoader
                    />
                ) : (
                    <View style={[styles.placeholder, { width: size.width, height: size.height }]}>
                        <Text style={styles.placeholderText}>{placeholderText}</Text>
                    </View>
                )}

                {item.type === 'live' && (
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                )}

                {!!item.quality && item.type !== 'live' && (
                    <View style={[styles.qualityBadge, item.quality === '4K' && styles.qualityBadge4K]}>
                        <Text style={styles.qualityText}>{item.quality}</Text>
                    </View>
                )}

                {!!item.isNew && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}

                {showRating && (item.rating ?? 0) > 0 && (
                    <View style={styles.ratingBadge}>
                        <Icon name="star" size={10} color={colors.qualityUHD} />
                        <Text style={styles.ratingText}>{item.rating!.toFixed(1)}</Text>
                    </View>
                )}

                {typeof item.progress === 'number' && item.progress > 0 && item.type !== 'live' && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${Math.min(item.progress, 100)}%` }]} />
                    </View>
                )}

                {variant === 'poster' && <View style={styles.gradientOverlay} />}
            </View>

            {showTitle && (
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={2}>
                        {item.name}
                    </Text>
                    {!!item.year && variant === 'poster' && <Text style={styles.year}>{item.year}</Text>}
                    {(item.episodeCount ?? 0) > 0 && item.type === 'series' && (
                        <Text style={styles.episodeCount}>{item.episodeCount} Episodes</Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

export interface ContentCardSkeletonProps {
    variant?: 'poster' | 'thumbnail' | 'channel';
    style?: ViewStyle;
}

export const ContentCardSkeleton: React.FC<ContentCardSkeletonProps> = ({
    variant = 'poster',
    style,
}) => {
    const size = variant === 'channel'
        ? cardSizes.channel
        : variant === 'thumbnail'
            ? cardSizes.thumbnail
            : cardSizes.poster;

    return (
        <View style={[styles.container, { width: size.width }, style]}>
            <View
                style={[
                    styles.skeletonImage,
                    { width: size.width, height: size.height },
                    variant === 'channel' && styles.skeletonChannel,
                ]}
            />
            <View style={styles.skeletonTitle} />
        </View>
    );
};

const areEqual = (prev: ContentCardProps, next: ContentCardProps) => (
    prev.item.id === next.item.id &&
    prev.item.name === next.item.name &&
    prev.item.image === next.item.image &&
    prev.item.type === next.item.type &&
    prev.item.rating === next.item.rating &&
    prev.item.progress === next.item.progress &&
    prev.item.quality === next.item.quality &&
    prev.item.isNew === next.item.isNew &&
    prev.item.year === next.item.year &&
    prev.item.episodeCount === next.item.episodeCount &&
    prev.variant === next.variant &&
    prev.showTitle === next.showTitle &&
    prev.showRating === next.showRating &&
    prev.onPress === next.onPress &&
    prev.style === next.style &&
    prev.imageStyle === next.imageStyle
);

const styles = StyleSheet.create({
    container: {
        marginRight: spacing.sm,
    },
    imageContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.backgroundTertiary,
        position: 'relative',
    },
    channelContainer: {
        borderRadius: borderRadius.md,
    },
    fastImage: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    placeholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundTertiary,
    },
    placeholderText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textMuted,
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: 'transparent',
    },
    liveBadge: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.live,
        paddingHorizontal: spacing.xs,
        paddingVertical: 3,
        borderRadius: borderRadius.sm,
        gap: spacing.xxs,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.textPrimary,
    },
    liveBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    qualityBadge: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    qualityBadge4K: {
        backgroundColor: colors.qualityUHD,
    },
    qualityText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    newBadge: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        backgroundColor: colors.success,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    newBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    ratingBadge: {
        position: 'absolute',
        bottom: spacing.xs,
        right: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        gap: 2,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    progressContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    titleContainer: {
        marginTop: spacing.xs,
        paddingRight: spacing.xxs,
    },
    title: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textPrimary,
        lineHeight: 16,
    },
    year: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    episodeCount: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    skeletonImage: {
        borderRadius: borderRadius.lg,
        backgroundColor: colors.skeleton,
    },
    skeletonChannel: {
        borderRadius: borderRadius.md,
    },
    skeletonTitle: {
        height: 14,
        width: '80%',
        backgroundColor: colors.skeleton,
        borderRadius: borderRadius.sm,
        marginTop: spacing.xs,
    },
});

export default memo(ContentCard, areEqual);
