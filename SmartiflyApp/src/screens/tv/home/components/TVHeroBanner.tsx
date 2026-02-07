import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Pressable,
    Animated,
    findNodeHandle,
} from 'react-native';
import FastImageComponent from '../../../../components/FastImageComponent';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, scale, scaleFont } from '../../../../theme';
import { prefetchImage } from '../../../../utils/image';

// =============================================================================
// TYPES
// =============================================================================

export interface TVHeroItem {
    id: string | number;
    title: string;
    description?: string;
    backdrop: string; // URL
    logo?: string; // Optional logo image
    tags?: string[];
    rating?: number;
    year?: string;
    quality?: string;
    maturityRating?: string; // e.g., "TV-MA", "PG-13"
}

interface TVHeroBannerProps {
    item: TVHeroItem;
    onPlay: () => void;
    onInfo: () => void;
    onAddToList?: () => void;
    sidebarTargetRef?: React.RefObject<any>;
}

// =============================================================================
// TV HERO BANNER COMPONENT (Netflix Style)
// =============================================================================

const TVHeroBanner: React.FC<TVHeroBannerProps> = ({
    item,
    onPlay,
    onInfo,
    onAddToList,
    sidebarTargetRef,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    // Focus State
    const [focusedButton, setFocusedButton] = useState<'play' | 'info' | 'list' | null>(null);

    // Resolve sidebar target
    const sidebarNode = sidebarTargetRef && sidebarTargetRef.current ? findNodeHandle(sidebarTargetRef.current) : undefined;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, [item, fadeAnim, slideAnim]);

    useEffect(() => {
        prefetchImage(item.backdrop || (item as any).image);
        if (item.logo) {
            prefetchImage(item.logo);
        }
    }, [item, item.backdrop, item.logo]);



    return (
        <View style={styles.container}>
            {/* Background Image - Right-aligned 70% width */}
            <View style={styles.backdropContainer}>
                <FastImageComponent
                    source={{ uri: item.backdrop || (item as any).image }}
                    style={styles.backdropImage}
                    resizeMode="cover"
                    priority="high"
                />
                {/* Left Edge Fade - Inside backdrop container */}
                <View style={styles.backdropLeftFade}>
                    <Svg height="100%" width="100%">
                        <Defs>
                            <LinearGradient id="gradBackdropLeft" x1="0" y1="0" x2="1" y2="0">
                                <Stop offset="0" stopColor={colors.background || "#141414"} stopOpacity="1" />
                                <Stop offset="0.5" stopColor={colors.background || "#141414"} stopOpacity="0.5" />
                                <Stop offset="1" stopColor={colors.background || "#141414"} stopOpacity="0" />
                            </LinearGradient>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#gradBackdropLeft)" />
                    </Svg>
                </View>
            </View>

            {/* Left to Right Gradient - Full screen overlay */}
            <View style={styles.leftGradient}>
                <Svg height="100%" width="100%">
                    <Defs>
                        <LinearGradient id="gradLeft" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor={colors.background || "#141414"} stopOpacity="1" />
                            <Stop offset="0.4" stopColor={colors.background || "#141414"} stopOpacity="0.8" />
                            <Stop offset="0.7" stopColor={colors.background || "#141414"} stopOpacity="0.3" />
                            <Stop offset="1" stopColor={colors.background || "#141414"} stopOpacity="0" />
                        </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#gradLeft)" />
                </Svg>
            </View>

            {/* Bottom Gradient - Full screen overlay */}
            <View style={styles.bottomGradient}>
                <Svg height="100%" width="100%">
                    <Defs>
                        <LinearGradient id="gradBottom" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={colors.background || "#141414"} stopOpacity="0" />
                            <Stop offset="0.5" stopColor={colors.background || "#141414"} stopOpacity="0.3" />
                            <Stop offset="0.8" stopColor={colors.background || "#141414"} stopOpacity="0.8" />
                            <Stop offset="1" stopColor={colors.background || "#141414"} stopOpacity="1" />
                        </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#gradBottom)" />
                </Svg>
            </View>

            {/* App Logo - Moved to content container */}

            {/* Content Overlay */}
            <Animated.View
                style={[
                    styles.contentContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }
                ]}
            >
                {/* App Logo - Grouped with Title */}
                <Image
                    source={require('../../../../assets/smartifly_icon.png')}
                    style={styles.appLogo}
                    resizeMode="contain"
                />

                {/* Title */}
                <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                </Text>

                {/* Metadata Row */}
                <View style={styles.metadataRow}>
                    {/* Year */}
                    {item.year && (
                        <>
                            <Text style={styles.metadataText}>{item.year}</Text>
                            <View style={styles.metadataDot} />
                        </>
                    )}

                    {/* Rating Badge */}
                    {item.rating && (
                        <View style={styles.ratingBadge}>
                            <Text style={styles.ratingLabel}>IMDb</Text>
                            <Text style={styles.ratingValue}>{Number(item.rating).toFixed(1)}</Text>
                        </View>
                    )}
                </View>

                {/* Tags/Genres */}
                {item.tags && item.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                        {item.tags.slice(0, 3).map((tag, index) => (
                            <React.Fragment key={index}>
                                <Text style={styles.tagText}>{tag}</Text>
                                {index < Math.min(item.tags!.length, 3) - 1 && (
                                    <Text style={styles.tagSeparator}> • </Text>
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                )}

                {/* Description */}
                <Text style={styles.description} numberOfLines={3}>
                    {item.description || "No description available."}
                </Text>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                    {/* Play Button */}
                    <Pressable
                        onPress={onPlay}
                        onFocus={() => setFocusedButton('play')}
                        onBlur={() => setFocusedButton(null)}
                        // @ts-ignore
                        nextFocusLeft={sidebarNode} // Force jump to Sidebar Search
                        style={[
                            styles.button,
                            styles.playButton,
                            focusedButton === 'play' && styles.buttonFocused
                        ]}
                    >
                        <View style={styles.buttonContent}>
                            <View style={styles.playIcon}>
                                <Text style={[
                                    styles.playIconText,
                                    focusedButton === 'play' && styles.textBlack
                                ]}>▶</Text>
                            </View>
                            <Text style={[
                                styles.buttonText,
                                styles.playButtonText,
                                focusedButton === 'play' && styles.textBlack
                            ]}>
                                Play
                            </Text>
                        </View>
                    </Pressable>

                    {/* More Info Button */}
                    <Pressable
                        onPress={onInfo}
                        onFocus={() => setFocusedButton('info')}
                        onBlur={() => setFocusedButton(null)}
                        // @ts-ignore
                        nextFocusLeft={sidebarNode} // Force jump to Sidebar Search
                        style={[
                            styles.button,
                            styles.infoButton,
                            focusedButton === 'info' && styles.buttonFocusedSecondary
                        ]}
                    >
                        <View style={styles.buttonContent}>
                            <View style={styles.infoIcon}>
                                <Text style={styles.infoIconText}>i</Text>
                            </View>
                            <Text style={styles.buttonText}>
                                More Info
                            </Text>
                        </View>
                    </Pressable>

                    {/* Add to List Button (Optional) */}
                    {onAddToList && (
                        <Pressable
                            onPress={onAddToList}
                            onFocus={() => setFocusedButton('list')}
                            onBlur={() => setFocusedButton(null)}
                            style={[
                                styles.iconButton,
                                focusedButton === 'list' && styles.iconButtonFocused
                            ]}
                        >
                            <Text style={styles.iconButtonText}>+</Text>
                        </Pressable>
                    )}
                </View>
            </Animated.View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: scale(680),
        position: 'relative',
        marginBottom: scale(40),
    },
    backdropContainer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '70%',
        height: '100%',
    },
    backdropImage: {
        width: '100%',
        height: '100%',
    },
    backdropLeftFade: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '30%',
    },
    leftGradient: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '60%',
        zIndex: 1,
    },
    bottomGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '60%',
        zIndex: 1,
    },
    contentContainer: {
        position: 'absolute',
        left: scale(30),
        bottom: scale(80),
        maxWidth: scale(600),
        zIndex: 2,
        alignItems: 'flex-start', // Ensure children align to the left
    },
    title: {
        fontSize: scaleFont(64),
        fontWeight: '700',
        color: colors.textPrimary || '#FFF',
        marginBottom: scale(20),
        letterSpacing: -1,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 8,
    },
    logo: {
        width: scale(450),
        height: scale(120),
        marginBottom: scale(24),
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(12),
    },
    metadataText: {
        color: colors.textPrimary || '#FFF',
        fontSize: scaleFont(18),
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    metadataDot: {
        width: scale(4),
        height: scale(4),
        borderRadius: scale(2),
        backgroundColor: '#46D369',
        marginHorizontal: scale(8),
    },
    tagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(20),
        flexWrap: 'wrap',
    },
    tagText: {
        color: colors.textPrimary || '#FFF',
        fontSize: scaleFont(18),
        fontWeight: '500',
    },
    tagSeparator: {
        color: '#999',
        fontSize: scaleFont(18),
        marginHorizontal: scale(4),
    },
    description: {
        fontSize: scaleFont(20),
        color: colors.textSecondary || '#FFF',
        lineHeight: scaleFont(28),
        marginBottom: scale(32),
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    button: {
        flexDirection: 'row',
        paddingHorizontal: scale(32),
        paddingVertical: scale(14),
        borderRadius: scale(6),
        marginRight: scale(16),
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: scale(140),
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        backgroundColor: colors.primary || '#E50914', // Red Background
    },
    infoButton: {
        backgroundColor: 'rgba(109, 109, 110, 0.7)',
    },
    buttonFocused: {
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
    },
    buttonFocusedSecondary: {
        backgroundColor: 'rgba(109, 109, 110, 0.9)',
        borderWidth: scale(3),
        borderColor: '#FFF',
    },
    buttonText: {
        fontSize: scaleFont(20),
        fontWeight: '700',
        color: colors.textPrimary || '#FFF',
        letterSpacing: 0.5,
    },
    playButtonText: {
        color: '#FFF',
    },
    playIcon: {
        marginRight: scale(10),
        marginLeft: scale(-4),
    },
    playIconText: {
        fontSize: scaleFont(20),
        color: '#FFF',
        fontWeight: 'bold',
    },
    infoIcon: {
        width: scale(24),
        height: scale(24),
        borderRadius: scale(12),
        borderWidth: scale(2),
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(10),
    },
    infoIconText: {
        fontSize: scaleFont(16),
        color: '#FFF',
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    iconButton: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(24),
        backgroundColor: 'rgba(42, 42, 42, 0.6)',
        borderWidth: scale(2),
        borderColor: 'rgba(255, 255, 255, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: scale(8),
    },
    iconButtonFocused: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: '#FFF',
    },
    iconButtonText: {
        fontSize: scaleFont(28),
        color: '#FFF',
        fontWeight: '400',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5C518', // IMDb Yellow
        paddingHorizontal: scale(8),
        paddingVertical: scale(2),
        borderRadius: scale(4),
    },
    ratingLabel: {
        fontSize: scaleFont(14),
        color: '#000',
        fontWeight: '700',
        marginRight: scale(4),
    },
    ratingValue: {
        fontSize: scaleFont(16),
        color: '#000',
        fontWeight: '700',
    },

    // appLogoContainer removed
    appLogo: {
        width: scale(300),
        height: scale(80),
        marginBottom: scale(8),
        marginLeft: scale(-65), // Aggressively shift left to compensate for asset padding
        alignSelf: 'flex-start',
    },
    textBlack: {
        color: '#000',
    }
});

export default React.memo(TVHeroBanner);
