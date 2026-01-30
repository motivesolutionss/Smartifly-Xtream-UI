/**
 * Smartifly FavoriteCard Component
 * 
 * Card for displaying favorite items:
 * - Poster image
 * - Remove button
 * - Long press menu
 * - Type badge
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    ViewStyle,
    Modal,
} from 'react-native';

import { FavoriteItem, FavoriteType, useFavoritesStore } from '../store/favoritesStore';

import { colors, spacing, borderRadius } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GOLD = '#FFD700';

// =============================================================================
// TYPES
// =============================================================================

export interface FavoriteCardProps {
    item: FavoriteItem;
    onPress?: () => void;
    onRemove?: () => void;
    columns?: number;
    showRemoveButton?: boolean;
    style?: ViewStyle;
}

// =============================================================================
// TYPE BADGE CONFIG
// =============================================================================

const TYPE_CONFIG: Record<FavoriteType, { label: string; color: string; icon: string }> = {
    live: { label: 'LIVE', color: colors.live, icon: '📺' },
    movie: { label: 'MOVIE', color: colors.movies, icon: '🎬' },
    series: { label: 'SERIES', color: colors.series, icon: '📀' },
};

// =============================================================================
// FAVORITE CARD COMPONENT
// =============================================================================

const FavoriteCard: React.FC<FavoriteCardProps> = ({
    item,
    onPress,
    onRemove,
    columns = 3,
    showRemoveButton = true,
    style,
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const removeFavorite = useFavoritesStore(state => state.removeFavorite);

    // Calculate dimensions
    const itemWidth = (SCREEN_WIDTH - spacing.base * 2 - spacing.sm * (columns - 1)) / columns;
    const isLive = item.type === 'live';
    const itemHeight = isLive ? itemWidth : itemWidth * 1.5;

    // Type config
    const typeConfig = TYPE_CONFIG[item.type];

    // Get initials for fallback
    const getInitials = () => item.name.substring(0, 2).toUpperCase();

    // Press animation
    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            tension: 300,
            friction: 20,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 300,
            friction: 20,
            useNativeDriver: true,
        }).start();
    };

    // Long press menu
    const handleLongPress = () => {
        setShowMenu(true);
    };

    // Handle remove
    const handleRemove = async () => {
        setShowMenu(false);
        await removeFavorite(item.id, item.type);
        onRemove?.();
    };

    return (
        <>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onLongPress={handleLongPress}
                activeOpacity={1}
                delayLongPress={500}
                style={[{ width: itemWidth }, style]}
            >
                <Animated.View style={[
                    styles.container,
                    { transform: [{ scale: scaleAnim }] },
                ]}>
                    {/* Image Container */}
                    <View style={[styles.imageContainer, { height: itemHeight }]}>
                        {/* Fallback */}
                        {(!imageLoaded || imageError || !item.image) && (
                            <View style={[styles.imageFallback, { height: itemHeight }]}>
                                {imageError || !item.image ? (
                                    <Text style={styles.imageInitials}>{getInitials()}</Text>
                                ) : (
                                    <View style={styles.shimmer} />
                                )}
                            </View>
                        )}

                        {/* Actual Image */}
                        {item.image && !imageError && (
                            <Image
                                source={{ uri: item.image }}
                                style={[
                                    styles.image,
                                    { height: itemHeight },
                                    !imageLoaded && styles.imageHidden,
                                ]}
                                resizeMode="cover"
                                onLoad={() => setImageLoaded(true)}
                                onError={() => setImageError(true)}
                            />
                        )}

                        {/* Type Badge */}
                        <View style={[styles.typeBadge, { backgroundColor: typeConfig.color }]}>
                            <Text style={styles.typeBadgeText}>{typeConfig.label}</Text>
                        </View>

                        {/* Remove Button */}
                        {showRemoveButton && (
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={handleRemove}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={styles.removeIcon}>❤️</Text>
                            </TouchableOpacity>
                        )}

                        {/* Rating Badge (for movies/series) */}
                        {item.rating !== undefined && item.rating > 0 && !isLive && (
                            <View style={styles.ratingBadge}>
                                <Text style={styles.ratingText}>★ {item.rating.toFixed(1)}</Text>
                            </View>
                        )}
                    </View>

                    {/* Title */}
                    <Text style={styles.title} numberOfLines={2}>{item.name}</Text>

                    {/* Meta */}
                    {(item.year || item.seasonCount) && (
                        <Text style={styles.meta} numberOfLines={1}>
                            {item.year}
                            {item.seasonCount && ` • ${item.seasonCount}S`}
                        </Text>
                    )}
                </Animated.View>
            </TouchableOpacity>

            {/* Long Press Menu */}
            <Modal
                visible={showMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={styles.menuContainer}>
                        <View style={styles.menuHeader}>
                            <Text style={styles.menuIcon}>{typeConfig.icon}</Text>
                            <Text style={styles.menuTitle} numberOfLines={2}>{item.name}</Text>
                        </View>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
                            <Text style={styles.menuItemIcon}>▶</Text>
                            <Text style={styles.menuItemText}>
                                {item.type === 'series' ? 'View Details' : 'Play Now'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleRemove}>
                            <Text style={styles.menuItemIcon}>💔</Text>
                            <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                                Remove from Favorites
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuItem, styles.menuItemCancel]}
                            onPress={() => setShowMenu(false)}
                        >
                            <Text style={styles.menuItemTextCancel}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

// =============================================================================
// SKELETON
// =============================================================================

export interface FavoriteCardSkeletonProps {
    columns?: number;
    isLive?: boolean;
    style?: ViewStyle;
}

export const FavoriteCardSkeleton: React.FC<FavoriteCardSkeletonProps> = ({
    columns = 3,
    isLive = false,
    style,
}) => {
    const itemWidth = (SCREEN_WIDTH - spacing.base * 2 - spacing.sm * (columns - 1)) / columns;
    const itemHeight = isLive ? itemWidth : itemWidth * 1.5;

    return (
        <View style={[{ width: itemWidth }, style]}>
            <View style={[styles.skeletonImage, { height: itemHeight }]} />
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonMeta} />
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    imageContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.backgroundTertiary,
        position: 'relative',
    },
    image: {
        width: '100%',
        borderRadius: borderRadius.lg,
    },
    imageHidden: {
        position: 'absolute',
        opacity: 0,
    },
    imageFallback: {
        width: '100%',
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.lg,
    },
    imageInitials: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textMuted,
    },
    shimmer: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.skeleton,
    },
    typeBadge: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        paddingHorizontal: spacing.xs,
        paddingVertical: 3,
        borderRadius: borderRadius.sm,
    },
    typeBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    removeButton: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeIcon: {
        fontSize: 14,
    },
    ratingBadge: {
        position: 'absolute',
        bottom: spacing.xs,
        right: spacing.xs,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: spacing.xxs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: '600',
        color: GOLD,
    },
    title: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textPrimary,
        marginTop: spacing.xs,
        lineHeight: 15,
    },
    meta: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },

    // Menu
    menuOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.base,
    },
    menuContainer: {
        width: '90%',
        maxWidth: 320,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.base,
        gap: spacing.md,
    },
    menuIcon: {
        fontSize: 24,
    },
    menuTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    menuDivider: {
        height: 1,
        backgroundColor: colors.backgroundTertiary,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.base,
        gap: spacing.md,
    },
    menuItemIcon: {
        fontSize: 18,
    },
    menuItemText: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    menuItemTextDanger: {
        color: colors.primary,
    },
    menuItemCancel: {
        borderTopWidth: 1,
        borderTopColor: colors.backgroundTertiary,
        justifyContent: 'center',
    },
    menuItemTextCancel: {
        fontSize: 15,
        color: colors.textMuted,
        fontWeight: '500',
        textAlign: 'center',
        flex: 1,
    },

    // Skeleton
    skeletonImage: {
        backgroundColor: colors.skeleton,
        borderRadius: borderRadius.lg,
    },
    skeletonTitle: {
        height: 12,
        width: '80%',
        backgroundColor: colors.skeleton,
        borderRadius: borderRadius.sm,
        marginTop: spacing.xs,
    },
    skeletonMeta: {
        height: 10,
        width: '50%',
        backgroundColor: colors.skeleton,
        borderRadius: borderRadius.sm,
        marginTop: spacing.xxs,
    },
});

export default FavoriteCard;