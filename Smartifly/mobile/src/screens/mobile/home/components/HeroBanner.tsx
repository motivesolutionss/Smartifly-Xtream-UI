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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    ViewStyle,
    Animated,
} from 'react-native';
// Note: LinearGradient would require import from 'react-native-linear-gradient'
// Using fallback gradient view for now

import { colors, spacing, borderRadius, Icon } from '../../../../theme';


const HERO_HEIGHT = 480;
const HERO_FADE_DURATION = 360;
const HERO_CONTENT_FADE = 180;
const HERO_PLACEHOLDER = 'https://via.placeholder.com/400x225/0B1220/333333?text=No+Image';

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
    const [displayItem, setDisplayItem] = useState<HeroBannerItem | null>(item ?? null);
    const [incomingItem, setIncomingItem] = useState<HeroBannerItem | null>(null);
    const currentKeyRef = useRef('');
    const incomingKeyRef = useRef('');
    const incomingItemRef = useRef<HeroBannerItem | null>(null);
    const isTransitioningRef = useRef(false);

    const baseOpacity = useRef(new Animated.Value(1)).current;
    const incomingOpacity = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const isReady = Boolean(item) && !isLoading;
    const itemKey = item ? `${item.id}-${item.image ?? ''}` : '';
    const baseItem = displayItem ?? item ?? null;

    useEffect(() => {
        if (!item) return;

        if (!currentKeyRef.current) {
            currentKeyRef.current = itemKey;
            setDisplayItem(item);
            return;
        }

        if (itemKey === currentKeyRef.current) {
            setDisplayItem(item);
            return;
        }

        incomingKeyRef.current = itemKey;
        incomingItemRef.current = item;
        setIncomingItem(item);
    }, [item, itemKey]);

    const getImageUri = useCallback((hero: HeroBannerItem | null) => {
        if (!hero) return HERO_PLACEHOLDER;
        return hero.image || HERO_PLACEHOLDER;
    }, []);

    const handleIncomingResolve = useCallback(() => {
        const nextItem = incomingItemRef.current;
        if (!nextItem) return;
        if (isTransitioningRef.current) return;

        isTransitioningRef.current = true;

        Animated.parallel([
            Animated.timing(baseOpacity, {
                toValue: 0,
                duration: HERO_FADE_DURATION,
                useNativeDriver: true,
            }),
            Animated.timing(incomingOpacity, {
                toValue: 1,
                duration: HERO_FADE_DURATION,
                useNativeDriver: true,
            }),
            Animated.timing(contentOpacity, {
                toValue: 0,
                duration: HERO_CONTENT_FADE,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                setDisplayItem(nextItem);
                currentKeyRef.current = incomingKeyRef.current;
            }
            setIncomingItem(null);
            incomingItemRef.current = null;
            incomingKeyRef.current = '';
            baseOpacity.setValue(1);
            incomingOpacity.setValue(0);
            isTransitioningRef.current = false;
            contentOpacity.setValue(0);
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: HERO_CONTENT_FADE,
                useNativeDriver: true,
            }).start();
        });
    }, [baseOpacity, incomingOpacity, contentOpacity]);

    const handleIncomingError = useCallback(() => {
        handleIncomingResolve();
    }, [handleIncomingResolve]);

    // Get type-specific color
    const getTypeColor = (type: HeroBannerItem['type']) => {
        switch (type) {
            case 'live': return colors.live;
            case 'movie': return colors.movies;
            case 'series': return colors.series;
            default: return colors.primary;
        }
    };

    // Get type label
    const getTypeLabel = (type: HeroBannerItem['type']) => {
        switch (type) {
            case 'live': return 'LIVE NOW';
            case 'movie': return 'FEATURED MOVIE';
            case 'series': return 'FEATURED SERIES';
            default: return 'FEATURED';
        }
    };

    if (!isReady) {
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

    const contentItem = baseItem as HeroBannerItem;

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={onPress}
            activeOpacity={0.95}
        >
            <View style={styles.backgroundContainer}>
                <Animated.View style={[styles.backgroundLayer, { opacity: baseOpacity }]}>
                    <ImageBackground
                        source={{ uri: getImageUri(contentItem) }}
                        style={styles.background}
                        resizeMode="cover"
                    />
                </Animated.View>

                {incomingItem ? (
                    <Animated.View style={[styles.backgroundLayer, { opacity: incomingOpacity }]}>
                        <ImageBackground
                            source={{ uri: getImageUri(incomingItem) }}
                            style={styles.background}
                            resizeMode="cover"
                            onLoad={handleIncomingResolve}
                            onError={handleIncomingError}
                        />
                    </Animated.View>
                ) : null}
            </View>

            <View style={styles.overlayContainer}>
                <GradientOverlay>
                    <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
                        {/* Top Badges */}
                        <View style={styles.badgesRow}>
                            {/* Type Badge */}
                            <View style={[styles.typeBadge, { backgroundColor: getTypeColor(contentItem.type) }]}>
                                {contentItem.type === 'live' && <View style={styles.liveDot} />}
                                <Text style={styles.typeBadgeText}>{getTypeLabel(contentItem.type)}</Text>
                            </View>

                            {/* Quality Badge */}
                            {contentItem.quality && (
                                <View style={styles.qualityBadge}>
                                    <Text style={styles.qualityText}>{contentItem.quality}</Text>
                                </View>
                            )}

                            {/* New Badge */}
                            {contentItem.isNew && (
                                <View style={styles.newBadge}>
                                    <Text style={styles.newText}>NEW</Text>
                                </View>
                            )}
                        </View>

                        {/* Title */}
                        <Text style={styles.title} numberOfLines={2}>
                            {contentItem.name}
                        </Text>

                        {/* Metadata Row */}
                        <View style={styles.metaRow}>
                            {typeof contentItem.rating === 'number' && contentItem.rating > 0 && (
                                <View style={styles.ratingContainer}>
                                    <Icon name="star" size={13} color={colors.qualityUHD} />
                                    <Text style={styles.ratingText}>{contentItem.rating.toFixed(1)}</Text>
                                </View>
                            )}
                            {contentItem.year ? (
                                <Text style={styles.metaText}>{String(contentItem.year)}</Text>
                            ) : null}
                            {contentItem.genre ? (
                                <Text style={styles.metaText}>{String(contentItem.genre)}</Text>
                            ) : null}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.playButton}
                                onPress={onPlayPress}
                                activeOpacity={0.8}
                            >
                                <Icon name="arrowRight" size={13} color={colors.textInverse} />
                                <Text style={styles.playText}>Play Now</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.infoButton}
                                onPress={onInfoPress}
                                activeOpacity={0.7}
                            >
                                <Icon name="info" size={14} color={colors.textPrimary} />
                                <Text style={styles.infoText}>Info</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </GradientOverlay>
            </View>
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
        borderWidth: 1,
        borderColor: colors.border,
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    gradientFallback: {
        flex: 1,
        backgroundColor: 'rgba(6, 10, 18, 0.68)',
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
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
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
        backgroundColor: 'rgba(8, 12, 18, 0.72)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
    },
    qualityText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textPrimary,
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
    playText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textInverse,
    },
    infoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(9, 14, 22, 0.58)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)',
    },
    infoText: {
        fontSize: 14,
        fontWeight: '700',
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
