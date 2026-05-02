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
    Pressable,
    Animated,
    Modal,
} from 'react-native';
import FastImageComponent from '../../../components/tv/TVFastImage';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import YoutubePlayer from 'react-native-youtube-iframe';
import useStore from '../../../store';
import { colors, scale, scaleFont, Icon } from '../../../theme';
import useTVBackHandler from '../../../utils/useTVBackHandler';
import { logger } from '../../../config';
import TVDownloadButton from '../../../components/tv/TVDownloadButton';

const TVMovieDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { movie } = route.params;

    // Store & State
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const [info, setInfo] = useState<any>(null);

    // UI State
    const [focusedButton, setFocusedButton] = useState<'play' | 'trailer' | 'back' | 'download' | null>('play');
    const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
    const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);

    // Helper to extract YouTube ID
    const getYoutubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    };

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
                // Loading handling if needed
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
    }, [movie.stream_id, getXtreamAPI, fadeAnim, contentSlideAnim]);

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
    const movieMeta = info?.movie_data || {};
    const backdrop =
        movieData.backdrop_path?.[0] ||
        movieMeta.backdrop_path?.[0] ||
        movieMeta.backdrop ||
        movieData.movie_image ||
        movie.stream_icon;
    const poster = movieData.movie_image || movieMeta.movie_image || movie.stream_icon;
    const name = movieData.name || movie.name;
    const plot = movieData.plot || movieMeta.plot || movieData.description || movie.plot || 'No description available.';
    const rating = movieData.rating || movieMeta.rating || movie.rating_5based;
    const cast = movieData.cast || movieMeta.cast;
    const director = movieData.director || movieMeta.director;
    const genre = movieData.genre || movieMeta.genre || movie.genre;
    const duration = movieData.duration || movieMeta.duration;
    const year = movieData.releasedate || movieMeta.releasedate || movie.added;
    const youtube_trailer = movieData.youtube_trailer || movieMeta.youtube_trailer;

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
                    color={primary ? colors.background : '#FFF'}
                    style={{ marginRight: scale(12) }}
                />
                <Text style={[
                    styles.buttonText,
                    primary && { color: colors.background } // Ensure primary label is visible on light button
                ]}>
                    {label}
                </Text>
            </Pressable>
        );
    };

    return (
        <View
            style={styles.container}
            importantForAccessibility={isTrailerModalOpen ? 'no-hide-descendants' : 'auto'}
        >
            {/* 1. Full Screen Backdrop */}
            <FastImageComponent
                source={{ uri: backdrop }}
                style={styles.backdrop}
                resizeMode="cover"
                priority="high"
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
                {/* Left Column: Poster */}
                <View style={styles.leftColumn}>
                    <FastImageComponent
                        source={{ uri: poster }}
                        style={styles.poster}
                        resizeMode="cover"
                    />
                </View>

                {/* Right Column: Info */}
                <View style={styles.rightColumn}>
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
                            <View style={styles.creditItem}>
                                <Text style={styles.creditLabel}>Directed by </Text>
                                <Text style={styles.creditValue}>{director}</Text>
                            </View>
                        )}
                        {cast && (
                            <View style={styles.creditItem}>
                                <Text style={styles.creditLabel}>Starring </Text>
                                <Text style={styles.creditValue} numberOfLines={1}>{cast}</Text>
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        {renderButton(
                            'play',
                            'Watch Now',
                            'playCircle',
                            handlePlay,
                            true
                        )}
                        <TVDownloadButton
                            item={{
                                id: String(movie.stream_id),
                                name: movie.name || name,
                                stream_icon: movie.stream_icon || poster,
                                container_extension: movie.container_extension || info?.movie_data?.container_extension,
                                type: 'movie',
                            }}
                            iconSize={scale(24)}
                            labelStyle={styles.buttonText}
                            invertOnFocus={false}
                            focusMode="secondary"
                            onFocus={() => setFocusedButton('download')}
                            onBlur={() => setFocusedButton(null)}
                            isFocused={focusedButton === 'download'}
                            style={styles.downloadButton}
                        />
                        {youtube_trailer && renderButton(
                            'trailer',
                            'Trailer',
                            'filmStrip',
                            () => setIsTrailerModalOpen(true)
                        )}
                        {renderButton(
                            'back',
                            'Go Back',
                            'arrow-left',
                            () => navigation.goBack()
                        )}
                    </View>
                </View>

            </Animated.View>

            {/* 4. YouTube Trailer Modal */}
            <Modal
                visible={isTrailerModalOpen && !!youtube_trailer}
                transparent
                animationType="fade"
                onRequestClose={() => setIsTrailerModalOpen(false)}
                onShow={() => setIsTrailerPlaying(false)} // Reset playing state on show
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{name} - Trailer</Text>
                            <Pressable
                                onPress={() => setIsTrailerModalOpen(false)}
                                style={({ pressed }) => [
                                    styles.closeButton,
                                    pressed && { transform: [{ scale: 0.95 }] }
                                ]}
                                hasTVPreferredFocus
                            >
                                <Icon name="close" size={scale(24)} color="#FFF" />
                            </Pressable>
                        </View>
                        <View style={styles.youtubeContainer}>
                            <YoutubePlayer
                                height={scale(450)}
                                width={scale(800)}
                                videoId={getYoutubeId(youtube_trailer)}
                                play={isTrailerPlaying}
                                onReady={() => setIsTrailerPlaying(true)}
                                initialPlayerParams={{
                                    autoplay: 1,
                                    modestbranding: 1,
                                    rel: 0,
                                    controls: 1,
                                }}
                                onError={(e: any) => logger.error('Youtube Player Error', e)}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
        flexDirection: 'row',
        paddingHorizontal: scale(70),
        alignItems: 'center',
    },
    leftColumn: {
        marginRight: scale(84),
    },
    poster: {
        width: scale(380),
        aspectRatio: 2 / 3,
        borderRadius: scale(20),
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    rightColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    // Meta Row
    metaTagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(22),
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
        fontSize: scaleFont(16),
    },
    metaText: {
        color: '#E0E0E0',
        fontSize: scaleFont(24),
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
        fontSize: scaleFont(16),
        fontWeight: '900',
    },
    // Typography
    title: {
        fontSize: scaleFont(68),
        lineHeight: scaleFont(76),
        fontWeight: '900',
        color: '#FFF',
        marginBottom: scale(20),
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    plot: {
        fontSize: scaleFont(28),
        lineHeight: scaleFont(40),
        color: '#B0B0B0',
        marginBottom: scale(28),
        maxWidth: scale(860),
    },
    creditsRow: {
        flexDirection: 'column',
        marginBottom: scale(36),
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: scale(22),
        maxWidth: scale(860),
        gap: scale(8),
    },
    creditItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    creditLabel: {
        fontSize: scaleFont(21),
        color: '#FFF',
        opacity: 0.6,
        fontWeight: '600',
    },
    creditValue: {
        fontSize: scaleFont(21),
        color: '#FFF',
        fontWeight: '500',
    },
    // Buttons
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(18),
        paddingHorizontal: scale(28),
        width: scale(238),
        borderRadius: scale(12),
        marginRight: scale(10),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    downloadButton: {
        width: scale(238),
        paddingVertical: scale(18),
        paddingHorizontal: scale(28),
        justifyContent: 'center',
        marginRight: scale(10),
        borderRadius: scale(12),
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
        fontSize: scaleFont(26),
        fontWeight: '700',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 1.1,
    },
    // Modal
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        padding: scale(30),
        borderRadius: scale(16),
        width: scale(860),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    modalTitle: {
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        color: '#FFF',
    },
    closeButton: {
        padding: scale(10),
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(24),
    },
    youtubeContainer: {
        borderRadius: scale(12),
        overflow: 'hidden',
        backgroundColor: '#000',
    }
});

export default TVMovieDetailScreen;
