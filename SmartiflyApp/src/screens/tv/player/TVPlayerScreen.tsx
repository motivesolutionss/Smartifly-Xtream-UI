/**
 * TV Player Screen
 *
 * Feature-rich video player optimized for Android TV / Fire TV.
 * Custom controls with D-pad friendly layout.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    PanResponder,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Video, {
    AudioTrack,
    OnLoadData,
    SelectedTrack,
    SelectedTrackType,
    SelectedVideoTrack,
    SelectedVideoTrackType,
    TextTrack,
    VideoRef,
    VideoTrack,
} from 'react-native-video';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import useStore from '../../../store';
import { colors, scale, scaleFont, Icon } from '../../../theme';
import { logger } from '../../../config';
import { RootStackParamList } from '../../../navigation/types';
import { useTrackProgress } from '../../../store/watchHistoryStore';
import useTVBackHandler from '../../../utils/useTVBackHandler';
import useDownloadStore from '../../../store/downloadStore';

// Components
import TVPlayerTopBar from './components/TVPlayerTopBar';
import TVPlayerCenterControls from './components/TVPlayerCenterControls';
import TVPlayerBottomControls from './components/TVPlayerBottomControls';
import TVPlayerFocusLayer from './components/TVPlayerFocusLayer';
import TVPlayerSettingsModal from './components/TVPlayerSettingsModal';

const SEEK_STEP_SECONDS = 15;



type TVPlayerScreenRouteProp = RouteProp<RootStackParamList, 'FullscreenPlayer'>;

type SettingsView = 'root' | 'quality' | 'audio' | 'subtitles' | 'speed' | 'aspect';

type TrackOption = {
    key: string;
    label: string;
    description?: string;
};

const TVPlayerScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<TVPlayerScreenRouteProp>();


    // Params might come from FullscreenPlayer or just Player depending on how we route
    const { type, item, episodeUrl } = route.params || {};
    const resumePosition = route.params?.resumePosition ?? 0;

    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const { trackMovie, trackEpisode, trackLive } = useTrackProgress();
    const downloads = useDownloadStore((state) => state.downloads);
    const api = getXtreamAPI();

    const isLive = type === 'live';

    // Refs and state
    const videoRef = useRef<VideoRef>(null);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [streamUrl, setStreamUrl] = useState<string>('');
    const [videoKey, setVideoKey] = useState(0);
    const [hasSeeked, setHasSeeked] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const retryTimeoutRef = useRef<any>(null);
    const durationRef = useRef(0);
    const lastProgressUpdateRef = useRef(0);
    const hasTrackedLiveRef = useRef(false);
    const wasPlayingRef = useRef(false);

    const [paused, setPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playableDuration, setPlayableDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsView, setSettingsView] = useState<SettingsView>('root');
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');
    const [isMuted, setIsMuted] = useState(false);
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [controlsLocked, setControlsLocked] = useState(false);
    const [isHudVisible, setIsHudVisible] = useState(true);
    const [focusedElement, setFocusedElement] = useState<string | null>(null);
    const hudTimerRef = useRef<any>(null);
    const progressPressableRef = useRef<any>(null);
    const focusTrapRef = useRef<any>(null);
    const playPauseRef = useRef<any>(null);
    const backButtonRef = useRef<any>(null);
    const lockButtonRef = useRef<any>(null);

    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
    const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
    const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<SelectedTrack>({ type: SelectedTrackType.SYSTEM });
    const [selectedTextTrack, setSelectedTextTrack] = useState<SelectedTrack>({ type: SelectedTrackType.DISABLED });
    const [selectedVideoTrack, setSelectedVideoTrack] = useState<SelectedVideoTrack>({
        type: SelectedVideoTrackType.AUTO,
    });

    // HUD Visibility Management
    const showHUD = useCallback(() => {
        setIsHudVisible(true);
        if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
        hudTimerRef.current = setTimeout(() => {
            if (!paused && !showSettings && !controlsLocked) {
                setIsHudVisible(false);
            }
        }, 5000);
    }, [paused, showSettings, controlsLocked]);

    useEffect(() => {
        showHUD();
        return () => {
            if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
        };
    }, [showHUD]);

    // React to pause state
    useEffect(() => {
        if (paused) {
            setIsHudVisible(true);
            if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
        } else {
            showHUD();
        }
    }, [paused, showHUD]);



    // Handle Back Button
    useTVBackHandler(() => {
        if (showSettings) {
            handleSettingsClose();
            return true;
        }
        if (isHudVisible) {
            setIsHudVisible(false);
            return true;
        }
        navigation.goBack();
        return true;
    });

    const handleProgress = (current: number) => {
        const now = Date.now();
        if (now - lastProgressUpdateRef.current < 5000) return;
        lastProgressUpdateRef.current = now;

        // Fallback duration if player reports 0
        let total = durationRef.current;
        const anyItem = item as any;

        if (total <= 0 && anyItem) {
            const rawDuration = anyItem.duration;
            if (rawDuration) {
                if (typeof rawDuration === 'string') {
                    if (rawDuration.includes(':')) {
                        const parts = rawDuration.split(':').map(Number);
                        if (parts.length === 3) total = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
                        else if (parts.length === 2) total = (parts[0] * 60) + parts[1];
                    } else if (rawDuration.includes('min')) {
                        total = parseInt(rawDuration, 10) * 60;
                    } else {
                        total = parseInt(rawDuration, 10);
                    }
                } else if (typeof rawDuration === 'number') {
                    total = rawDuration;
                }
            }
        }

        if (type === 'movie' && total > 0) {
            trackMovie(
                anyItem.stream_id || anyItem.id,
                anyItem.name,
                current,
                total,
                anyItem.stream_icon || anyItem.cover,
                anyItem
            );
        } else if (type === 'series' && total > 0) {
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
                current,
                total,
                anyItem.info?.movie_image || anyItem.stream_icon || anyItem.cover,
                anyItem
            );
        }
    };

    const handleRetry = () => {
        const nextRetry = retryCount + 1;
        if (nextRetry > 5) {
            setOverlayMessage('Maximum retries reached. Please check your connection.');
            setShowOverlay(true);
            return;
        }

        const delay = Math.pow(2, nextRetry - 1) * 1000;
        logger.info(`TVPlayer: Retrying playback (${nextRetry}/5) in ${delay}ms...`);

        setIsBuffering(true);
        setRetryCount(nextRetry);

        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
            setVideoKey(prev => prev + 1);
            setHasError(false);
            setShowOverlay(false);
        }, delay);
    };

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

            logger.debug('TVPlayer: Checking for local download', {
                searchId,
                item_stream_id: mediaItem.stream_id,
                item_id: mediaItem.id,
                downloadsCount: downloads.length,
                downloadIds: downloads.map(d => d.id),
            });

            const download = downloads.find(d => d.id === searchId);

            if (download && download.status === 'completed' && download.localPath) {
                url = `file://${download.localPath}`;
                logger.info('TVPlayer: Playing from local download', {
                    id: download.id,
                    path: download.localPath,
                    url,
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
                } else if (mediaItem.url) {
                    url = mediaItem.url;
                } else if (mediaItem.stream_id || mediaItem.id) {
                    const extension = mediaItem.container_extension || 'mkv';
                    url = api.getSeriesEpisodeUrl(mediaItem.stream_id || mediaItem.id, extension);
                }
                logger.debug('TVPlayer: Series episode prepared', { id: mediaItem.stream_id || mediaItem.id });
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
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, []);

    const handleSeek = useCallback((time: number) => {
        if (isLive || !videoRef.current || duration <= 0) return;
        const clamped = Math.max(0, Math.min(time, duration));
        videoRef.current.seek(clamped);
        setCurrentTime(clamped);
    }, [duration, isLive]);

    const handleSeekBy = useCallback((delta: number) => {
        if (isLive) return;
        handleSeek((isScrubbing ? scrubTime : currentTime) + delta);
    }, [currentTime, handleSeek, isLive, isScrubbing, scrubTime]);


    const beginScrub = useCallback((time: number) => {
        if (isLive || duration <= 0) return;
        wasPlayingRef.current = !paused;
        setIsScrubbing(true);
        setScrubTime(time);
        setPaused(true);
    }, [duration, isLive, paused]);

    const endScrub = useCallback((time: number) => {
        if (isLive || duration <= 0) return;
        setIsScrubbing(false);
        handleSeek(time);
        setPaused(!wasPlayingRef.current);
    }, [duration, handleSeek, isLive]);

    const [progressBarWidth, setProgressBarWidth] = useState(0);

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => !isLive,
        onMoveShouldSetPanResponder: () => !isLive,
        onPanResponderGrant: (evt) => {
            const position = evt.nativeEvent.locationX;
            const ratio = progressBarWidth > 0 ? position / progressBarWidth : 0;
            beginScrub(Math.max(0, Math.min(ratio, 1)) * duration);
        },
        onPanResponderMove: (evt) => {
            const position = evt.nativeEvent.locationX;
            const ratio = progressBarWidth > 0 ? position / progressBarWidth : 0;
            setScrubTime(Math.max(0, Math.min(ratio, 1)) * duration);
        },
        onPanResponderRelease: (evt) => {
            const position = evt.nativeEvent.locationX;
            const ratio = progressBarWidth > 0 ? position / progressBarWidth : 0;
            endScrub(Math.max(0, Math.min(ratio, 1)) * duration);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: (evt) => {
            const position = evt.nativeEvent.locationX;
            const ratio = progressBarWidth > 0 ? position / progressBarWidth : 0;
            endScrub(Math.max(0, Math.min(ratio, 1)) * duration);
        },
    }), [beginScrub, duration, endScrub, isLive, progressBarWidth]);

    const progressTime = isScrubbing ? scrubTime : currentTime;
    const progressPercent = duration > 0 ? Math.min(progressTime / duration, 1) : 0;
    const bufferPercent = duration > 0 ? Math.min(playableDuration / duration, 1) : 0;

    const qualityOptions = useMemo(() => {
        return videoTracks.map((track) => {
            const label = track.height
                ? `${track.height}p`
                : track.bitrate
                    ? `${Math.round(track.bitrate / 1000)} kbps`
                    : `Track ${track.index + 1}`;
            return { key: `quality-${track.index}`, label, description: track.codecs };
        });
    }, [videoTracks]);

    const audioOptions = useMemo(() => {
        return audioTracks.map((track) => {
            const label = track.title || track.language || `Track ${track.index + 1}`;
            return { key: `audio-${track.index}`, label, description: track.language };
        });
    }, [audioTracks]);

    const subtitleOptions = useMemo(() => {
        return textTracks.map((track) => {
            const label = track.title || track.language || `Track ${track.index + 1}`;
            return { key: `sub-${track.index}`, label, description: track.language };
        });
    }, [textTracks]);

    const selectedQualityLabel = useMemo(() => {
        if (!selectedVideoTrack || selectedVideoTrack.type === SelectedVideoTrackType.AUTO) {
            return 'Auto';
        }
        if (selectedVideoTrack.type === SelectedVideoTrackType.INDEX) {
            const track = videoTracks.find(t => t.index === selectedVideoTrack.value);
            if (!track) return 'Custom';
            return track.height ? `${track.height}p` : track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : 'Custom';
        }
        return 'Custom';
    }, [selectedVideoTrack, videoTracks]);

    const selectedAudioLabel = useMemo(() => {
        if (!selectedAudioTrack || selectedAudioTrack.type === SelectedTrackType.SYSTEM) return 'System';
        if (selectedAudioTrack.type === SelectedTrackType.DISABLED) return 'Muted';
        if (selectedAudioTrack.type === SelectedTrackType.INDEX) {
            const track = audioTracks.find(t => t.index === selectedAudioTrack.value);
            return track?.title || track?.language || 'Track';
        }
        return 'Custom';
    }, [audioTracks, selectedAudioTrack]);

    const selectedSubtitleLabel = useMemo(() => {
        if (!selectedTextTrack || selectedTextTrack.type === SelectedTrackType.DISABLED) return 'Off';
        if (selectedTextTrack.type === SelectedTrackType.SYSTEM) return 'System';
        if (selectedTextTrack.type === SelectedTrackType.INDEX) {
            const track = textTracks.find(t => t.index === selectedTextTrack.value);
            return track?.title || track?.language || 'Track';
        }
        return 'Custom';
    }, [selectedTextTrack, textTracks]);

    const handleSettingsClose = () => {
        setSettingsView('root');
        setShowSettings(false);
    };



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
                    controls={false}
                    resizeMode={resizeMode}
                    repeat={isLive || repeatEnabled}
                    paused={paused}
                    muted={isMuted}
                    rate={playbackRate}
                    selectedAudioTrack={selectedAudioTrack}
                    selectedTextTrack={selectedTextTrack}
                    selectedVideoTrack={selectedVideoTrack}
                    playInBackground={false}
                    playWhenInactive={false}
                    bufferConfig={
                        isLive
                            ? {
                                minBufferMs: 25000,
                                maxBufferMs: 60000,
                                bufferForPlaybackMs: 3000,
                                bufferForPlaybackAfterRebufferMs: 10000,
                            }
                            : {
                                minBufferMs: 15000,
                                maxBufferMs: 50000,
                                bufferForPlaybackMs: 2500,
                                bufferForPlaybackAfterRebufferMs: 5000,
                            }
                    }
                    onError={(e) => {
                        logger.error('TVPlayer: Playback error', e);
                        if (isLive) {
                            handleRetry();
                        } else {
                            setHasError(true);
                            setIsBuffering(false);
                            setOverlayMessage('Playback interrupted');
                            setShowOverlay(true);
                        }
                    }}
                    onLoad={(data: OnLoadData) => {
                        logger.debug('TVPlayer: Loaded');
                        durationRef.current = data.duration || 0;
                        setDuration(data.duration || 0);
                        setAudioTracks(data.audioTracks || []);
                        setTextTracks(data.textTracks || []);
                        setVideoTracks(data.videoTracks || []);

                        const initialAudio = data.audioTracks?.find(t => t.selected);
                        const initialText = data.textTracks?.find(t => t.selected);
                        const initialVideo = data.videoTracks?.find(t => t.selected);

                        setSelectedAudioTrack(initialAudio ? { type: SelectedTrackType.INDEX, value: initialAudio.index } : { type: SelectedTrackType.SYSTEM });
                        setSelectedTextTrack(initialText ? { type: SelectedTrackType.INDEX, value: initialText.index } : { type: SelectedTrackType.DISABLED });
                        setSelectedVideoTrack(initialVideo ? { type: SelectedVideoTrackType.INDEX, value: initialVideo.index } : { type: SelectedVideoTrackType.AUTO });

                        if (isLive && !hasTrackedLiveRef.current) {
                            const anyItem = item as any;
                            trackLive(anyItem.stream_id || anyItem.id, anyItem.name, anyItem.stream_icon || anyItem.cover, anyItem);
                            hasTrackedLiveRef.current = true;
                        }
                        if (!isLive && resumePosition > 0 && !hasSeeked && videoRef.current) {
                            videoRef.current.seek(Math.max(0, resumePosition));
                            setHasSeeked(true);
                            setCurrentTime(resumePosition);
                        }
                        setIsBuffering(false);
                        setRetryCount(0);
                    }}
                    onBuffer={({ isBuffering: buffering }) => setIsBuffering(buffering)}
                    onProgress={({ currentTime: time, playableDuration: playable }) => {
                        if (!isScrubbing) {
                            setCurrentTime(time);
                        }
                        if (typeof playable === 'number') {
                            setPlayableDuration(playable);
                        }
                        handleProgress(time);
                    }}
                    onEnd={() => {
                        if (!isLive) {
                            setPaused(true);
                        }
                    }}
                />
            )}

            {!controlsLocked && !showOverlay && (
                <TVPlayerFocusLayer
                    controlsLocked={controlsLocked}
                    showOverlay={showOverlay}
                    isHudVisible={isHudVisible}
                    focusTrapRef={focusTrapRef}
                    setFocusedElement={setFocusedElement}
                    showHUD={showHUD}
                    handleSeekBy={handleSeekBy}
                    progressPressableRef={progressPressableRef}
                    playPauseRef={playPauseRef}
                    focusedElement={focusedElement}
                />
            )}

            {!controlsLocked && !showOverlay && isHudVisible && (
                <View style={styles.controlsOverlay} pointerEvents="box-none">
                    <TVPlayerTopBar
                        navigation={navigation}
                        item={item}
                        type={type}
                        focusedElement={focusedElement}
                        setFocusedElement={setFocusedElement}
                        setControlsLocked={setControlsLocked}
                        setShowStats={setShowStats}
                        setShowSettings={setShowSettings}
                        showHUD={showHUD}
                        isHudVisible={isHudVisible}
                        backButtonRef={backButtonRef}
                        lockButtonRef={lockButtonRef}
                        playPauseRef={playPauseRef}
                    />

                    <TVPlayerCenterControls
                        isLive={isLive}
                        paused={paused}
                        setPaused={setPaused}
                        focusedElement={focusedElement}
                        setFocusedElement={setFocusedElement}
                        handleSeekBy={handleSeekBy}
                        showHUD={showHUD}
                        isHudVisible={isHudVisible}
                        playPauseRef={playPauseRef}
                        progressPressableRef={progressPressableRef}
                        lockButtonRef={lockButtonRef}
                    />

                    <TVPlayerBottomControls
                        isLive={isLive}
                        duration={duration}
                        currentTime={currentTime}
                        playableDuration={playableDuration}
                        isScrubbing={isScrubbing}
                        scrubTime={scrubTime}
                        focusedElement={focusedElement}
                        setFocusedElement={setFocusedElement}
                        showHUD={showHUD}
                        progressPressableRef={progressPressableRef}
                        setProgressBarWidth={setProgressBarWidth}
                        panResponder={panResponder}
                        playPauseRef={playPauseRef}
                    />
                </View>
            )}

            {controlsLocked && !showOverlay && (
                <View style={styles.lockOverlay}>
                    <Pressable style={styles.lockButton} onPress={() => setControlsLocked(false)}>
                        <Icon name="lock" size={scale(28)} color={colors.textPrimary} />
                        <Text style={styles.lockText}>Unlock Controls</Text>
                    </Pressable>
                </View>
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
                    <Pressable
                        style={styles.button}
                        onPress={() => navigation.goBack()}
                        hasTVPreferredFocus
                    >
                        <Text style={styles.buttonText}>Go Back</Text>
                    </Pressable>
                    {streamUrl && (
                        <Pressable
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
                        </Pressable>
                    )}
                </View>
            )}

            {/* Stats Overlay */}
            {showStats && !showOverlay && (
                <View style={styles.statsOverlay} pointerEvents="none">
                    <Text style={styles.statsText}>Resolution: {selectedQualityLabel}</Text>
                    <Text style={styles.statsText}>Rate: {playbackRate}x</Text>
                    <Text style={styles.statsText}>Muted: {isMuted ? 'Yes' : 'No'}</Text>
                </View>
            )}

            <TVPlayerSettingsModal
                showSettings={showSettings}
                settingsView={settingsView}
                setSettingsView={setSettingsView}
                handleSettingsClose={handleSettingsClose}
                selectedQualityLabel={selectedQualityLabel}
                selectedAudioLabel={selectedAudioLabel}
                selectedSubtitleLabel={selectedSubtitleLabel}
                playbackRate={playbackRate}
                resizeMode={resizeMode}
                isMuted={isMuted}
                repeatEnabled={repeatEnabled}
                showStats={showStats}
                setIsMuted={setIsMuted}
                setRepeatEnabled={setRepeatEnabled}
                setShowStats={setShowStats}
                setSelectedVideoTrack={setSelectedVideoTrack}
                setSelectedAudioTrack={setSelectedAudioTrack}
                setSelectedTextTrack={setSelectedTextTrack}
                setPlaybackRate={setPlaybackRate}
                setResizeMode={setResizeMode}
                qualityOptions={qualityOptions}
                audioOptions={audioOptions}
                subtitleOptions={subtitleOptions}
                selectedVideoTrack={selectedVideoTrack}
                selectedAudioTrack={selectedAudioTrack}
                selectedTextTrack={selectedTextTrack}
            />
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
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: scale(48),
        paddingVertical: scale(40),
    },

    liveBadgeText: {
        color: colors.textPrimary,
        fontSize: scaleFont(16),
        fontWeight: '700',
    },
    centerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    loadingText: {
        color: '#FFF',
        marginTop: scale(20),
        fontSize: scaleFont(18),
    },
    errorText: {
        color: '#FF4444',
        fontSize: scaleFont(22),
        marginBottom: scale(20),
        fontWeight: 'bold',
    },
    button: {
        paddingHorizontal: scale(28),
        paddingVertical: scale(14),
        backgroundColor: '#333',
        borderRadius: scale(10),
        marginTop: scale(12),
    },
    retryButton: {
        backgroundColor: '#444',
    },
    buttonText: {
        color: '#FFF',
        fontSize: scaleFont(18),
    },
    statsOverlay: {
        position: 'absolute',
        top: scale(40),
        right: scale(40),
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: scale(16),
        borderRadius: scale(12),
        gap: scale(6),
    },
    statsText: {
        color: colors.textPrimary,
        fontSize: scaleFont(16),
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    lockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: scale(28),
        paddingVertical: scale(14),
        borderRadius: scale(12),
    },
    lockText: {
        color: colors.textPrimary,
        fontSize: scaleFont(18),
        fontWeight: '600',
    },
});

export default TVPlayerScreen;
