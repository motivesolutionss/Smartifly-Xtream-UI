/**
 * Smartifly Hero Banner Component
 * 
 * Featured content banner with:
 * - Full-width background image
 * - Gradient overlay
 * - Title and metadata
 * - Play button
 * - Optional badges (NEW, HD, etc.)
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    ViewStyle,
} from 'react-native';
// Note: LinearGradient would require import from 'react-native-linear-gradient'
// Using fallback gradient view for now

import { colors, spacing, borderRadius } from '../../../../theme';


const HERO_HEIGHT = 480;

// =============================================================================
// TYPES
// =============================================================================

export interface HeroBannerItem {
    id: string | number;
    name: string;
    image?: string;
    type: 'live' | 'movie' | 'series';
    rating?: number;
    year?: string;
    genre?: string;
    isNew?: boolean;
    quality?: 'HD' | '4K' | 'SD';
}

export interface HeroBannerProps {
    item: HeroBannerItem | null;
    onPress?: () => void;
    onPlayPress?: () => void;
    onInfoPress?: () => void;
    style?: ViewStyle;
    isLoading?: boolean;
}

// =============================================================================
// GRADIENT OVERLAY COMPONENT (Fallback if LinearGradient not available)
// =============================================================================

interface GradientOverlayProps {
    children: React.ReactNode;
}

const GradientOverlay: React.FC<GradientOverlayProps> = ({ children }) => {
    // If you have react-native-linear-gradient installed, use:
    // return (
    //   <LinearGradient
    //     colors={['transparent', 'rgba(11, 18, 32, 0.6)', 'rgba(11, 18, 32, 0.95)']}
    //     locations={[0, 0.5, 1]}
    //     style={styles.gradient}
    //   >
    //     {children}
    //   </LinearGradient>
    // );

    // Fallback using View with backgroundColor
    return (
        <View style={styles.gradientFallback}>
            {children}
        </View>
    );
};

// =============================================================================
// COMPONENT
// =============================================================================

const HeroBanner: React.FC<HeroBannerProps> = ({
    item,
    onPress,
    onPlayPress,
    onInfoPress,
    style,
    isLoading = false,
}) => {
    // Loading state
    if (isLoading || !item) {
        return (
            <View style={[styles.container, styles.loadingContainer, style]}>
                <View style={styles.loadingContent}>
                    <View style={styles.loadingTitle} />
                    <View style={styles.loadingMeta} />
                    <View style={styles.loadingButton} />
                </View>
            </View>
        );
    }

    // Get type-specific color
    const getTypeColor = () => {
        switch (item.type) {
            case 'live': return colors.live;
            case 'movie': return colors.movies;
            case 'series': return colors.series;
            default: return colors.primary;
        }
    };

    // Get type label
    const getTypeLabel = () => {
        switch (item.type) {
            case 'live': return 'LIVE NOW';
            case 'movie': return 'FEATURED MOVIE';
            case 'series': return 'FEATURED SERIES';
            default: return 'FEATURED';
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={onPress}
            activeOpacity={0.95}
        >
            <ImageBackground
                source={{
                    uri: item.image || 'https://via.placeholder.com/400x225/0B1220/333333?text=No+Image'
                }}
                style={styles.background}
                resizeMode="cover"
            >
                <GradientOverlay>
                    <View style={styles.content}>
                        {/* Top Badges */}
                        <View style={styles.badgesRow}>
                            {/* Type Badge */}
                            <View style={[styles.typeBadge, { backgroundColor: getTypeColor() }]}>
                                {item.type === 'live' && <View style={styles.liveDot} />}
                                <Text style={styles.typeBadgeText}>{getTypeLabel()}</Text>
                            </View>

                            {/* Quality Badge */}
                            {item.quality && (
                                <View style={styles.qualityBadge}>
                                    <Text style={styles.qualityText}>{item.quality}</Text>
                                </View>
                            )}

                            {/* New Badge */}
                            {item.isNew && (
                                <View style={styles.newBadge}>
                                    <Text style={styles.newText}>NEW</Text>
                                </View>
                            )}
                        </View>

                        {/* Title */}
                        <Text style={styles.title} numberOfLines={2}>
                            {item.name}
                        </Text>

                        {/* Metadata Row */}
                        <View style={styles.metaRow}>
                            {typeof item.rating === 'number' && item.rating > 0 && (
                                <View style={styles.ratingContainer}>
                                    <Text style={styles.ratingStar}>★</Text>
                                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                                </View>
                            )}
                            {item.year ? (
                                <Text style={styles.metaText}>{String(item.year)}</Text>
                            ) : null}
                            {item.genre ? (
                                <Text style={styles.metaText}>{String(item.genre)}</Text>
                            ) : null}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.playButton}
                                onPress={onPlayPress}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.playIcon}>▶</Text>
                                <Text style={styles.playText}>Play Now</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.infoButton}
                                onPress={onInfoPress}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.infoIcon}>ⓘ</Text>
                                <Text style={styles.infoText}>Info</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </GradientOverlay>
            </ImageBackground>
        </TouchableOpacity>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        height: HERO_HEIGHT,
        marginHorizontal: spacing.base,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        backgroundColor: colors.backgroundSecondary,
    },
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gradientFallback: {
        flex: 1,
        backgroundColor: 'rgba(11, 18, 32, 0.65)',
        justifyContent: 'flex-end',
        padding: spacing.base,
    },
    gradient: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: spacing.base,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-end',
    },

    // Badges
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.textPrimary,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 1,
    },
    qualityBadge: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    qualityText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.background,
        letterSpacing: 0.5,
    },
    newBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    newText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },

    // Title
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },

    // Metadata
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xxs,
    },
    ratingStar: {
        fontSize: 14,
        color: colors.qualityUHD,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    metaText: {
        fontSize: 13,
        color: colors.textSecondary,
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.textPrimary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    playIcon: {
        fontSize: 12,
        color: colors.background,
    },
    playText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.background,
    },
    infoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    infoIcon: {
        fontSize: 14,
        color: colors.textPrimary,
    },
    infoText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },

    // Loading State
    loadingContainer: {
        backgroundColor: colors.backgroundSecondary,
        justifyContent: 'flex-end',
        padding: spacing.base,
    },
    loadingContent: {
        gap: spacing.sm,
    },
    loadingTitle: {
        width: '70%',
        height: 28,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.md,
    },
    loadingMeta: {
        width: '50%',
        height: 16,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.md,
    },
    loadingButton: {
        width: 120,
        height: 40,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
    },
});

export default HeroBanner;