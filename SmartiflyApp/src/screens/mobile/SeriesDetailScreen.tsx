import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { FlashList } from '@shopify/flash-list';
import FastImageComponent from '../../components/FastImageComponent';
import { colors, spacing, borderRadius, Icon } from '../../theme';
import useStore from '../../store';
import { logger } from '../../config';
import { SeriesItem, EpisodeItem } from '../../navigation/types';
import DownloadButton from '../../components/DownloadButton';

type ParamList = {
    SeriesDetail: { series: SeriesItem };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SeriesDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ParamList, 'SeriesDetail'>>();
    const { series } = route.params;
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
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
            } catch (error: unknown) {
                // Safe error logging - avoid dumping huge Xtream error objects
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error('Failed to fetch series info', {
                    seriesId: series.series_id,
                    message: errorMessage,
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
    const handlePlayEpisode = useCallback((episode: EpisodeItem) => {
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

    // Sort seasons numerically for display (memoized)
    const seasons = useMemo(() => {
        if (!seriesInfo?.episodes) return [];
        return Object.keys(seriesInfo.episodes).sort((a, b) => Number(a) - Number(b));
    }, [seriesInfo?.episodes]);

    // ROBUST episode extraction - handles both array and object shapes
    const episodes = useMemo(() => {
        if (!selectedSeason || !seriesInfo?.episodes) return [];
        const rawSeason = seriesInfo.episodes[selectedSeason];
        if (Array.isArray(rawSeason)) {
            return rawSeason as EpisodeItem[];
        }
        if (rawSeason && typeof rawSeason === 'object') {
            return Object.values(rawSeason) as EpisodeItem[];
        }
        return [];
    }, [selectedSeason, seriesInfo?.episodes]);

    // Render episode item for FlatList (virtualized for performance)
    const renderEpisodeItem = useCallback(({ item: episode }: { item: EpisodeItem }) => (
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
            <DownloadButton
                item={{
                    id: String(episode.id),
                    name: `${series.name} - ${episode.title}`,
                    stream_icon: episode.info?.movie_image || series.cover,
                    container_extension: episode.container_extension || 'mp4',
                    type: 'series',
                }}
                style={styles.episodeDownloadButton}
            />
            <Text style={styles.playIcon}>▶</Text>
        </TouchableOpacity>
    ), [handlePlayEpisode, series.cover, series.name]);

    const listHeader = useMemo(() => (
        <View>
            <View style={styles.infoRow}>
                <FastImageComponent
                    source={{ uri: series.cover }}
                    style={styles.poster}
                />
                <View style={styles.infoText}>
                    <Text style={styles.title}>{series.name}</Text>

                    {(series.rating || seriesInfo?.info?.rating) && (
                        <View style={styles.ratingRow}>
                            <Text style={styles.rating}>
                                ★ {series.rating || seriesInfo?.info?.rating} / 10
                            </Text>
                        </View>
                    )}

                    {(series.genre || seriesInfo?.info?.genre) && (
                        <Text style={styles.genre}>
                            {series.genre || seriesInfo?.info?.genre}
                        </Text>
                    )}

                    {(series.episode_run_time || seriesInfo?.info?.episode_run_time) && (
                        <Text style={styles.runtime}>
                            🕙 {series.episode_run_time || seriesInfo?.info?.episode_run_time} min/episode
                        </Text>
                    )}

                    {(series.releaseDate || seriesInfo?.info?.releaseDate) && (
                        <Text style={styles.year}>
                            {series.releaseDate || seriesInfo?.info?.releaseDate}
                        </Text>
                    )}
                </View>
            </View>

            {(series.plot || seriesInfo?.info?.plot) && (
                <Text style={styles.plot}>
                    {series.plot || seriesInfo?.info?.plot}
                </Text>
            )}

            {(series.cast || seriesInfo?.info?.cast) && (
                <View style={styles.metaSection}>
                    <Text style={styles.metaLabel}>Cast</Text>
                    <Text style={styles.metaValue}>
                        {series.cast || seriesInfo?.info?.cast}
                    </Text>
                </View>
            )}

            {(series.director || seriesInfo?.info?.director) && (
                <View style={styles.metaSection}>
                    <Text style={styles.metaLabel}>Director</Text>
                    <Text style={styles.metaValue}>
                        {series.director || seriesInfo?.info?.director}
                    </Text>
                </View>
            )}

            {(series.youtube_trailer || seriesInfo?.info?.youtube_trailer) && (
                <TouchableOpacity
                    style={styles.trailerButton}
                    onPress={() => setTrailerVisible(true)}
                >
                    <Icon name="playCircle" size={20} color={colors.error} weight="fill" />
                    <Text style={styles.trailerButtonText}>Watch Trailer</Text>
                </TouchableOpacity>
            )}

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

            <View style={styles.episodesSection}>
                <Text style={styles.sectionTitle}>Episodes</Text>
            </View>
        </View>
    ), [
        series.cover,
        series.name,
        series.rating,
        series.genre,
        series.episode_run_time,
        series.releaseDate,
        series.plot,
        series.cast,
        series.director,
        series.youtube_trailer,
        seriesInfo?.info?.rating,
        seriesInfo?.info?.genre,
        seriesInfo?.info?.episode_run_time,
        seriesInfo?.info?.releaseDate,
        seriesInfo?.info?.plot,
        seriesInfo?.info?.cast,
        seriesInfo?.info?.director,
        seriesInfo?.info?.youtube_trailer,
        seasons,
        selectedSeason,
    ]);

    const renderEmptyEpisodes = useCallback(() => {
        if (loading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                </View>
            );
        }
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No episodes available</Text>
            </View>
        );
    }, [loading]);

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
            <FlashList
                data={episodes}
                renderItem={renderEpisodeItem}
                keyExtractor={(item) => String(item.id)}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={renderEmptyEpisodes}
                contentContainerStyle={styles.listContent}
                // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                estimatedItemSize={110}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
            />
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
    listContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
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
    episodeDownloadButton: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: spacing.sm,
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
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
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
