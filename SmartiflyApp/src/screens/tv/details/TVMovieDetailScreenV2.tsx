/**
 * TV Movie Detail Screen - Enterprise Edition
 * 
 * Cinematic, immersive detail view for Movies.
 * Features: 
 * - Full-screen backdrop with sophisticated gradient overlay
 * - Floating content hierarchy (Netflix/Disney+ style)
 * - Premium typography and glassmorphic UI elements
 * - Optimized focus states for TV navigation
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Pressable,
    ScrollView,
    BackHandler,
    Animated,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import useStore from '../../../store';
import { colors, scale, scaleFont, Icon } from '../../../theme';
import useTVBackHandler from '../../../utils/useTVBackHandler';
import { logger } from '../../../config';

const { width, height } = Dimensions.get('window');

// Types
interface TVMovieDetailScreenProps {
    route: {
        params: {
            movie: any; // Raw movie item
        };
    };
}

const TVMovieDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { movie } = route.params;

    // Store & State
    const { getXtreamAPI } = useStore();
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [focusedButton, setFocusedButton] = useState<'play' | 'trailer' | 'back' | null>('play');
    const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const contentSlideAnim = useRef(new Animated.Value(50)).current;

    // ==========================================================================
    // DATA & LIFECYCLE
    // ==========================================================================

    useEffect(() => {
        let isMounted = true;

        const fetchDetails = async () => {
            try {
                const api = getXtreamAPI();
                if (!api) return;

                const data = await api.getVodInfo(movie.stream_id);
                if (isMounted) {
                    setInfo(data);
                }
            } catch (err) {
                logger.error('TVMovieDetail: Failed to fetch info', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDetails();

        // Enter Animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(contentSlideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        return () => { isMounted = false; };
    }, [movie.stream_id, getXtreamAPI]);

    // ==========================================================================
    // BACK HANDLERS
    // ==========================================================================

    const handleBack = useCallback(() => {
        if (isTrailerModalOpen) {
            setIsTrailerModalOpen(false);
            return true;
        }
        navigation.goBack();
        return true;
    }, [isTrailerModalOpen, navigation]);

    useTVBackHandler(handleBack);

    // ==========================================================================
    // ACTIONS
    // ==========================================================================

    const handlePlay = () => {
        const playerItem = {
            ...movie,
            ...(info?.info || {}),
        };
        navigation.navigate('FullscreenPlayer', {
            type: 'movie',
            item: playerItem,
        });
    };

    // ==========================================================================
    // DATA PARSING
    // ==========================================================================

    const movieData = info?.info || {};
    // Fallback logic for images
    const backdrop = movieData.backdrop_path?.[0] || movieData.movie_image || movie.stream_icon;
    const poster = movieData.movie_image || movie.stream_icon;
    const name = movieData.name || movie.name;
    const plot = movieData.plot || movieData.description || 'No description available.';
    const rating = movieData.rating || movie.rating_5based;
    const cast = movieData.cast;
    const director = movieData.director;
    const genre = movieData.genre;
    const duration = movieData.duration;
    const year = movieData.releasedate || movie.added;

    // ==========================================================================
    // RENDER HELPERS
    // ==========================================================================

    const renderButton = (
        id: 'play' | 'trailer' | 'back',
        label: string,
        iconName: string,
        onPress: () => void,
        primary = false
    ) => {
        const isFocused = focusedButton === id;

        return (
            <Pressable
                onPress={onPress}
                onFocus={() => setFocusedButton(id)}
                onBlur={() => setFocusedButton(null)}
                style={({ pressed }) => [
                    styles.button,
                    primary ? styles.buttonPrimary : styles.buttonSecondary,
                    isFocused && styles.buttonFocused,
                    isFocused && primary && { backgroundColor: '#FFF' }, // Primary highlight
                    isFocused && !primary && { backgroundColor: 'rgba(255,255,255,0.3)' }, // Secondary highlight
                    pressed && { transform: [{ scale: 0.98 }] }
                ]}
            >
                <Icon
                    name={iconName}
                    size={scale(24)}
                    color={primary ? (isFocused ? colors.background : '#FFF') : '#FFF'}
                    style={{ marginRight: scale(12) }}
                />
                <Text style={[
                    styles.buttonText,
                    primary && isFocused && { color: colors.background } // Invert text on focus for primary
                ]}>
                    {label}
                </Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* 1. Full Screen Backdrop */}
            <Image
                source={{ uri: backdrop }}
                style={styles.backdrop}
                resizeMode="cover"
            />

            {/* 2. Gradient Overlay (Cinema Mode) */}
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%">
                    <Defs>
                        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor="#000" stopOpacity="0.95" />
                            <Stop offset="0.4" stopColor="#000" stopOpacity="0.8" />
                            <Stop offset="0.7" stopColor="#000" stopOpacity="0.4" />
                            <Stop offset="1" stopColor="#000" stopOpacity="0.1" />
                        </LinearGradient>
                        <LinearGradient id="gradBottom" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#000" stopOpacity="0" />
                            <Stop offset="0.8" stopColor="#000" stopOpacity="0.8" />
                            <Stop offset="1" stopColor="#000" stopOpacity="1" />
                        </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#grad)" />
                    <Rect width="100%" height="100%" fill="url(#gradBottom)" />
                </Svg>
            </View>

            {/* 3. Floating Content */}
            <Animated.View style={[
                styles.contentContainer,
                { opacity: fadeAnim, transform: [{ translateY: contentSlideAnim }] }
            ]}>

                {/* Meta Tags Row */}
                <View style={styles.metaTagsRow}>
                    {rating && (
                        <View style={styles.ratingBadge}>
                            <Icon name="star" size={scale(14)} color="#000" style={{ marginRight: scale(4) }} />
                            <Text style={styles.ratingText}>{rating}</Text>
                        </View>
                    )}
                    {year && <Text style={styles.metaText}>{year}</Text>}
                    {duration && (
                        <>
                            <View style={styles.metaDivider} />
                            <Text style={styles.metaText}>{duration}</Text>
                        </>
                    )}
                    {genre && (
                        <>
                            <View style={styles.metaDivider} />
                            <Text style={styles.metaText}>{genre}</Text>
                        </>
                    )}
                    <View style={styles.hdBadge}>
                        <Text style={styles.hdText}>HD</Text>
                    </View>
                </View>

                {/* Main Title */}
                <Text style={styles.title} numberOfLines={2}>
                    {name}
                </Text>

                {/* Plot / Description */}
                <Text style={styles.plot} numberOfLines={4}>
                    {plot}
                </Text>

                {/* Credits */}
                <View style={styles.creditsRow}>
                    {director && (
                        <Text style={styles.creditText}>
                            <Text style={{ opacity: 0.6 }}>Directed by </Text>
                            {director}
                        </Text>
                    )}
                    {cast && (
                        <Text style={[styles.creditText, { marginLeft: scale(30) }]} numberOfLines={1}>
                            <Text style={{ opacity: 0.6 }}>Starring </Text>
                            {cast}
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {renderButton(
                        'play',
                        'Watch Now',
                        'play-circle',
                        handlePlay,
                        true
                    )}
                    {renderButton(
                        'trailer',
                        'Trailer',
                        'film',
                        () => setIsTrailerModalOpen(true)
                    )}
                    {renderButton(
                        'back',
                        'Go Back',
                        'arrow-left',
                        () => navigation.goBack()
                    )}
                </View>

            </Animated.View>

            {/* 4. Modal (Simple Overlay) */}
            {isTrailerModalOpen && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Icon name="film" size={scale(60)} color={colors.primary} style={{ marginBottom: scale(20) }} />
                        <Text style={styles.modalTitle}>Trailer Unavailable</Text>
                        <Text style={styles.modalSubtitle}>Preview functionality is coming soon.</Text>
                        <Pressable
                            onPress={() => setIsTrailerModalOpen(false)}
                            style={styles.modalButton}
                            hasTVPreferredFocus
                        >
                            <Text style={styles.modalButtonText}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center', // Vertically center content on the left
        paddingLeft: scale(60),
        paddingRight: scale(600), // Keep right side clear for the image
        paddingBottom: scale(60),
    },
    // Meta Row
    metaTagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(24),
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFD700', // Gold
        paddingHorizontal: scale(10),
        paddingVertical: scale(4),
        borderRadius: scale(4),
        marginRight: scale(16),
    },
    ratingText: {
        color: '#000',
        fontWeight: '900',
        fontSize: scaleFont(14),
    },
    metaText: {
        color: '#E0E0E0',
        fontSize: scaleFont(16),
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    metaDivider: {
        width: 1,
        height: scale(14),
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: scale(16),
    },
    hdBadge: {
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.6)',
        borderRadius: scale(4),
        paddingHorizontal: scale(8),
        paddingVertical: scale(2),
        marginLeft: scale(20),
    },
    hdText: {
        color: '#DDD',
        fontSize: scaleFont(12),
        fontWeight: '900',
    },
    // Typography
    title: {
        fontSize: scaleFont(64),
        lineHeight: scaleFont(72),
        fontWeight: '900',
        color: '#FFF',
        marginBottom: scale(24),
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    plot: {
        fontSize: scaleFont(18),
        lineHeight: scaleFont(28),
        color: '#B0B0B0',
        marginBottom: scale(32),
        maxWidth: scale(700),
    },
    creditsRow: {
        flexDirection: 'row',
        marginBottom: scale(48),
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: scale(20),
        maxWidth: scale(700),
    },
    creditText: {
        fontSize: scaleFont(14),
        color: '#FFF',
    },
    // Buttons
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(16),
        paddingHorizontal: scale(32),
        borderRadius: scale(12),
        marginRight: scale(20),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    buttonPrimary: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    buttonSecondary: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonFocused: {
        borderColor: '#FFF',
        transform: [{ scale: 1.05 }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    buttonText: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // Modal
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        padding: scale(60),
        borderRadius: scale(20),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: scale(8),
    },
    modalSubtitle: {
        fontSize: scaleFont(16),
        color: '#AAA',
        marginBottom: scale(30),
    },
    modalButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: scale(12),
        paddingHorizontal: scale(30),
        borderRadius: scale(8),
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: scaleFont(16),
        fontWeight: 'bold',
    },
});

export default TVMovieDetailScreen;
