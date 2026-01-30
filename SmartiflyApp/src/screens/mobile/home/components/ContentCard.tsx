/**
 * Smartifly Content Card Component
 * 
 * Individual content card for displaying:
 * - Live channels
 * - Movies
 * - Series
 * 
 * Features:
 * - Poster image with loading state
 * - Type badges (LIVE, HD, NEW)
 * - Rating display
 * - Title with line clamp
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    ImageStyle,
} from 'react-native';

import { colors, spacing, borderRadius } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

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
    onPress?: () => void;
    variant?: 'poster' | 'thumbnail' | 'channel';
    showTitle?: boolean;
    showRating?: boolean;
    style?: ViewStyle;
    imageStyle?: ImageStyle;
}

// =============================================================================
// SIZE CONFIGURATIONS
// =============================================================================

const cardSizes = {
    poster: { width: 120, height: 180 },
    posterLarge: { width: 140, height: 210 },
    thumbnail: { width: 160, height: 90 },
    thumbnailWide: { width: 200, height: 113 },
    channel: { width: 100, height: 100 },
};

// =============================================================================
// COMPONENT
// =============================================================================

const ContentCard: React.FC<ContentCardProps> = ({
    item,
    onPress,
    variant = 'poster',
    showTitle = true,
    showRating = true,
    style,
    imageStyle,
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Get size based on variant
    const size = variant === 'channel'
        ? cardSizes.channel
        : variant === 'thumbnail'
            ? cardSizes.thumbnail
            : cardSizes.poster;

    // Get placeholder text for error state
    const getPlaceholderText = () => {
        if (item.name.length > 0) {
            return item.name.substring(0, 2).toUpperCase();
        }
        return '??';
    };

    // Get type color
    const getTypeColor = () => {
        switch (item.type) {
            case 'live': return colors.live;
            case 'movie': return colors.movies;
            case 'series': return colors.series;
            default: return colors.primary;
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, { width: size.width }, style]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Image Container */}
            <View style={[
                styles.imageContainer,
                { width: size.width, height: size.height },
                variant === 'channel' && styles.channelContainer,
            ]}>
                {/* Placeholder/Loading */}
                {(!imageLoaded || imageError) && (
                    <View style={[styles.placeholder, { width: size.width, height: size.height }]}>
                        {imageError ? (
                            <Text style={styles.placeholderText}>{getPlaceholderText()}</Text>
                        ) : (
                            <View style={styles.loadingShimmer} />
                        )}
                    </View>
                )}

                {/* Actual Image */}
                {item.image && !imageError && (
                    <Image
                        source={{ uri: item.image }}
                        style={[
                            styles.image,
                            { width: size.width, height: size.height },
                            imageStyle,
                        ]}
                        resizeMode="cover"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                )}

                {/* Live Badge */}
                {item.type === 'live' && (
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                )}

                {/* Quality Badge */}
                {!!item.quality && item.type !== 'live' && (
                    <View style={[
                        styles.qualityBadge,
                        item.quality === '4K' && styles.qualityBadge4K,
                    ]}>
                        <Text style={styles.qualityText}>{item.quality}</Text>
                    </View>
                )}

                {/* New Badge */}
                {!!item.isNew && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}

                {/* Rating Badge */}
                {showRating && (item.rating ?? 0) > 0 && (
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingIcon}>★</Text>
                        <Text style={styles.ratingText}>{item.rating!.toFixed(1)}</Text>
                    </View>
                )}

                {/* Progress Bar (Continue Watching) */}
                {typeof item.progress === 'number' && item.progress > 0 && item.type !== 'live' && (
                    <View style={styles.progressContainer}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${Math.min(item.progress, 100)}%` }
                            ]}
                        />
                    </View>
                )}

                {/* Gradient Overlay (for poster variant) */}
                {variant === 'poster' && (
                    <View style={styles.gradientOverlay} />
                )}
            </View>

            {/* Title */}
            {showTitle && (
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={2}>
                        {item.name}
                    </Text>
                    {!!item.year && variant === 'poster' && (
                        <Text style={styles.year}>{item.year}</Text>
                    )}
                    {(item.episodeCount ?? 0) > 0 && item.type === 'series' && (
                        <Text style={styles.episodeCount}>
                            {item.episodeCount} Episodes
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

// =============================================================================
// SKELETON LOADER
// =============================================================================

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
            <View style={[
                styles.skeletonImage,
                { width: size.width, height: size.height },
                variant === 'channel' && styles.skeletonChannel,
            ]} />
            <View style={styles.skeletonTitle} />
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

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
    image: {
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
    loadingShimmer: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.skeleton,
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: 'transparent',
        // Add gradient if using react-native-linear-gradient
    },

    // Badges
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
    ratingIcon: {
        fontSize: 10,
        color: colors.qualityUHD,
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

    // Title
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

    // Skeleton
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

export default ContentCard;
