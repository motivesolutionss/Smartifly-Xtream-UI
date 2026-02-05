/**
 * TV Player Screen
 * 
 * Video player optimized for Android TV / Fire TV.
 * Uses native controls for D-pad support.
 * 
 * @enterprise-grade
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
    TouchableOpacity,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import useStore from '../../../store';
import { colors, scaleFont } from '../../../theme';
import { logger } from '../../../config';
import { RootStackParamList } from '../../../navigation/types';
import { useTrackProgress } from '../../../store/watchHistoryStore';
import useTVBackHandler from '../../../utils/useTVBackHandler';
import useDownloadStore from '../../../store/downloadStore';

type TVPlayerScreenRouteProp = RouteProp<RootStackParamList, 'FullscreenPlayer'>;

const TVPlayerScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<TVPlayerScreenRouteProp>();

    // Params might come from FullscreenPlayer or just Player depending on how we route
    // The previous mobile player used { type, item, episodeUrl }
    const { type, item, episodeUrl } = route.params || {};
    const resumePosition = route.params?.resumePosition ?? 0;

    const { getXtreamAPI } = useStore();
    const { trackMovie, trackEpisode, trackLive } = useTrackProgress();
    const { downloads } = useDownloadStore();
    const api = getXtreamAPI();

    // Refs and state
    const videoRef = useRef<VideoRef>(null);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [streamUrl, setStreamUrl] = useState<string>('');
    const [videoKey, setVideoKey] = useState(0);
    const [hasSeeked, setHasSeeked] = useState(false);
    const durationRef = useRef(0);
    const lastProgressUpdateRef = useRef(0);
    const hasTrackedLiveRef = useRef(false);

    const handleProgress = (currentTime: number) => {
        const now = Date.now();
        if (now - lastProgressUpdateRef.current < 5000) return;
        lastProgressUpdateRef.current = now;

        // FIX: Fallback duration if player reports 0 (common with some containers)
        let duration = durationRef.current;
        const anyItem = item as any;

        if (duration <= 0 && anyItem) {
            // Try to parse from metadata (e.g. "01:30:00" or "90 min" or raw seconds)
            const rawDuration = anyItem.duration;
            if (rawDuration) {
                if (typeof rawDuration === 'string') {
                    if (rawDuration.includes(':')) {
                        // HH:MM:SS
                        const parts = rawDuration.split(':').map(Number);
                        if (parts.length === 3) duration = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
                        else if (parts.length === 2) duration = (parts[0] * 60) + parts[1];
                    } else if (rawDuration.includes('min')) {
                        // "90 min"
                        duration = parseInt(rawDuration, 10) * 60;
                    } else {
                        // "5400"
                        duration = parseInt(rawDuration, 10);
                    }
                } else if (typeof rawDuration === 'number') {
                    duration = rawDuration;
                }
            }
        }

        if (type === 'movie' && duration > 0) {
            trackMovie(
                anyItem.stream_id || anyItem.id,
                anyItem.name,
                currentTime,
                duration,
                anyItem.stream_icon || anyItem.cover,
                anyItem
            );
        } else if (type === 'series' && duration > 0) {
            const streamId = anyItem.stream_id || anyItem.id;
            const seriesId = anyItem.series_id || anyItem.seriesId || 0;
            const seriesTitle = anyItem.series_name || anyItem.seriesTitle || anyItem.name || 'Series';
            const episodeTitle = anyItem.title || anyItem.episodeTitle || anyItem.name || 'Episode';
            const seasonNumber = anyItem.season || anyItem.season_number || anyItem.seasonNumber || 0;
            const episodeNumber = anyItem.episode_num || anyItem.episodeNumber || 0;

            trackEpisode(
                streamId,
                seriesId,
                seriesTitle,
                episodeTitle,
                Number(seasonNumber) || 0,
                Number(episodeNumber) || 0,
                currentTime,
                duration,
                anyItem.info?.movie_image || anyItem.stream_icon || anyItem.cover,
                anyItem
            );
        }
    };

    // Handle Back Button
    useTVBackHandler(() => {
        navigation.goBack();
        return true;
    });

    // Prepare Stream URL
    useEffect(() => {
        setIsBuffering(true);
        setHasError(false);
        setShowOverlay(false);
        setOverlayMessage(null);
        setStreamUrl('');
        setHasSeeked(false);

        if (!api || !item) {
            setOverlayMessage('Missing player session');
            setShowOverlay(true);
            setIsBuffering(false);
            return;
        }

        let url = '';
        try {
            const mediaItem = item as any;
            const searchId = String(mediaItem.stream_id || mediaItem.id);

            // Debug: Log all downloads and search ID
            logger.debug('TVPlayer: Checking for local download', {
                searchId,
                item_stream_id: mediaItem.stream_id,
                item_id: mediaItem.id,
                downloadsCount: downloads.length,
                downloadIds: downloads.map(d => d.id),
            });

            const download = downloads.find(d => d.id === searchId);

            if (download && download.status === 'completed' && download.localPath) {
                // Use local file for offline playback
                url = `file://${download.localPath}`;
                logger.info('TVPlayer: Playing from local download', {
                    id: download.id,
                    path: download.localPath,
                    url
                });
            } else if (type === 'live') {
                url = api.getLiveStreamUrl(mediaItem.stream_id || mediaItem.id, 'm3u8');
                logger.debug('TVPlayer: Live stream prepared', { id: mediaItem.stream_id });
            } else if (type === 'movie') {
                const extension = mediaItem.container_extension || 'mp4';
                url = api.getVodStreamUrl(mediaItem.stream_id || mediaItem.id, extension);
                logger.debug('TVPlayer: Movie stream prepared', { id: mediaItem.stream_id, extension });
            } else if (type === 'series') {
                if (episodeUrl) {
                    url = episodeUrl;
                } else if (mediaItem.url) { // Fallback if passed directly
                    url = mediaItem.url;
                }
                logger.debug('TVPlayer: Series episode prepared');
            }
        } catch (e) {
            logger.error('TVPlayer: Error generating URL', e);
            setOverlayMessage('Unable to prepare stream');
            setShowOverlay(true);
        }

        if (!url) {
            setOverlayMessage('Stream information is missing');
            setShowOverlay(true);
            setIsBuffering(false);
            return;
        }

        setStreamUrl(url);
    }, [api, item, type, episodeUrl, videoKey, resumePosition, downloads]);

    // Lifecycle cleanup
    useEffect(() => {
        StatusBar.setHidden(true);
        return () => {
            StatusBar.setHidden(false);
        };
    }, []);

    if (!streamUrl && !showOverlay) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {streamUrl && !showOverlay && (
                <Video
                    key={videoKey}
                    ref={videoRef}
                    source={{ uri: streamUrl }}
                    style={styles.video}
                    controls={true} // Native controls work best for D-pad initially
                    resizeMode="contain"
                    repeat={type === 'live'}
                    playInBackground={false}
                    playWhenInactive={false}
                    bufferConfig={{
                        minBufferMs: 15000,
                        maxBufferMs: 50000,
                        bufferForPlaybackMs: 2500,
                        bufferForPlaybackAfterRebufferMs: 5000,
                    }}
                    onError={(e) => {
                        logger.error('TVPlayer: Playback error', e);
                        setHasError(true);
                        setIsBuffering(false);
                        setOverlayMessage('Playback interrupted');
                        setShowOverlay(true);
                    }}
                    onLoad={(data) => {
                        logger.debug('TVPlayer: Loaded');
                        durationRef.current = data.duration || 0;
                        if (type === 'live' && !hasTrackedLiveRef.current) {
                            const anyItem = item as any;
                            trackLive(anyItem.stream_id || anyItem.id, anyItem.name, anyItem.stream_icon || anyItem.cover, anyItem);
                            hasTrackedLiveRef.current = true;
                        }
                        if (type !== 'live' && resumePosition > 0 && !hasSeeked && videoRef.current) {
                            videoRef.current.seek(Math.max(0, resumePosition));
                            setHasSeeked(true);
                        }
                        setIsBuffering(false);
                    }}
                    onBuffer={({ isBuffering: buffering }) => setIsBuffering(buffering)}
                    onProgress={({ currentTime }) => handleProgress(currentTime)}
                />
            )}

            {/* Buffering Overlay */}
            {isBuffering && !hasError && !showOverlay && (
                <View style={styles.centerOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Buffering...</Text>
                </View>
            )}

            {/* Error Overlay */}
            {showOverlay && (
                <View style={styles.centerOverlay}>
                    <Text style={styles.errorText}>{overlayMessage || 'Playback Error'}</Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => navigation.goBack()}
                        hasTVPreferredFocus
                    >
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                    {streamUrl && (
                        <TouchableOpacity
                            style={[styles.button, styles.retryButton]}
                            onPress={() => {
                                setHasError(false);
                                setShowOverlay(false);
                                setOverlayMessage(null);
                                setVideoKey((prev) => prev + 1);
                                setIsBuffering(true);
                            }}
                        >
                            <Text style={styles.buttonText}>Retry</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    centerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    loadingText: {
        color: '#FFF',
        marginTop: 20,
        fontSize: scaleFont(16),
    },
    errorText: {
        color: '#FF4444',
        fontSize: scaleFont(20),
        marginBottom: 20,
        fontWeight: 'bold',
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#333',
        borderRadius: 8,
    },
    retryButton: {
        marginTop: 10,
        backgroundColor: '#444',
    },
    buttonText: {
        color: '#FFF',
        fontSize: scaleFont(16),
    },
});

export default TVPlayerScreen;
