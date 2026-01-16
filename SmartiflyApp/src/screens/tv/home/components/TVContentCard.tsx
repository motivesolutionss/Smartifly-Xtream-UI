/**
 * TV Content Card Component
 * 
 * Netflix-style content card with type-aware visual differentiation.
 * - Live: Rounded corners + LIVE badge
 * - Movie: Poster ratio + HD badge
 * - Series: Poster ratio + subtle styling
 * 
 * @enterprise-grade
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Pressable,
    Animated,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, scale, scaleFont } from '../../../../theme';
import { FALLBACK_POSTER } from '../HomeRailConfig';
import { prefetchImage } from '../../../../utils/image';

// =============================================================================
// TYPES
// =============================================================================

export type ContentVariant = 'live' | 'movie' | 'series';

export interface TVContentItem {
    id: string | number;
    title: string;
    image: string; // Poster URL
    rating?: number;
    year?: string;
    quality?: string; // HD, FHD, 4K
    type?: ContentVariant;
    data?: any;
}

interface TVContentCardProps {
    item: TVContentItem;
    onPress: (item: TVContentItem) => void;
    width?: number;
    height?: number;
}

// =============================================================================
// TV CONTENT CARD COMPONENT
// =============================================================================

const TVContentCard: React.FC<TVContentCardProps> = ({
    item,
    onPress,
    width = scale(200),
    height = scale(280), // Increased dimensions for lower density (Netflix style)
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [scaleAnim] = useState(new Animated.Value(1));

    // Visual differentiation based on content type
    const variant: ContentVariant = item.type || 'movie';
    const isLive = variant === 'live';
    const imageUri = item.image || FALLBACK_POSTER;

    useEffect(() => {
        prefetchImage(imageUri);
    }, [imageUri]);

    const handleFocus = () => {
        setIsFocused(true);
        // User requested no animation (fixed cards)
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    // Badge logic
    const getBadge = () => {
        if (isLive) {
            return { text: 'LIVE', color: colors.live || '#E50914', isLive: true };
        }
        if (item.quality) {
            return { text: item.quality, color: colors.accent || '#00E5FF', isLive: false };
        }
        return null;
    };

    const badge = getBadge();

    // Live cards should be square-ish to accommodate channel logos properly
    const finalHeight = isLive ? width : height;

    return (
        <Pressable
            onPress={() => onPress(item)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
                styles.container,
                { width, height: finalHeight + scale(40) }
            ]}
        >
            <Animated.View
                style={[
                    styles.imageContainer,
                    {
                        width,
                        height: finalHeight,
                        transform: [{ scale: scaleAnim }],
                        borderColor: isFocused
                            ? (isLive ? colors.live || '#E50914' : colors.accent || '#00E5FF')
                            : 'transparent',
                        borderWidth: isFocused ? scale(3) : 0,
                        // Live cards get more rounded corners
                        borderRadius: isLive ? scale(12) : scale(8),
                        backgroundColor: isLive ? '#FFF' : (colors.backgroundSecondary || '#222'), // White background for logos
                    },
                    isFocused && styles.shadow
                ]}
            >
                <Image
                    source={{ uri: imageUri }}
                    style={[
                        styles.image,
                        { borderRadius: isLive ? scale(12) : scale(8) }
                    ]}
                    resizeMode={isLive ? "contain" : "cover"}
                />

                {/* Live Card Overlay - Gradient like Hero Banner */}
                {isLive && (
                    <View style={StyleSheet.absoluteFill}>
                        <Svg height="100%" width="100%">
                            <Defs>
                                <LinearGradient id="gradCard" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                                    <Stop offset="0.7" stopColor="#000000" stopOpacity="0.2" />
                                    <Stop offset="1" stopColor="#000000" stopOpacity="0.8" />
                                </LinearGradient>
                            </Defs>
                            <Rect width="100%" height="100%" fill="url(#gradCard)" />
                        </Svg>
                    </View>
                )}

                {/* Badge Overlay */}
                {badge && (
                    <View style={[
                        styles.badge,
                        badge.isLive && styles.liveBadge,
                        { backgroundColor: badge.isLive ? badge.color : 'rgba(0,0,0,0.8)' }
                    ]}>
                        {badge.isLive && <View style={styles.liveDot} />}
                        <Text style={[
                            styles.badgeText,
                            { color: badge.isLive ? '#FFF' : badge.color }
                        ]}>
                            {badge.text}
                        </Text>
                    </View>
                )}

                {/* Rating overlay for movies/series */}
                {!isLive && item.rating && (
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>
                            ⭐ {(!isNaN(Number(item.rating)) ? Number(item.rating).toFixed(1) : '0.0')}
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Title & Metadata - Only visible on focus */}
            <View style={[styles.metaContainer, { opacity: isFocused ? 1 : 0 }]}>
                <Text
                    style={[
                        styles.title,
                        isFocused && styles.titleFocused
                    ]}
                    numberOfLines={1}
                >
                    {item.title}
                </Text>
            </View>
        </Pressable>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        marginRight: scale(20),
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    imageContainer: {
        overflow: 'hidden',
        backgroundColor: colors.backgroundSecondary || '#222',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 10,
        zIndex: 10,
    },
    // Standard badge (quality)
    badge: {
        position: 'absolute',
        top: scale(6),
        right: scale(6),
        paddingHorizontal: scale(6),
        paddingVertical: scale(2),
        borderRadius: scale(4),
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Live badge specific
    liveBadge: {
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(6),
    },
    liveDot: {
        width: scale(6),
        height: scale(6),
        borderRadius: scale(3),
        backgroundColor: '#FFF',
        marginRight: scale(4),
    },
    badgeText: {
        fontSize: scaleFont(10),
        fontWeight: 'bold',
    },
    // Rating badge
    ratingBadge: {
        position: 'absolute',
        bottom: scale(6),
        left: scale(6),
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: scale(6),
        paddingVertical: scale(2),
        borderRadius: scale(4),
    },
    ratingText: {
        fontSize: scaleFont(10),
        color: '#FFD700',
        fontWeight: '600',
    },
    metaContainer: {
        marginTop: scale(12),
        width: '100%',
        alignItems: 'center',
    },
    title: {
        fontSize: scaleFont(14),
        color: colors.textSecondary || '#AAA',
        textAlign: 'center',
    },
    titleFocused: {
        color: colors.textPrimary || '#FFF',
        fontWeight: 'bold',
    },
});

export default TVContentCard;
