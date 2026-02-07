import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import FastImageComponent from '../../../../components/FastImageComponent';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import useEPG from '../../../../hooks/useEPG';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
    scale,
    scaleFont,
    useTheme,
    glowEffectsTV,
} from '../../../../theme';
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
    disableZoom?: boolean;
}

// =============================================================================
// TV CONTENT CARD COMPONENT
// =============================================================================

// Spring config for smooth, responsive focus
const SPRING_CONFIG = {
    damping: 15,
    stiffness: 200,
    mass: 0.5,
};

// Helper for time formatting
const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
};

const TVContentCard: React.FC<TVContentCardProps> = ({
    item,
    onPress,
    width = scale(200),
    height = scale(280),
    disableZoom = false,
}) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    // Reanimated shared value for 60fps UI-thread animations
    const scaleValue = useSharedValue(1);

    // Visual differentiation based on content type
    const variant: ContentVariant = item.type || 'movie';
    const isLive = variant === 'live';
    const imageUri = item.image || FALLBACK_POSTER;

    // EPG Hook (skip if channel has no EPG mapping)
    const epgChannelId = isLive ? item.data?.epg_channel_id : null;
    const hasEpg = isLive && typeof epgChannelId === 'string' ? epgChannelId.trim().length > 0 : !!epgChannelId;
    const { currentProgram, progress, loading: epgLoading } = useEPG(hasEpg ? item.id : undefined, isFocused);

    useEffect(() => {
        if (isFocused) {
            prefetchImage(imageUri);
        }
    }, [imageUri, isFocused]);

    // Animated style - runs on UI thread for 60fps
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: disableZoom ? 1 : scaleValue.value }],
    }));

    const handleFocus = () => {
        // Start animation immediately on UI thread if zoom is NOT disabled
        if (!disableZoom) {
            scaleValue.value = withSpring(1.05, SPRING_CONFIG);
        }
        // Defer state update to prevent render stutter
        setIsFocused(true);
    };

    const handleBlur = () => {
        // Start animation immediately on UI thread
        if (!disableZoom) {
            scaleValue.value = withSpring(1, SPRING_CONFIG);
        }
        // Defer state update
        setIsFocused(false);
    };

    // Badge logic
    const getBadge = () => {
        if (isLive) {
            return { text: 'LIVE', color: theme.colors.live, isLive: true };
        }
        if (item.quality) {
            return { text: item.quality, color: theme.colors.primary, isLive: false };
        }
        return null;
    };

    const badge = getBadge();
    const finalHeight = isLive ? width : height;

    return (
        <Pressable
            onPress={() => onPress(item)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
                styles.container,
                { width, height: finalHeight }
            ]}
        >
            <Animated.View
                style={[
                    animatedStyle,
                    {
                        width,
                        height: finalHeight,
                    },
                    isFocused ? styles.focusedBorder : styles.unfocusedBorder,
                    isLive ? styles.roundedLive : styles.roundedPrimary,
                    isFocused ? (isLive ? styles.focusedLive : styles.focusedPrimary) : styles.unfocused,
                    isLive ? styles.bgWhite : styles.bgSecondary,
                    isFocused && !disableZoom && {
                        // Use accent glow for VOD cards to avoid red focus halo
                        shadowColor: isLive ? theme.colors.live : theme.colors.accent,
                        ...glowEffectsTV.focus,
                    }
                ]}
            >
                <FastImageComponent
                    source={{ uri: imageUri }}
                    style={[
                        styles.image,
                        { borderRadius: isLive ? scale(12) : scale(8) }
                    ]}
                    resizeMode={isLive ? "contain" : "cover"}
                />

                {/* Live Card Overlay */}
                {isLive && isFocused && (
                    <View style={StyleSheet.absoluteFill}>
                        <Svg height="100%" width="100%">
                            <Defs>
                                <LinearGradient id="gradCard" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                                    <Stop offset="0.7" stopColor="#000000" stopOpacity="0.2" />
                                    <Stop offset="1" stopColor="#000000" stopOpacity="0.9" />
                                </LinearGradient>
                            </Defs>
                            <Rect width="100%" height="100%" fill="url(#gradCard)" />
                        </Svg>

                        {hasEpg && (
                            <View style={styles.epgOverlay}>
                                <Text style={styles.channelName} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                {epgLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" style={{ marginVertical: scale(4) }} />
                                ) : currentProgram ? (
                                    <>
                                        <Text style={styles.epgTitle} numberOfLines={1}>
                                            {currentProgram.title}
                                        </Text>
                                        <View style={styles.progressBarContainer}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    { width: `${progress}%`, backgroundColor: theme.colors.live }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.epgTime}>
                                            {formatTime(currentProgram.start_timestamp)} - {formatTime(currentProgram.stop_timestamp)}
                                        </Text>
                                    </>
                                ) : null}
                            </View>
                        )}
                    </View>
                )}

                {/* Badge Overlay */}
                {badge && (
                    <View style={[
                        styles.badge,
                        badge.isLive && styles.liveBadge,
                        badge.isLive ? { backgroundColor: badge.color } : styles.bgTransparent
                    ]}>
                        {badge.isLive && <View style={styles.liveDot} />}
                        <Text style={[
                            styles.badgeText,
                            styles.textWhite
                        ]}>
                            {badge.text}
                        </Text>
                    </View>
                )}

                {/* Rating overlay */}
                {!isLive && item.rating && (
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>
                            ⭐ {(!isNaN(Number(item.rating)) ? Number(item.rating).toFixed(1) : '0.0')}
                        </Text>
                    </View>
                )}
            </Animated.View>

        </Pressable >
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        marginRight: scale(24),
        justifyContent: 'flex-start',
        alignItems: 'center',
        position: 'relative',
    },
    focusAura: {
        position: 'absolute',
        top: -scale(20),
        left: -scale(20),
        opacity: 0.2,
        zIndex: -1,
    },
    imageContainer: {
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    badge: {
        position: 'absolute',
        top: scale(10),
        right: scale(10),
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(4),
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    liveBadge: {
        borderRadius: scale(6),
        borderColor: 'transparent',
    },
    liveDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        backgroundColor: '#FFF',
        marginRight: scale(6),
    },
    badgeText: {
        fontSize: scaleFont(12),
        fontWeight: '900',
        letterSpacing: 1,
    },
    ratingBadge: {
        position: 'absolute',
        bottom: scale(10),
        left: scale(10),
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(4),
    },
    ratingText: {
        fontSize: scaleFont(12),
        color: '#FFD700',
        fontWeight: '900',
    },
    metaContainer: {
        marginTop: scale(16),
        width: '100%',
        alignItems: 'center',
    },
    title: {
        fontSize: scaleFont(16),
        color: '#8E9AAF',
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    // EPG Styles
    epgOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: scale(10),
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)', // Subtle background for text readability
    },
    channelName: {
        color: '#FFF',
        fontSize: scaleFont(14),
        fontWeight: '900',
        textTransform: 'uppercase',
        marginBottom: scale(2),
        letterSpacing: 0.5,
    },
    epgTitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: scaleFont(12),
        fontWeight: '600',
        marginBottom: scale(4),
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    epgTime: {
        color: '#AAA',
        fontSize: scaleFont(10),
        marginTop: scale(4),
        fontWeight: '500',
    },
    noInfoContainer: {
        opacity: 0.7,
    },
    progressBarContainer: {
        height: scale(4),
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: scale(2),
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: scale(2),
    },
    focusedLive: {
        borderColor: '#E50914', // Fallback will be overridden by theme.colors.live in inline style if needed, but best to use style hook or logic
    },
    focusedPrimary: {
        borderColor: '#00E5FF',
    },
    unfocused: {
        borderColor: 'rgba(255,255,255,0.05)',
    },
    bgWhite: {
        backgroundColor: '#FFF',
    },
    bgSecondary: {
        backgroundColor: '#222', // Fallback for theme.colors.backgroundSecondary
    },
    textWhite: {
        color: '#FFF',
    },
    focusedBorder: {
        borderWidth: scale(3),
    },
    unfocusedBorder: {
        borderWidth: 1,
    },
    roundedLive: {
        borderRadius: scale(12),
    },
    roundedPrimary: {
        borderRadius: scale(8),
    },
    bgTransparent: {
        backgroundColor: 'rgba(0,0,0,0.85)',
    }
});

export default React.memo(TVContentCard);
