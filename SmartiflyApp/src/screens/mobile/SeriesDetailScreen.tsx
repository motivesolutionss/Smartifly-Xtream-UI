import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
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

type ParamList = {
    SeriesDetail: { series: any };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SeriesDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ParamList, 'SeriesDetail'>>();
    const { series } = route.params;
    const { getXtreamAPI } = useStore();
    const [seriesInfo, setSeriesInfo] = useState<any>(null);
    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [trailerVisible, setTrailerVisible] = useState(false);

    // Ref to track if component is still mounted (prevents memory leaks)
    const isMountedRef = useRef(true);

    useEffect(() => {
        // Reset mounted ref on mount
        isMountedRef.current = true;

        const fetchSeriesInfo = async () => {
            const api = getXtreamAPI();
            if (!api) return;

            try {
                const info = await api.getSeriesInfo(series.series_id);

                // DEBUG: Log series info shape to diagnose data issues

                // Check if still mounted before updating state
                if (!isMountedRef.current) return;

                setSeriesInfo(info);
                if (info.episodes) {
                    // Sort seasons numerically (Xtream returns strings: "1", "10", "2")
                    const seasons = Object.keys(info.episodes).sort(
                        (a, b) => Number(a) - Number(b)
                    );
                    if (seasons.length > 0) {
                        setSelectedSeason(seasons[0]);
                    }
                }
            } catch (error: any) {
                // Safe error logging - avoid dumping huge Xtream error objects
                logger.error('Failed to fetch series info', {
                    seriesId: series.series_id,
                    message: error?.message || 'Unknown error',
                });
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                }
            }
        };

        fetchSeriesInfo();

        // Cleanup: mark as unmounted to prevent state updates after unmount
        return () => {
            isMountedRef.current = false;
        };
    }, [series.series_id, getXtreamAPI]); // Proper dependencies

    // Memoized episode play handler
    const handlePlayEpisode = useCallback((episode: any) => {
        const api = getXtreamAPI();
        if (!api) return;

        // Use the actual container extension from the API (mp4, mkv, etc.)
        // Fallback to mp4 if extension is missing
        const extension = episode.container_extension || 'mp4';
        const episodeUrl = api.getSeriesEpisodeUrl(episode.id, extension);
        (navigation as any).navigate('Player', {
            type: 'series',
            item: { ...episode, name: `${series.name} - ${episode.title}` },
            episodeUrl,
        });
    }, [getXtreamAPI, navigation, series.name]);

    // Sort seasons numerically for display
    const seasons = seriesInfo?.episodes
        ? Object.keys(seriesInfo.episodes).sort((a, b) => Number(a) - Number(b))
        : [];

    // ROBUST episode extraction - handles both array and object shapes
    // Xtream can return episodes as:
    // 1. Array: "1": [ { id, title, ... }, ... ]
    // 2. Object: "1": { "0": { id, title }, "1": { id, title } }
    const rawSeason = selectedSeason && seriesInfo?.episodes
        ? seriesInfo.episodes[selectedSeason]
        : null;

    const episodes = Array.isArray(rawSeason)
        ? rawSeason
        : rawSeason && typeof rawSeason === 'object'
            ? Object.values(rawSeason)
            : [];

    // Render episode item for FlatList (virtualized for performance)
    const renderEpisodeItem = useCallback(({ item: episode }: { item: any }) => (
        <TouchableOpacity
            style={styles.episodeCard}
            onPress={() => handlePlayEpisode(episode)}
        >
            <FastImageComponent
                source={{ uri: episode.info?.movie_image || series.cover }}
                style={styles.episodeThumbnail}
            />
            <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle}>
                    E{episode.episode_num}. {episode.title}
                </Text>
                {episode.info?.duration && (
                    <Text style={styles.episodeDuration}>{episode.info.duration}</Text>
                )}
            </View>
            <Text style={styles.playIcon}>▶</Text>
        </TouchableOpacity>
    ), [handlePlayEpisode, series.cover]);

    return (
        <View style={styles.container}>
            {/* Header with backdrop */}
            <View style={styles.header}>
                <FastImageComponent
                    source={{
                        uri: (series && Array.isArray(series.backdrop_path) && series.backdrop_path[0])
                            || series?.cover
                            || 'https://via.placeholder.com/400x200?text=No+Image'
                    }}
                    style={styles.backdrop}
                />
                <View style={styles.headerOverlay}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Series Info */}
            <ScrollView style={styles.content}>
                <View style={styles.infoRow}>
                    <FastImageComponent
                        source={{ uri: series.cover }}
                        style={styles.poster}
                    />
                    <View style={styles.infoText}>
                        <Text style={styles.title}>{series.name}</Text>

                        {/* Rating - use real rating out of 10 */}
                        {(series.rating || seriesInfo?.info?.rating) && (
                            <View style={styles.ratingRow}>
                                <Text style={styles.rating}>
                                    ★ {series.rating || seriesInfo?.info?.rating} / 10
                                </Text>
                            </View>
                        )}

                        {/* Genre */}
                        {(series.genre || seriesInfo?.info?.genre) && (
                            <Text style={styles.genre}>
                                {series.genre || seriesInfo?.info?.genre}
                            </Text>
                        )}

                        {/* Runtime */}
                        {(series.episode_run_time || seriesInfo?.info?.episode_run_time) && (
                            <Text style={styles.runtime}>
                                ⏱ {series.episode_run_time || seriesInfo?.info?.episode_run_time} min/episode
                            </Text>
                        )}

                        {/* Release Date */}
                        {(series.releaseDate || seriesInfo?.info?.releaseDate) && (
                            <Text style={styles.year}>
                                {series.releaseDate || seriesInfo?.info?.releaseDate}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Plot */}
                {(series.plot || seriesInfo?.info?.plot) && (
                    <Text style={styles.plot}>
                        {series.plot || seriesInfo?.info?.plot}
                    </Text>
                )}

                {/* Cast */}
                {(series.cast || seriesInfo?.info?.cast) && (
                    <View style={styles.metaSection}>
                        <Text style={styles.metaLabel}>Cast</Text>
                        <Text style={styles.metaValue}>
                            {series.cast || seriesInfo?.info?.cast}
                        </Text>
                    </View>
                )}

                {/* Director */}
                {(series.director || seriesInfo?.info?.director) && (
                    <View style={styles.metaSection}>
                        <Text style={styles.metaLabel}>Director</Text>
                        <Text style={styles.metaValue}>
                            {series.director || seriesInfo?.info?.director}
                        </Text>
                    </View>
                )}

                {/* YouTube Trailer Button - Opens in-app player */}
                {(series.youtube_trailer || seriesInfo?.info?.youtube_trailer) && (
                    <TouchableOpacity
                        style={styles.trailerButton}
                        onPress={() => setTrailerVisible(true)}
                    >
                        <Icon name="playCircle" size={20} color={colors.error} weight="fill" />
                        <Text style={styles.trailerButtonText}>Watch Trailer</Text>
                    </TouchableOpacity>
                )}

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                ) : (
                    <>
                        {/* Season Selector */}
                        {seasons.length > 0 && (
                            <View style={styles.seasonSelector}>
                                <Text style={styles.sectionTitle}>Seasons</Text>
                                <FlatList
                                    horizontal
                                    data={seasons}
                                    keyExtractor={(item) => item}
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.seasonChip,
                                                selectedSeason === item && styles.seasonChipActive,
                                            ]}
                                            onPress={() => setSelectedSeason(item)}
                                        >
                                            <Text
                                                style={[
                                                    styles.seasonChipText,
                                                    selectedSeason === item && styles.seasonChipTextActive,
                                                ]}
                                            >
                                                Season {item}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        )}

                        {/* Episodes - Using FlatList for virtualization (performance) */}
                        <View style={styles.episodesSection}>
                            <Text style={styles.sectionTitle}>Episodes</Text>

                            {/* Empty episodes fallback */}
                            {episodes.length === 0 ? (
                                <Text style={styles.emptyText}>No episodes available</Text>
                            ) : (
                                <FlatList
                                    data={episodes}
                                    keyExtractor={(item) => String(item.id)}
                                    renderItem={renderEpisodeItem}
                                    scrollEnabled={false} // Already inside ScrollView
                                    removeClippedSubviews
                                    initialNumToRender={10}
                                    maxToRenderPerBatch={10}
                                    windowSize={5}
                                />
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* YouTube Trailer Modal - Plays in-app */}
            <Modal
                visible={trailerVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setTrailerVisible(false)}
            >
                <View style={styles.trailerModalOverlay}>
                    <View style={styles.trailerModalContent}>
                        {/* Close button */}
                        <TouchableOpacity
                            style={styles.trailerCloseButton}
                            onPress={() => setTrailerVisible(false)}
                        >
                            <Icon name="x" size={24} color={colors.textPrimary} weight="bold" />
                        </TouchableOpacity>

                        {/* YouTube Player */}
                        <YoutubePlayer
                            height={SCREEN_WIDTH * 9 / 16}
                            width={SCREEN_WIDTH - spacing.lg * 2}
                            videoId={(() => {
                                // Extract video ID from URL or use as-is
                                const raw = series.youtube_trailer || seriesInfo?.info?.youtube_trailer || '';
                                if (raw.includes('youtube.com/watch?v=')) {
                                    return raw.split('v=')[1]?.split('&')[0] || '';
                                }
                                if (raw.includes('youtu.be/')) {
                                    return raw.split('youtu.be/')[1]?.split('?')[0] || '';
                                }
                                return raw; // Already a video ID
                            })()}
                            play={trailerVisible}
                        />

                        {/* Trailer title */}
                        <Text style={styles.trailerTitle}>{series.name} - Trailer</Text>
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
    rating: {
        color: colors.warning,
        fontSize: 14,
        marginTop: spacing.xs,
    },
    genre: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: spacing.xs,
    },
    year: {
        color: colors.textMuted,
        fontSize: 12,
    },
    plot: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: spacing.md,
    },
    loader: {
        marginTop: spacing.xl,
    },
    seasonSelector: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    seasonChip: {
        backgroundColor: colors.cardBackground,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        marginRight: spacing.sm,
    },
    seasonChipActive: {
        backgroundColor: colors.series,
    },
    seasonChipText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    seasonChipTextActive: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    episodesSection: {
        marginTop: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    episodeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        overflow: 'hidden',
    },
    episodeThumbnail: {
        width: 120,
        height: 70,
    },
    episodeInfo: {
        flex: 1,
        padding: spacing.sm,
    },
    episodeTitle: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '500',
    },
    episodeDuration: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    playIcon: {
        color: colors.textPrimary,
        fontSize: 20,
        paddingRight: spacing.md,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginTop: spacing.md,
    },
    // New styles for enhanced metadata
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    runtime: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: spacing.xs,
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
    // YouTube Trailer Modal Styles
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

export default SeriesDetailScreen;
