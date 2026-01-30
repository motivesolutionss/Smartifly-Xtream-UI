/**
 * TV Movie Detail Screen
 * 
 * Cinematic detail view for Movies on TV.
 * Features: Full backdrop, metadata, cast, related content.
 * 
 * @enterprise-grade
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    BackHandler,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import useStore from '../../../store';
import { colors, scale, scaleFont } from '../../../theme';
import useTVBackHandler from '../../../utils/useTVBackHandler';
import { logger } from '../../../config';
import { prefetchImage } from '../../../utils/image';

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

    // Store
    const { getXtreamAPI } = useStore();

    // State
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [focusedButton, setFocusedButton] = useState<'play' | 'trailer' | 'back' | null>('play');
    const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
    const [lastFocusedButton, setLastFocusedButton] = useState<'play' | 'trailer' | 'back' | null>('play');
    const [preferredFocusButton, setPreferredFocusButton] = useState<'play' | 'trailer' | 'back' | null>(null);

    // ==========================================================================
    // DATA FETCHING
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

        return () => {
            isMounted = false;
        };
    }, [movie.stream_id, getXtreamAPI]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                navigation.goBack();
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [navigation])
    );

    const closeTrailerModal = () => {
        setIsTrailerModalOpen(false);
        if (lastFocusedButton) {
            setPreferredFocusButton(lastFocusedButton);
        }
    };

    useTVBackHandler(() => {
        if (isTrailerModalOpen) {
            closeTrailerModal();
            return true;
        }
        navigation.goBack();
        return true;
    });

    const handlePlay = () => {
        navigation.navigate('FullscreenPlayer', {
            type: 'movie',
            item: movie,
        });
    };

    const movieData = info?.info || {};
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

    useEffect(() => {
        if (!preferredFocusButton) return;
        const handle = setTimeout(() => setPreferredFocusButton(null), 50);
        return () => clearTimeout(handle);
    }, [preferredFocusButton]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const renderButton = (
        id: 'play' | 'trailer' | 'back',
        label: string,
        onPress: () => void,
        primary = false
    ) => {
        const isFocused = focusedButton === id;

        return (
            <Pressable
                onPress={onPress}
                onFocus={() => {
                    setFocusedButton(id);
                    setLastFocusedButton(id);
                }}
                onBlur={() => setFocusedButton(null)}
                focusable
                hasTVPreferredFocus={preferredFocusButton ? preferredFocusButton === id : id === 'play'}
                style={[
                    styles.button,
                    primary && styles.buttonPrimary,
                    !primary && styles.buttonSecondary,
                    isFocused && styles.buttonFocused,
                ]}
            >
                <Text style={[
                    styles.buttonText,
                    isFocused && styles.buttonTextFocused
                ]}>
                    {label}
                </Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Background Image */}
            <Image
                source={{ uri: backdrop }}
                style={styles.backdrop}
                resizeMode="cover"
            />

            {/* Dark Overlay (Replaces Gradient) */}
            <View style={styles.overlay} />

            <View style={styles.contentContainer}>
                {/* Left: Poster */}
                <View style={styles.leftColumn}>
                    <Image
                        source={{ uri: poster }}
                        style={styles.poster}
                        resizeMode="cover"
                    />
                </View>

                {/* Right: Info */}
                <View style={styles.rightColumn}>
                    <Text style={styles.title}>{name}</Text>

                    <View style={styles.metaRow}>
                        {rating && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>★ {rating}</Text>
                            </View>
                        )}
                        {duration && <Text style={styles.metaText}>{duration}</Text>}
                        {year && <Text style={styles.metaText}>{year}</Text>}
                        {genre && <Text style={styles.metaText}>{genre}</Text>}
                    </View>

                    <ScrollView style={styles.plotContainer}>
                        <Text style={styles.plot}>{plot}</Text>

                        <View style={styles.creditsContainer}>
                            {director && (
                                <Text style={styles.creditText}>
                                    <Text style={styles.creditLabel}>Director: </Text>
                                    {director}
                                </Text>
                            )}
                            {cast && (
                                <Text style={styles.creditText}>
                                    <Text style={styles.creditLabel}>Cast: </Text>
                                    {cast}
                                </Text>
                            )}
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                        {renderButton('play', '▶ Play Movie', handlePlay, true)}
                        {renderButton('trailer', 'Trailer', () => setIsTrailerModalOpen(true), false)}
                        {renderButton('back', 'Go Back', () => navigation.goBack(), false)}
                    {isTrailerModalOpen && (
                        <View style={styles.modalOverlay}>
                            <Text style={styles.modalTitle}>Trailer preview (placeholder)</Text>
                            <Pressable
                                onPress={closeTrailerModal}
                                style={styles.modalButton}
                                hasTVPreferredFocus
                            >
                                <Text style={styles.modalButtonText}>Close</Text>
                            </Pressable>
                        </View>
                    )}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.6,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)', // Simple dark overlay
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        padding: scale(40),
    },
    leftColumn: {
        width: scale(250),
        marginRight: scale(40),
        justifyContent: 'center',
    },
    rightColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    poster: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: scale(12),
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        fontSize: scaleFont(36),
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: scale(10),
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    badge: {
        backgroundColor: colors.accent,
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(4),
        marginRight: scale(10),
    },
    badgeText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: scaleFont(12),
    },
    metaText: {
        color: '#CCC',
        fontSize: scaleFont(14),
        marginRight: scale(20),
    },
    plotContainer: {
        maxHeight: scale(150),
        marginBottom: scale(30),
    },
    plot: {
        color: '#EEE',
        fontSize: scaleFont(16),
        lineHeight: scaleFont(24),
    },
    creditsContainer: {
        marginTop: scale(20),
    },
    creditText: {
        color: '#AAA',
        fontSize: scaleFont(14),
        marginBottom: scale(4),
    },
    creditLabel: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    button: {
        paddingVertical: scale(12),
        paddingHorizontal: scale(24),
        borderRadius: scale(8),
        marginRight: scale(16),
        minWidth: scale(120),
        alignItems: 'center',
    },
    buttonPrimary: {
        backgroundColor: '#FFF',
    },
    buttonSecondary: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    buttonFocused: {
        transform: [{ scale: 1.05 }],
        borderWidth: 2,
        borderColor: colors.accent,
    },
    buttonText: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#EEE',
    },
    buttonTextFocused: {
        color: colors.accent,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: scale(40),
        zIndex: 100,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: scaleFont(24),
        fontWeight: '700',
        textAlign: 'center',
    },
    modalButton: {
        marginTop: scale(20),
        paddingVertical: scale(12),
        paddingHorizontal: scale(30),
        borderRadius: scale(10),
        borderWidth: 1,
        borderColor: colors.primary,
    },
    modalButtonText: {
        color: colors.primary,
        fontSize: scaleFont(18),
        fontWeight: '600',
    },
});

export default TVMovieDetailScreen;
