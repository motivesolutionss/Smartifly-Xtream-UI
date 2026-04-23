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
    StyleProp,
} from 'react-native';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import FastImageComponent from '../../../../components/FastImageComponent';
import type { ImageStyle as FastImageImageStyle } from '@d11/react-native-fast-image';
import { colors, spacing, borderRadius, Icon } from '../../../../theme';
import { usePerfProfile } from '../../../../utils/perf';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<FastImageImageStyle>;
    sizeOverride?: {
        width: number;
        height?: number;
    };
}

const cardSizes = {
    poster: { width: 110, height: 165 },
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
    sizeOverride,
}) => {
    const perf = usePerfProfile();
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const size = variant === 'channel'
        ? cardSizes.channel
        : variant === 'thumbnail'
            ? cardSizes.thumbnail
            : cardSizes.poster;
    const resolvedWidth = sizeOverride?.width ?? size.width;
    const resolvedHeight = sizeOverride?.height ?? size.height;

    const placeholderText = useMemo(() => {
        if (!item.name) return 'NA';
        return item.name.slice(0, 2).toUpperCase();
    }, [item.name]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const onPressIn = () => {
        scale.value = withSpring(0.96, { damping: 10, stiffness: 200 });
        opacity.value = withTiming(0.9, { duration: 100 });
    };

    const onPressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 100 });
    };

    const shadowStyle = perf.enableFocusGlow ? styles.imageShadow : styles.imageShadowOff;
    const imageResizeMode = variant === 'channel' ? 'contain' : 'cover';

    return (
        <AnimatedTouchableOpacity
            style={[styles.container, { width: resolvedWidth }, style, animatedStyle]}
            onPress={() => onPress?.(item)}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
        >
            <View
                style={[
                    styles.imageContainer,
                    shadowStyle,
                    { width: resolvedWidth, height: resolvedHeight },
                    variant === 'channel' && styles.channelContainer,
                ]}
            >
                {item.image ? (
                    <FastImageComponent
                        source={{ uri: item.image }}
                        style={[styles.fastImage, { width: resolvedWidth, height: resolvedHeight }, imageStyle]}
                        resizeMode={imageResizeMode}
                    />
                ) : (
                    <View style={[styles.placeholder, { width: resolvedWidth, height: resolvedHeight }]}>
                        <Text style={styles.placeholderText}>{placeholderText}</Text>
                    </View>
                )}

                {/* Better Gradient Overlay */}
                <View style={[styles.gradientOverlay, variant === 'channel' && styles.gradientOverlayChannel]} />

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

                {/* Progress Bar Enhancement */}
                {typeof item.progress === 'number' && item.progress > 0 && item.type !== 'live' && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${Math.min(item.progress, 100)}%` }]} />
                    </View>
                )}
            </View>

            {showTitle && (
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.metadataView}>
                        {!!item.year && <Text style={styles.metadataText}>{item.year}</Text>}
                        {!!item.year && (item.episodeCount ?? 0) > 0 && <View style={styles.metaDivider} />}
                        {(item.episodeCount ?? 0) > 0 && item.type === 'series' && (
                            <Text style={styles.metadataText}>{item.episodeCount} EP</Text>
                        )}
                    </View>
                </View>
            )}
        </AnimatedTouchableOpacity>
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
    prev.imageStyle === next.imageStyle &&
    prev.sizeOverride?.width === next.sizeOverride?.width &&
    prev.sizeOverride?.height === next.sizeOverride?.height
);

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    imageContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.backgroundTertiary,
        position: 'relative',
        borderWidth: 1,
        borderColor: colors.border,
    },
    imageShadow: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    imageShadowOff: {
        elevation: 0,
        shadowOpacity: 0,
        shadowRadius: 0,
    },
    channelContainer: {
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundSecondary,
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.15)', // Subtle overall dim
    },
    gradientOverlayChannel: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
    liveBadge: {
        position: 'absolute',
        top: spacing.xs + 1,
        left: spacing.xs + 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.live,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 2,
    },
    liveDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: colors.textPrimary,
    },
    liveBadgeText: {
        fontSize: 10.5,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: 0.4,
    },
    qualityBadge: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    qualityBadge4K: {
        backgroundColor: colors.qualityUHD,
        borderColor: 'transparent',
    },
    qualityText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    newBadge: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        backgroundColor: colors.success,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    newBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    ratingBadge: {
        position: 'absolute',
        bottom: spacing.xs,
        right: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(6, 10, 16, 0.74)',
        paddingHorizontal: 5,
        paddingVertical: 2.5,
        borderRadius: 4,
        gap: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    ratingText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    progressContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    titleContainer: {
        marginTop: 6,
        paddingHorizontal: 2,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    metadataView: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metadataText: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: '500',
    },
    metaDivider: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textMuted,
        marginHorizontal: 4,
        opacity: 0.5,
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
