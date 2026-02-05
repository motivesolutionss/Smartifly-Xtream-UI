/**
 * MovieDetailScreen
 * 
 * Shows full movie metadata with play button, trailer, cast, etc.
 * Similar to SeriesDetailScreen but for movies.
 */

import React, { useEffect, useState, useRef } from 'react';
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
import YoutubePlayer from 'react-native-youtube-iframe';
import FastImageComponent from '../../components/FastImageComponent';
import { colors, spacing, borderRadius, Icon } from '../../theme';
import useStore from '../../store';
import { logger } from '../../config';
import { MovieItem } from '../../navigation/types';
import DownloadButton from '../../components/DownloadButton';

type ParamList = {
    MovieDetail: { movie: MovieItem };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MovieDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ParamList, 'MovieDetail'>>();
    const { movie } = route.params;
    const { getXtreamAPI } = useStore();
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

        (navigation as any).navigate('Player', {
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
                <View style={styles.headerOverlay}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content}>
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
                                <Text style={styles.rating}>
                                    ★ {info.rating} / 10
                                </Text>
                            </View>
                        )}

                        {/* Genre */}
                        {info.genre && (
                            <Text style={styles.genre}>{info.genre}</Text>
                        )}

                        {/* Duration */}
                        {info.duration && (
                            <Text style={styles.duration}>⏱ {info.duration}</Text>
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
                <View style={{ height: spacing.xxl }} />
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
                            videoId={(() => {
                                const raw = info.youtube_trailer || '';
                                if (raw.includes('youtube.com/watch?v=')) {
                                    return raw.split('v=')[1]?.split('&')[0] || '';
                                }
                                if (raw.includes('youtu.be/')) {
                                    return raw.split('youtu.be/')[1]?.split('?')[0] || '';
                                }
                                return raw;
                            })()}
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
        padding: spacing.md,
    },
    backButton: {
        alignSelf: 'flex-start',
    },
    backButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
    },
    content: {
        flex: 1,
        padding: spacing.md,
        marginTop: -40,
    },
    infoRow: {
        flexDirection: 'row',
    },
    poster: {
        width: 100,
        height: 150,
        borderRadius: borderRadius.md,
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
        color: colors.warning,
        fontSize: 14,
    },
    genre: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: spacing.xs,
    },
    duration: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: spacing.xs,
    },
    year: {
        color: colors.textMuted,
        fontSize: 12,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
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
        backgroundColor: colors.cardBackground,
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
        backgroundColor: colors.cardBackground,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
    },
    trailerCloseButton: {
        alignSelf: 'flex-end',
        padding: spacing.xs,
        marginBottom: spacing.sm,
    },
    trailerTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginTop: spacing.md,
    },
});

export default MovieDetailScreen;
