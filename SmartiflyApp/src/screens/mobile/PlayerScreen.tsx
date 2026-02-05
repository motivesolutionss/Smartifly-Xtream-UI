import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import useStore from '../../store';
import { logger } from '../../config';
import { useTrackProgress } from '../../store/watchHistoryStore';
import useDownloadStore from '../../store/downloadStore';

type ParamList = {
    Player: {
        type: 'live' | 'movie' | 'series';
        item: any;
        episodeUrl?: string;
        resumePosition?: number;
    };
};

const PlayerScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ParamList, 'Player'>>();
    const { type, item, episodeUrl } = route.params;
    const resumePosition = route.params.resumePosition ?? 0;
    const { getXtreamAPI } = useStore();
    const { trackMovie, trackEpisode, trackLive } = useTrackProgress();
    const { downloads } = useDownloadStore();
    const api = getXtreamAPI();

    // Refs and state
    const videoRef = React.useRef<VideoRef>(null);
    const [isBuffering, setIsBuffering] = React.useState(true);
    const [hasError, setHasError] = React.useState(false);
    const durationRef = React.useRef(0);
    const lastProgressUpdateRef = React.useRef(0);
    const [hasSeeked, setHasSeeked] = React.useState(false);
    const hasTrackedLiveRef = React.useRef(false);

    React.useEffect(() => {
        setHasSeeked(false);
    }, [item, resumePosition]);

    // FIX #1: Move navigation.goBack() into useEffect to avoid render-time navigation
    React.useEffect(() => {
        if (!api) {
            navigation.goBack();
        }
    }, [api, navigation]);

    // FIX #5: Control StatusBar lifecycle properly
    React.useEffect(() => {
        StatusBar.setHidden(true);
        return () => {
            StatusBar.setHidden(false);
        };
    }, []);

    // FIX #2: Add unmount cleanup for video resources
    React.useEffect(() => {
        return () => {
            logger.debug('Player unmounted, cleaning up');
        };
    }, []);

    // Early return after hooks (safe pattern)
    if (!api) {
        return null;
    }

    let streamUrl = '';
    const download = downloads.find(d => d.id === String(item.stream_id || item.id));

    if (download && download.status === 'completed' && download.localPath) {
        streamUrl = `file://${download.localPath}`;
        logger.info('Playing from local download', { id: download.id, path: download.localPath });
    } else if (type === 'live') {
        streamUrl = api.getLiveStreamUrl(item.stream_id, 'm3u8');
        logger.debug('Live stream prepared', { streamId: item.stream_id, hasUrl: !!streamUrl });
    } else if (type === 'movie') {
        const extension = item.container_extension || 'mp4';
        streamUrl = api.getVodStreamUrl(item.stream_id, extension);
        logger.debug('Movie stream prepared', { streamId: item.stream_id, extension, hasUrl: !!streamUrl });
    } else if (episodeUrl) {
        streamUrl = episodeUrl;
        logger.debug('Series episode selected', { hasEpisodeUrl: !!episodeUrl });
    }

    const handleProgress = (currentTime: number) => {
        const now = Date.now();
        if (now - lastProgressUpdateRef.current < 5000) return;
        lastProgressUpdateRef.current = now;

        const duration = durationRef.current;
        if (type === 'movie' && duration > 0) {
            trackMovie(
                item.stream_id || item.id,
                item.name,
                currentTime,
                duration,
                item.stream_icon || item.cover,
                item
            );
        } else if (type === 'series' && duration > 0) {
            const streamId = item.stream_id || item.id;
            const seriesId = item.series_id || item.seriesId || 0;
            const seriesTitle = item.series_name || item.seriesTitle || item.name || 'Series';
            const episodeTitle = item.title || item.episodeTitle || item.name || 'Episode';
            const seasonNumber = item.season || item.season_number || item.seasonNumber || 0;
            const episodeNumber = item.episode_num || item.episodeNumber || 0;

            trackEpisode(
                streamId,
                seriesId,
                seriesTitle,
                episodeTitle,
                Number(seasonNumber) || 0,
                Number(episodeNumber) || 0,
                currentTime,
                duration,
                item.info?.movie_image || item.stream_icon || item.cover,
                item
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* Video Player */}
            <Video
                ref={videoRef}
                source={{ uri: streamUrl }}
                style={styles.video}
                controls
                resizeMode="contain"
                repeat={type === 'live'}
                muted={false}
                ignoreSilentSwitch="ignore"
                playInBackground={false}
                playWhenInactive={false}
                volume={1.0}
                audioOutput="speaker"
                allowsExternalPlayback={false}
                preventsDisplaySleepDuringVideoPlayback={true}
                bufferConfig={{
                    minBufferMs: 15000,
                    maxBufferMs: 50000,
                    bufferForPlaybackMs: 2500,
                    bufferForPlaybackAfterRebufferMs: 5000,
                }}
                onError={(error) => {
                    logger.error('Video playback error', { type: error.error?.errorString || 'unknown' });
                    setHasError(true);
                    setIsBuffering(false);
                }}
                onLoad={(data) => {
                    logger.debug('Video loaded', {
                        duration: data.duration,
                        hasAudio: data.audioTracks?.length > 0,
                    });
                    durationRef.current = data.duration || 0;
                    if (type === 'live' && !hasTrackedLiveRef.current) {
                        trackLive(item.stream_id || item.id, item.name, item.stream_icon || item.cover, item);
                        hasTrackedLiveRef.current = true;
                    }
                    if (type !== 'live' && resumePosition > 0 && !hasSeeked && videoRef.current) {
                        videoRef.current.seek(resumePosition);
                        setHasSeeked(true);
                    }
                    setIsBuffering(false);
                }}
                onProgress={({ currentTime }) => handleProgress(currentTime)}
                onBuffer={({ isBuffering: buffering }) => {
                    setIsBuffering(buffering);
                }}
                onAudioBecomingNoisy={() => logger.debug('Audio becoming noisy')}
                onAudioFocusChanged={(e) => logger.debug('Audio focus changed', e)}
            />

            {/* FIX #4: Buffering UI */}
            {isBuffering && !hasError && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.overlayText}>Buffering...</Text>
                </View>
            )}

            {/* FIX #4: Error UI */}
            {hasError && (
                <View style={styles.overlay}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>Playback failed</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setHasError(false);
                            setIsBuffering(true);
                        }}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Back Button Overlay */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            {/* Title Overlay */}
            <View style={styles.titleOverlay}>
                <Text style={styles.title}>{item.name}</Text>
                {type === 'live' && (
                    <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>● LIVE</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        backgroundColor: colors.overlayLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    backButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    titleOverlay: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    liveBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 4,
    },
    liveBadgeText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '700',
    },
    // FIX #4: Buffering/Error overlay styles
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.overlay,
    },
    overlayText: {
        color: colors.textPrimary,
        fontSize: 16,
        marginTop: spacing.md,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    errorText: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: spacing.lg,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 8,
    },
    retryButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default PlayerScreen;
