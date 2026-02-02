/**
 * TV Continue Watching Card Component
 * 
 * Special card for Continue Watching rail.
 * Shows progress bar and episode info for series.
 * 
 * @enterprise-grade
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Pressable,
    Animated,
    TouchableOpacity,
} from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';
import { FALLBACK_POSTER } from '../HomeRailConfig';
import { WatchProgress } from '../../../../store/watchHistoryStore';

// =============================================================================
// TYPES
// =============================================================================

interface TVContinueCardProps {
    item: WatchProgress;
    onPress: (item: WatchProgress) => void;
    onRemove?: (item: WatchProgress) => void;
    width?: number;
    height?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVContinueCard: React.FC<TVContinueCardProps> = ({
    item,
    onPress,
    onRemove,
    width = scale(220), // Wider for continue watching
    height = scale(130), // Landscape ratio for continue
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [scaleAnim] = useState(new Animated.Value(1));

    const handleFocus = () => {
        setIsFocused(true);
        Animated.spring(scaleAnim, {
            toValue: 1.06,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    // Format remaining time
    const formatRemaining = () => {
        const remaining = item.duration - item.position;
        if (remaining <= 0) return 'Finished';

        const minutes = Math.floor(remaining / 60);

        // "Finishing soon" for < 2 minutes
        if (minutes < 2) return 'Finishing soon';

        if (minutes < 60) return `${minutes}m left`;

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m left`;
    };

    // Get subtitle (episode info for series)
    const getSubtitle = () => {
        if (item.type === 'series' && item.seasonNumber && item.episodeNumber) {
            return `S${item.seasonNumber} E${item.episodeNumber}${item.episodeTitle ? ` • ${item.episodeTitle}` : ''}`;
        }
        if (item.type === 'live') {
            return 'Live TV';
        }
        return formatRemaining();
    };

    return (
        <Pressable
            onPress={() => onPress(item)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[styles.container, { width }]}
        >
            <Animated.View
                style={[
                    styles.imageContainer,
                    {
                        width,
                        height,
                        transform: [{ scale: scaleAnim }],
                        borderColor: isFocused ? colors.accent || '#00E5FF' : 'transparent',
                        borderWidth: isFocused ? scale(3) : 0,
                    },
                    isFocused && styles.shadow,
                ]}
            >
                {/* Thumbnail */}
                <Image
                    source={{ uri: item.thumbnail || FALLBACK_POSTER }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Dark overlay for text readability */}
                <View style={styles.overlay} />

                {/* Play icon overlay */}
                {onRemove && (
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => onRemove(item)}
                    >
                        <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.playIconContainer}>
                    <View style={styles.playIcon}>
                        <Text style={styles.playIconText}>▶</Text>
                    </View>
                </View>

                {/* Progress bar */}
                {item.type !== 'live' && item.progress > 0 && (
                    <View style={styles.progressContainer}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${item.progress}%` }
                            ]}
                        />
                    </View>
                )}

                {/* Type badge */}
                <View style={[
                    styles.typeBadge,
                    item.type === 'live' && styles.liveBadge,
                ]}>
                    {item.type === 'live' && <View style={styles.liveDot} />}
                    <Text style={styles.typeBadgeText}>
                        {item.type === 'live' ? 'LIVE' : item.type === 'series' ? 'SERIES' : 'MOVIE'}
                    </Text>
                </View>
            </Animated.View>

        </Pressable>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        marginRight: scale(16),
    },
    imageContainer: {
        borderRadius: scale(8),
        overflow: 'hidden',
        backgroundColor: colors.backgroundSecondary || '#222',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 10,
        zIndex: 10,
    },
    // Play icon
    playIconContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIconText: {
        fontSize: scaleFont(16),
        color: '#000',
        marginLeft: scale(2),
    },
    // Progress bar
    progressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: scale(4),
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary || '#E50914',
    },
    // Type badge
    typeBadge: {
        position: 'absolute',
        top: scale(6),
        left: scale(6),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: scale(6),
        paddingVertical: scale(2),
        borderRadius: scale(4),
        flexDirection: 'row',
        alignItems: 'center',
    },
    liveBadge: {
        backgroundColor: colors.live || '#E50914',
    },
    liveDot: {
        width: scale(5),
        height: scale(5),
        borderRadius: scale(3),
        backgroundColor: '#FFF',
        marginRight: scale(4),
    },
    typeBadgeText: {
        fontSize: scaleFont(9),
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    removeButton: {
        position: 'absolute',
        top: scale(6),
        right: scale(10),
        paddingHorizontal: scale(12),
        paddingVertical: scale(4),
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: scale(12),
    },
    removeText: {
        fontSize: scaleFont(10),
        color: colors.error || '#EF4444',
        fontWeight: '600',
    },
    // Meta
    metaContainer: {
        marginTop: scale(10),
        paddingRight: scale(4),
    },
    title: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        color: colors.textSecondary || '#AAA',
    },
    titleFocused: {
        color: colors.textPrimary || '#FFF',
    },
    subtitle: {
        fontSize: scaleFont(11),
        color: colors.textMuted || '#666',
        marginTop: scale(2),
    },
});

export default TVContinueCard;
