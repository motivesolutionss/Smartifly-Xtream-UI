/**
 * TV Player Screen
 *
 * Feature-rich video player optimized for Android TV / Fire TV.
 * Custom controls with D-pad friendly layout.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import { useNetInfo } from '@react-native-community/netinfo';
import useStore from '@smartifly/shared/src/store';
import { colors, scale, scaleFont, Icon } from '../../theme';
import { logger } from '../../config';
import { RootStackParamList } from '../../navigation/types';
import { useTrackProgress } from '@smartifly/shared/src/store/watchHistoryStore';
import useTVBackHandler from '../../utils/useTVBackHandler';
import useDownloadStore from '@smartifly/shared/src/store/downloadStore';
import { useTheme } from '../../theme/ThemeProvider';

// Components
import TVPlayerTopBar from './components/TVPlayerTopBar';
import TVPlayerCenterControls from './components/TVPlayerCenterControls';
import TVPlayerBottomControls from './components/TVPlayerBottomControls';
import TVPlayerFocusLayer from './components/TVPlayerFocusLayer';
import TVPlayerSettingsModal from './components/TVPlayerSettingsModal';

type TVPlayerScreenRouteProp = RouteProp<RootStackParamList, 'FullscreenPlayer'>;

type SettingsView = 'root' | 'quality' | 'audio' | 'subtitles' | 'speed' | 'aspect';

const TVPlayerScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<TVPlayerScreenRouteProp>();
    const { colors: themeColors } = useTheme();


    // Params might come from FullscreenPlayer or just Player depending on how we route
    const { type, item, episodeUrl } = (route.params as any) || {};
    const resumePosition = route.params?.resumePosition ?? 0;

    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const liveChannels = useStore((state) => state.content.live.items);
    const { trackMovie, trackEpisode, trackLive } = useTrackProgress();
    const downloads = useDownloadStore((state) => state.downloads);
    const netInfo = useNetInfo();

    const isLive = type === 'live';
    const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
    const mediaItem = item as any;
    const downloadSearchId = useMemo(
        () => String(mediaItem?.stream_id || mediaItem?.id || ''),
        [mediaItem?.id, mediaItem?.stream_id]
    );
    const localDownload = useMemo(
        () => downloads.find((download) => download.id === downloadSearchId),
        [downloadSearchId, downloads]
    );

    // Refs and state
    const videoRef = useRef<VideoRef>(null);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [canRetryOverlay, setCanRetryOverlay] = useState(false);
    const [streamUrl, setStreamUrl] = useState<string>('');
    const [videoKey, setVideoKey] = useState(0);
    const [hasSeeked, setHasSeeked] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const retryTimeoutRef = useRef<any>(null);
    const durationRef = useRef(0);
    const lastProgressUpdateRef = useRef(0);
    const hasTrackedLiveRef = useRef(false);
    const scrubTimerRef = useRef<any>(null);

    const [paused, setPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playableDuration, setPlayableDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsView, setSettingsView] = useState<SettingsView>('root');
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>(
        isLive ? 'stretch' : 'contain'
    );
    const [isMuted, setIsMuted] = useState(false);
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [controlsLocked, setControlsLocked] = useState(false);
    const [isHudVisible, setIsHudVisible] = useState(false);
    const [focusedElement, setFocusedElement] = useState<string | null>(null);
    const hudTimerRef = useRef<any>(null);
    const progressPressableRef = useRef<any>(null);
    const focusTrapRef = useRef<any>(null);
    const playPauseRef = useRef<any>(null);
    const backButtonRef = useRef<any>(null);
    const lockButtonRef = useRef<any>(null);
    const errorGoBackRef = useRef<any>(null);
    const errorRetryRef = useRef<any>(null);
    const hasHandledInitialPauseEffectRef = useRef(false);
    const [focusedErrorButton, setFocusedErrorButton] = useState<'goBack' | 'retry' | null>(null);

    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
    const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
    const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<SelectedTrack>({ type: SelectedTrackType.SYSTEM });
    const [selectedTextTrack, setSelectedTextTrack] = useState<SelectedTrack>({ type: SelectedTrackType.DISABLED });
    const [selectedVideoTrack, setSelectedVideoTrack] = useState<SelectedVideoTrack>({
        type: SelectedVideoTrackType.AUTO,
    });
    const pausedRef = useRef(paused);
    const showSettingsRef = useRef(showSettings);
    const controlsLockedRef = useRef(controlsLocked);

    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
        showSettingsRef.current = showSettings;
    }, [showSettings]);

    useEffect(() => {
        controlsLockedRef.current = controlsLocked;
    }, [controlsLocked]);

    const bufferConfig = useMemo(
        () => (
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
        ),
        [isLive]
    );

    // HUD Visibility Management
    const showHUD = useCallback(() => {
        setIsHudVisible(true);
        if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
        hudTimerRef.current = setTimeout(() => {
            if (!pausedRef.current && !showSettingsRef.current && !controlsLockedRef.current) {
                setIsHudVisible(false);
            }
        }, 2000);
    }, []);

    useEffect(() => {
        return () => {
            if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!showOverlay) return;
        const timer = setTimeout(() => {
            errorGoBackRef.current?.focus?.();
        }, 80);
        return () => clearTimeout(timer);
    }, [showOverlay]);

    // React to pause state
    useEffect(() => {
        if (!hasHandledInitialPauseEffectRef.current) {
            hasHandledInitialPauseEffectRef.current = true;
            return;
        }
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
        if (showOverlay) {
            navigation.goBack();
            return true;
        }
        if (isHudVisible) {
            setIsHudVisible(false);
            return true;
        }
        navigation.goBack();
        return true;
    });

    const handleProgress = useCallback((current: number) => {
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
    }, [item, trackEpisode, trackMovie, type]);

    const handleRetry = useCallback(() => {
        const nextRetry = retryCount + 1;
        if (nextRetry > 5) {
            setOverlayMessage(
                isOffline
                    ? 'No internet connection. Please check your network and try again.'
                    : isLive
                        ? 'This live stream is currently unavailable from the server.'
                        : 'This stream is currently unavailable from the server.'
            );
            setCanRetryOverlay(true);
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
            retryTimeoutRef.current = null;
        }, delay);
    }, [isLive, isOffline, retryCount]);

    // Prepare Stream URL
    useEffect(() => {
        setIsBuffering(true);
        setHasError(false);
        setShowOverlay(false);
        setCanRetryOverlay(false);
        setOverlayMessage(null);
        setStreamUrl('');
        setHasSeeked(false);

        const api = getXtreamAPI();
        if (!api || !item) {
            setOverlayMessage('Missing player session');
            setCanRetryOverlay(false);
            setShowOverlay(true);
            setIsBuffering(false);
            return;
        }

        let url = '';
        try {
            logger.debug('TVPlayer: Checking for local download', {
                searchId: downloadSearchId,
                item_stream_id: mediaItem.stream_id,
                item_id: mediaItem.id,
                downloadsCount: downloads.length,
            });

            if (localDownload && localDownload.status === 'completed' && localDownload.localPath) {
                url = `file://${localDownload.localPath}`;
                logger.info('TVPlayer: Playing from local download', {
                    id: localDownload.id,
                    path: localDownload.localPath,
                    url,
                });
            } else if (type === 'live') {
                url = api.getLiveStreamUrl(mediaItem.stream_id || mediaItem.id, 'ts');
                logger.debug('TVPlayer: Live stream prepared', { id: mediaItem.stream_id, format: 'ts' });
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
            setCanRetryOverlay(true);
            setShowOverlay(true);
        }

        if (!url) {
            setOverlayMessage('Stream information is missing');
            setCanRetryOverlay(false);
            setShowOverlay(true);
            setIsBuffering(false);
            return;
        }

        setStreamUrl(url);
    }, [
        downloadSearchId,
        downloads.length,
        episodeUrl,
        getXtreamAPI,
        item,
        localDownload?.id,
        localDownload?.localPath,
        localDownload?.status,
        mediaItem?.container_extension,
        mediaItem?.id,
        mediaItem?.stream_id,
        mediaItem?.url,
        type,
    ]);

    // Lifecycle cleanup
    useEffect(() => {
        StatusBar.setHidden(true);
        return () => {
            StatusBar.setHidden(false);
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
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
        const targetTime = Math.max(0, Math.min((isScrubbing ? scrubTime : currentTime) + delta, duration));
        setScrubTime(targetTime);
        setIsScrubbing(true);
        handleSeek(targetTime);

        if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
        scrubTimerRef.current = setTimeout(() => {
            setIsScrubbing(false);
        }, 900);
    }, [currentTime, duration, handleSeek, isLive, isScrubbing, scrubTime]);

    const currentLiveChannelIndex = useMemo(() => {
        if (!isLive || !Array.isArray(liveChannels) || liveChannels.length === 0) return -1;
        const currentId = String(mediaItem?.stream_id || mediaItem?.id || '');
        if (!currentId) return -1;
        return liveChannels.findIndex((ch: any) => String(ch.stream_id || ch.id) === currentId);
    }, [isLive, liveChannels, mediaItem?.id, mediaItem?.stream_id]);

    const handleLiveChannelStep = useCallback((delta: number) => {
        if (!isLive || !Array.isArray(liveChannels) || liveChannels.length === 0) return;
        if (currentLiveChannelIndex < 0) return;
        const nextIndex = (currentLiveChannelIndex + delta + liveChannels.length) % liveChannels.length;
        const nextChannel = liveChannels[nextIndex];
        if (!nextChannel) return;

        (navigation as any).replace('FullscreenPlayer', {
            type: 'live',
            item: nextChannel,
            suppressInitialHud: true,
        });
    }, [currentLiveChannelIndex, isLive, liveChannels, navigation]);


    // Progress percent is handled inside child components.

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

    const handleSettingsClose = useCallback(() => {
        setSettingsView('root');
        setShowSettings(false);
    }, []);

    const handleVideoError = useCallback((e: unknown) => {
        logger.error('TVPlayer: Playback error', e);
        if (isLive) {
            handleRetry();
        } else {
            setHasError(true);
            setIsBuffering(false);
            setOverlayMessage(
                isOffline
                    ? 'No internet connection. Please check your network and try again.'
                    : 'This stream is currently unavailable from the server.'
            );
            setCanRetryOverlay(true);
            setShowOverlay(true);
        }
    }, [handleRetry, isLive, isOffline]);

    const handleVideoLoad = useCallback((data: OnLoadData) => {
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
    }, [hasSeeked, isLive, item, resumePosition, trackLive]);

    const handleVideoBuffer = useCallback(({ isBuffering: buffering }: { isBuffering: boolean }) => {
        setIsBuffering(buffering);
    }, []);

    const handleVideoProgress = useCallback(({ currentTime: time, playableDuration: playable }: { currentTime: number; playableDuration: number }) => {
        if (!isScrubbing) {
            setCurrentTime(time);
        }
        if (typeof playable === 'number') {
            setPlayableDuration(playable);
        }
        handleProgress(time);
    }, [handleProgress, isScrubbing]);

    const handleVideoEnd = useCallback(() => {
        if (!isLive) {
            setPaused(true);
        }
    }, [isLive]);

    const handleOverlayRetry = useCallback(() => {
        setHasError(false);
        setShowOverlay(false);
        setCanRetryOverlay(false);
        setOverlayMessage(null);
        setRetryCount(0);
        setVideoKey((prev) => prev + 1);
        setIsBuffering(true);
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
                    controls={false}
                    resizeMode={resizeMode}
                    repeat={isLive || repeatEnabled}
                    paused={paused}
                    muted={isMuted}
                    rate={playbackRate}
                    selectedAudioTrack={selectedAudioTrack}
                    selectedTextTrack={selectedTextTrack}
                    selectedVideoTrack={selectedVideoTrack}
                    progressUpdateInterval={1000}
                    playInBackground={false}
                    playWhenInactive={false}
                    bufferConfig={bufferConfig}
                    onError={handleVideoError}
                    onLoad={handleVideoLoad}
                    onBuffer={handleVideoBuffer}
                    onProgress={handleVideoProgress}
                    onEnd={handleVideoEnd}
                />
            )}

            {!controlsLocked && !showOverlay && (
                <TVPlayerFocusLayer
                    isLive={isLive}
                    controlsLocked={controlsLocked}
                    showOverlay={showOverlay}
                    isHudVisible={isHudVisible}
                    focusTrapRef={focusTrapRef}
                    setFocusedElement={setFocusedElement}
                    showHUD={showHUD}
                    handleSeekBy={handleSeekBy}
                    handleLiveChannelStep={handleLiveChannelStep}
                    progressPressableRef={progressPressableRef}
                    playPauseRef={playPauseRef}
                    focusedElement={focusedElement}
                />
            )}

            {!controlsLocked && !showOverlay && isHudVisible && (
                <View style={[styles.controlsOverlay, { backgroundColor: themeColors.overlay }]} pointerEvents="box-none">
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
                        handleLiveChannelStep={handleLiveChannelStep}
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
                        playPauseRef={playPauseRef}
                        handleSeekBy={handleSeekBy}
                        handleLiveChannelStep={handleLiveChannelStep}
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
                        ref={errorGoBackRef}
                        style={[
                            styles.button,
                            focusedErrorButton === 'goBack' && styles.buttonFocused,
                        ]}
                        onPress={() => navigation.goBack()}
                        onFocus={() => setFocusedErrorButton('goBack')}
                        onBlur={() => setFocusedErrorButton(null)}
                        hasTVPreferredFocus
                    >
                        <Text style={[
                            styles.buttonText,
                            focusedErrorButton === 'goBack' && styles.buttonTextFocused,
                        ]}>Go Back</Text>
                    </Pressable>
                    {streamUrl && canRetryOverlay && (
                        <Pressable
                            ref={errorRetryRef}
                            style={[
                                styles.button,
                                styles.retryButton,
                                focusedErrorButton === 'retry' && styles.retryButtonFocused,
                            ]}
                            onPress={handleOverlayRetry}
                            onFocus={() => setFocusedErrorButton('retry')}
                            onBlur={() => setFocusedErrorButton(null)}
                        >
                            <Text style={[
                                styles.buttonText,
                                focusedErrorButton === 'retry' && styles.buttonTextFocused,
                            ]}>Retry</Text>
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
        backgroundColor: '#000000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        // Netflix bottom-heavy gradient
        backgroundColor: 'rgba(0,0,0,0.15)',
        paddingHorizontal: scale(48),
        paddingTop: scale(24),
        paddingBottom: scale(32),
    },
    centerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    loadingText: {
        color: '#999999',
        marginTop: scale(16),
        fontSize: scaleFont(16),
        fontWeight: '500',
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: scaleFont(22),
        marginBottom: scale(24),
        fontWeight: '600',
        textAlign: 'center',
    },
    button: {
        paddingHorizontal: scale(32),
        paddingVertical: scale(12),
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: scale(6),
        marginTop: scale(10),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    buttonFocused: {
        backgroundColor: 'rgba(255,255,255,0.26)',
        borderColor: '#FFFFFF',
        borderWidth: 2,
        transform: [{ scale: 1.06 }],
    },
    retryButton: {
        backgroundColor: '#E50914',
        borderColor: '#E50914',
    },
    retryButtonFocused: {
        backgroundColor: '#FF2A35',
        borderColor: '#FFFFFF',
        borderWidth: 2,
        transform: [{ scale: 1.06 }],
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: scaleFont(17),
        fontWeight: '600',
        textAlign: 'center',
    },
    buttonTextFocused: {
        textDecorationLine: 'underline',
    },
    statsOverlay: {
        position: 'absolute',
        top: scale(80),
        right: scale(40),
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: scale(16),
        borderRadius: scale(8),
        gap: scale(5),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    statsText: {
        color: '#999999',
        fontSize: scaleFont(14),
        fontWeight: '500',
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    lockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: scale(28),
        paddingVertical: scale(12),
        borderRadius: scale(24),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    lockText: {
        color: '#FFFFFF',
        fontSize: scaleFont(16),
        fontWeight: '500',
    },
});

export default TVPlayerScreen;
