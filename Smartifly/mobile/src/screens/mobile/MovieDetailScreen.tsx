/**
 * MovieDetailScreen
 * 
 * Shows full movie metadata with play button, trailer, cast, etc.
 * Similar to SeriesDetailScreen but for movies.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Modal,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import FastImageComponent from '../../components/FastImageComponent';
import { colors, spacing, borderRadius, Icon } from '../../theme';
import useContentStore from '../../store/contentStore';
import { logger } from '../../config';
import { MovieItem } from '../../navigation/types';
import DownloadButton from '../../components/DownloadButton';

type ParamList = {
    MovieDetail: { movie: MovieItem };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MovieDetailScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ParamList, 'MovieDetail'>>();
    const { movie } = route.params;
    const getXtreamAPI = useContentStore((state) => state.getXtreamAPI);
    const [movieInfo, setMovieInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [trailerVisible, setTrailerVisible] = useState(false);

    // Ref to track if component is still mounted
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        const fetchMovieInfo = async () => {
            const api = getXtreamAPI();
            if (!api) {
                setLoading(false);
                return;
            }

            try {
                // Fetch detailed movie info from Xtream API
                const info = await api.getVodInfo(movie.stream_id);

                // Debug logging

                if (!isMountedRef.current) return;
                setMovieInfo(info);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error('Failed to fetch movie info', {
                    streamId: movie.stream_id,
                    message: errorMessage,
                });
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                }
            }
        };

        fetchMovieInfo();

        return () => {
            isMountedRef.current = false;
        };
    }, [movie.stream_id, getXtreamAPI]);

    // Play the movie
    const handlePlay = () => {
        const api = getXtreamAPI();
        if (!api) return;

        (navigation as any).navigate('FullscreenPlayer', {
            type: 'movie',
            item: {
                stream_id: movie.stream_id,
                name: movie.name,
                stream_icon: movie.stream_icon,
                container_extension: movie.container_extension || movieInfo?.movie_data?.container_extension,
            },
        });
    };

    // Get data from either passed movie or fetched movieInfo
    const getInfo = () => ({
        name: movie.name || movieInfo?.info?.name,
        cover: movie.stream_icon || movie.cover || movieInfo?.info?.cover_big || movieInfo?.info?.movie_image,
        backdrop: movieInfo?.info?.backdrop_path?.[0] || movie.stream_icon,
        rating: movie.rating || movieInfo?.info?.rating,
        genre: movie.genre || movieInfo?.info?.genre,
        duration: movie.duration || movieInfo?.info?.duration,
        releaseDate: movie.releaseDate || movieInfo?.info?.releasedate,
        plot: movie.plot || movieInfo?.info?.plot || movieInfo?.info?.description,
        cast: movie.cast || movieInfo?.info?.cast,
        director: movie.director || movieInfo?.info?.director,
        youtube_trailer: movie.youtube_trailer || movieInfo?.info?.youtube_trailer,
    });

    const info = getInfo();
    const headerOverlayStyle = useMemo(() => ({
        paddingTop: insets.top + spacing.sm,
    }), [insets.top]);
    const trailerId = useMemo(() => {
        const raw = info.youtube_trailer || '';
        if (raw.includes('youtube.com/watch?v=')) {
            return raw.split('v=')[1]?.split('&')[0] || '';
        }
        if (raw.includes('youtu.be/')) {
            return raw.split('youtu.be/')[1]?.split('?')[0] || '';
        }
        return raw;
    }, [info.youtube_trailer]);

    return (
        <View style={styles.container}>
            {/* Header with backdrop */}
            <View style={styles.header}>
                <FastImageComponent
                    source={{
                        uri: info.backdrop || info.cover || 'https://via.placeholder.com/400x200?text=No+Image'
                    }}
                    style={styles.backdrop}
                />
                <View style={[styles.headerOverlay, headerOverlayStyle]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="caretLeft" size={18} color={colors.textPrimary} />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <View style={styles.infoRow}>
                    <FastImageComponent
                        source={{ uri: info.cover }}
                        style={styles.poster}
                    />
                    <View style={styles.infoText}>
                        <Text style={styles.title}>{info.name}</Text>

                        {/* Rating out of 10 */}
                        {info.rating && (
                            <View style={styles.ratingRow}>
                                <Icon name="star" size={14} color={colors.qualityUHD} />
                                <Text style={styles.rating}>{info.rating} / 10</Text>
                            </View>
                        )}

                        {/* Genre */}
                        {info.genre && (
                            <Text style={styles.genre}>{info.genre}</Text>
                        )}

                        {/* Duration */}
                        {info.duration && (
                            <View style={styles.metaChip}>
                                <Icon name="clock" size={12} color={colors.textSecondary} />
                                <Text style={styles.duration}>{info.duration}</Text>
                            </View>
                        )}

                        {/* Release Date */}
                        {info.releaseDate && (
                            <Text style={styles.year}>{info.releaseDate}</Text>
                        )}
                    </View>
                </View>

                {/* Play Button */}
                <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
                    <Icon name="play" size={24} color={colors.textPrimary} weight="fill" />
                    <Text style={styles.playButtonText}>Play Movie</Text>
                </TouchableOpacity>

                {/* Plot */}
                {info.plot && (
                    <Text style={styles.plot}>{info.plot}</Text>
                )}

                {/* Cast */}
                {info.cast && (
                    <View style={styles.metaSection}>
                        <Text style={styles.metaLabel}>Cast</Text>
                        <Text style={styles.metaValue}>{info.cast}</Text>
                    </View>
                )}

                {/* Director */}
                {info.director && (
                    <View style={styles.metaSection}>
                        <Text style={styles.metaLabel}>Director</Text>
                        <Text style={styles.metaValue}>{info.director}</Text>
                    </View>
                )}

                {/* Action Buttons Row */}
                <View style={styles.actionButtonsRow}>
                    {/* YouTube Trailer Button */}
                    {info.youtube_trailer && (
                        <TouchableOpacity
                            style={styles.trailerButton}
                            onPress={() => setTrailerVisible(true)}
                        >
                            <Icon name="playCircle" size={20} color={colors.error} weight="fill" />
                            <Text style={styles.trailerButtonText}>Trailer</Text>
                        </TouchableOpacity>
                    )}

                    {/* Download Button */}
                    <DownloadButton
                        item={{
                            id: String(movie.stream_id),
                            name: movie.name,
                            stream_icon: movie.stream_icon,
                            container_extension: movie.container_extension || (info as any).container_extension || (info as any).movie_data?.container_extension,
                            type: 'movie',
                        }}
                        style={styles.downloadButton}
                    />
                </View>

                {loading && (
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                )}

                {/* Bottom spacing */}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* YouTube Trailer Modal */}
            <Modal
                visible={trailerVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setTrailerVisible(false)}
            >
                <View style={styles.trailerModalOverlay}>
                    <View style={styles.trailerModalContent}>
                        <TouchableOpacity
                            style={styles.trailerCloseButton}
                            onPress={() => setTrailerVisible(false)}
                        >
                            <Icon name="x" size={24} color={colors.textPrimary} weight="bold" />
                        </TouchableOpacity>

                        <YoutubePlayer
                            height={SCREEN_WIDTH * 9 / 16}
                            width={SCREEN_WIDTH - spacing.lg * 2}
                            videoId={trailerId}
                            play={trailerVisible}
                        />

                        <Text style={styles.trailerTitle}>{info.name} - Trailer</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        height: 200,
    },
    backdrop: {
        width: '100%',
        height: '100%',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlayLight,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    backButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        borderRadius: borderRadius.round,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    backButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        marginTop: -40,
    },
    contentContainer: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    infoRow: {
        flexDirection: 'row',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        padding: spacing.md,
    },
    poster: {
        width: 100,
        height: 150,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoText: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'flex-end',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    rating: {
        color: colors.qualityUHD,
        fontSize: 14,
        fontWeight: '700',
    },
    genre: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: spacing.xs,
    },
    metaChip: {
        marginTop: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xxs,
        backgroundColor: colors.backgroundTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.round,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
    },
    duration: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    year: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: spacing.xs,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    playButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    plot: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: spacing.md,
    },
    metaSection: {
        marginTop: spacing.md,
    },
    metaLabel: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    metaValue: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },
    trailerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.md,
        alignSelf: 'flex-start',
        gap: spacing.xs,
    },
    trailerButtonText: {
        color: colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    downloadButton: {
        flex: 1,
    },
    loader: {
        marginTop: spacing.xl,
    },
    trailerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trailerModalContent: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    trailerCloseButton: {
        alignSelf: 'flex-end',
        padding: spacing.xs,
        marginBottom: spacing.sm,
    },
    trailerTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        marginTop: spacing.md,
        textAlign: 'center',
    },
    bottomSpacer: {
        height: spacing.xxl,
    },
});

export default MovieDetailScreen;
