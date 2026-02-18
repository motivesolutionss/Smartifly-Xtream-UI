import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
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
import { colors, spacing, Icon } from '../../theme';
import useStore from '../../store';
import { logger } from '../../config';
import { useTrackProgress } from '../../store/watchHistoryStore';
import useDownloadStore from '../../store/downloadStore';

const SEEK_STEP_SECONDS = 15;
const AUTO_HIDE_DELAY_MS = 3500;

const formatTime = (value: number) => {
    const totalSeconds = Math.max(0, Math.floor(value || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

type ParamList = {
    Player: {
        type: 'live' | 'movie' | 'series';
        item: any;
        episodeUrl?: string;
        resumePosition?: number;
    };
};

type SettingsView = 'root' | 'quality' | 'audio' | 'subtitles' | 'speed' | 'aspect';

type TrackOption = {
    key: string;
    label: string;
    description?: string;
};

const PlayerScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ParamList, 'Player'>>();
    const { type, item, episodeUrl } = route.params;
    const resumePosition = route.params.resumePosition ?? 0;
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const { trackMovie, trackEpisode, trackLive } = useTrackProgress();
    const downloads = useDownloadStore((state) => state.downloads);
    const api = getXtreamAPI();

    const isLive = type === 'live';

    // Refs and state
    const videoRef = useRef<VideoRef>(null);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('Playback failed');
    const durationRef = useRef(0);
    const lastProgressUpdateRef = useRef(0);
    const [hasSeeked, setHasSeeked] = useState(false);
    const hasTrackedLiveRef = useRef(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasPlayingRef = useRef(false);

    const [paused, setPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playableDuration, setPlayableDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsView, setSettingsView] = useState<SettingsView>('root');
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');
    const [isMuted, setIsMuted] = useState(false);
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [controlsLocked, setControlsLocked] = useState(false);

    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
    const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
    const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<SelectedTrack>({ type: SelectedTrackType.SYSTEM });
    const [selectedTextTrack, setSelectedTextTrack] = useState<SelectedTrack>({ type: SelectedTrackType.DISABLED });
    const [selectedVideoTrack, setSelectedVideoTrack] = useState<SelectedVideoTrack>({
        type: SelectedVideoTrackType.AUTO,
    });

    const download = useMemo(
        () => downloads.find(d => d.id === String(item.stream_id || item.id)),
        [downloads, item.stream_id, item.id]
    );

    const streamUrl = useMemo(() => {
        if (!api) return '';

        if (download && download.status === 'completed' && download.localPath) {
            const url = `file://${download.localPath}`;
            logger.info('Playing from local download', { id: download.id, path: download.localPath });
            return url;
        }

        if (type === 'live') {
            const url = api.getLiveStreamUrl(item.stream_id, 'm3u8');
            logger.debug('Live stream prepared', { streamId: item.stream_id, hasUrl: !!url });
            return url;
        }

        if (type === 'movie') {
            const extension = item.container_extension || 'mp4';
            const url = api.getVodStreamUrl(item.stream_id, extension);
            logger.debug('Movie stream prepared', { streamId: item.stream_id, extension, hasUrl: !!url });
            return url;
        }

        if (episodeUrl) {
            logger.debug('Series episode selected', { hasEpisodeUrl: !!episodeUrl });
            return episodeUrl;
        }

        return '';
    }, [api, download, episodeUrl, item, type]);

    useEffect(() => {
        setHasSeeked(false);
    }, [item, resumePosition]);

    useEffect(() => {
        if (!api) {
            navigation.goBack();
        }
    }, [api, navigation]);

    useEffect(() => {
        StatusBar.setHidden(true);
        return () => {
            StatusBar.setHidden(false);
        };
    }, []);

    useEffect(() => {
        return () => {
            logger.debug('Player unmounted, cleaning up');
        };
    }, []);

    const clearHideTimeout = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    }, []);

    const scheduleHideControls = useCallback(() => {
        if (Platform.isTV || controlsLocked || showSettings || paused) return;
        clearHideTimeout();
        hideTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, AUTO_HIDE_DELAY_MS);
    }, [clearHideTimeout, controlsLocked, paused, showSettings]);

    const showControlsNow = useCallback(() => {
        if (controlsLocked) return;
        setShowControls(true);
        scheduleHideControls();
    }, [controlsLocked, scheduleHideControls]);

    useEffect(() => {
        if (showControls) {
            scheduleHideControls();
        }
        return () => clearHideTimeout();
    }, [showControls, scheduleHideControls, clearHideTimeout]);

    const handleProgressTracking = (time: number) => {
        const now = Date.now();
        if (now - lastProgressUpdateRef.current < 5000) return;
        lastProgressUpdateRef.current = now;

        const total = durationRef.current;
        if (type === 'movie' && total > 0) {
            trackMovie(
                item.stream_id || item.id,
                item.name,
                time,
                total,
                item.stream_icon || item.cover,
                item
            );
        } else if (type === 'series' && total > 0) {
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
                time,
                total,
                item.info?.movie_image || item.stream_icon || item.cover,
                item
            );
        }
    };

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
            showControlsNow();
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
    }), [beginScrub, duration, endScrub, isLive, progressBarWidth, showControlsNow]);

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
        showControlsNow();
    };

    const renderSettingsHeader = (title: string) => (
        <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={() => setSettingsView('root')} style={styles.settingsBack}>
                <Icon name="chevronLeft" size={18} color={colors.textPrimary} />
                <Text style={styles.settingsHeaderText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>{title}</Text>
        </View>
    );

    const renderSettingsOption = (
        option: TrackOption,
        isSelected: boolean,
        onPress: () => void
    ) => (
        <TouchableOpacity key={option.key} style={styles.settingsOption} onPress={onPress}>
            <View style={styles.settingsOptionText}>
                <Text style={styles.settingsOptionLabel}>{option.label}</Text>
                {option.description ? (
                    <Text style={styles.settingsOptionDescription}>{option.description}</Text>
                ) : null}
            </View>
            {isSelected ? <Icon name="check" size={18} color={colors.primary} /> : null}
        </TouchableOpacity>
    );

    if (!api) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Video Player */}
            <Video
                ref={videoRef}
                source={{ uri: streamUrl }}
                style={styles.video}
                controls={false}
                resizeMode={resizeMode}
                repeat={isLive || repeatEnabled}
                muted={isMuted}
                paused={paused}
                rate={playbackRate}
                selectedAudioTrack={selectedAudioTrack}
                selectedTextTrack={selectedTextTrack}
                selectedVideoTrack={selectedVideoTrack}
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
                    setErrorMessage('Playback failed');
                }}
                onLoad={(data: OnLoadData) => {
                    logger.debug('Video loaded', {
                        duration: data.duration,
                        hasAudio: data.audioTracks?.length > 0,
                    });
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
                        trackLive(item.stream_id || item.id, item.name, item.stream_icon || item.cover, item);
                        hasTrackedLiveRef.current = true;
                    }
                    if (!isLive && resumePosition > 0 && !hasSeeked && videoRef.current) {
                        videoRef.current.seek(resumePosition);
                        setHasSeeked(true);
                        setCurrentTime(resumePosition);
                    }
                    setIsBuffering(false);
                }}
                onProgress={({ currentTime: time, playableDuration: playable }) => {
                    if (!isScrubbing) {
                        setCurrentTime(time);
                    }
                    if (typeof playable === 'number') {
                        setPlayableDuration(playable);
                    }
                    handleProgressTracking(time);
                }}
                onBuffer={({ isBuffering: buffering }) => {
                    setIsBuffering(buffering);
                }}
                onEnd={() => {
                    if (!isLive) {
                        setPaused(true);
                        setShowControls(true);
                    }
                }}
                onAudioBecomingNoisy={() => logger.debug('Audio becoming noisy')}
                onAudioFocusChanged={(e) => logger.debug('Audio focus changed', e)}
            />

            {/* Tap to show controls */}
            {!showControls && !controlsLocked && (
                <Pressable style={StyleSheet.absoluteFillObject} onPress={showControlsNow} />
            )}

            {/* Controls Overlay */}
            {showControls && !controlsLocked && (
                <View style={styles.controlsOverlay} pointerEvents="box-none">
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowControls(false)} />

                    {/* Top Bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.topButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="back" size={20} color={colors.textPrimary} />
                        </TouchableOpacity>

                        <View style={styles.titleBlock}>
                            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                            {type === 'series' && item.episodeTitle ? (
                                <Text style={styles.subtitle} numberOfLines={1}>{item.episodeTitle}</Text>
                            ) : null}
                        </View>

                        <View style={styles.topActions}>
                            <TouchableOpacity
                                style={styles.topButton}
                                onPress={() => setControlsLocked(true)}
                            >
                                <Icon name="lock" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.topButton}
                                onPress={() => setShowStats(prev => !prev)}
                            >
                                <Icon name="info" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.topButton}
                                onPress={() => setShowSettings(true)}
                            >
                                <Icon name="settings" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Center Controls */}
                    <View style={styles.centerControls}>
                        <TouchableOpacity
                            style={styles.seekButton}
                            onPress={() => handleSeekBy(-SEEK_STEP_SECONDS)}
                            disabled={isLive}
                        >
                            <Icon name="arrowLeft" size={24} color={isLive ? colors.textMuted : colors.textPrimary} />
                            <Text style={styles.seekLabel}>15s</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.playPauseButton}
                            onPress={() => {
                                setPaused(prev => !prev);
                                showControlsNow();
                            }}
                        >
                            <Icon name={paused ? 'play' : 'pause'} size={32} color={colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.seekButton}
                            onPress={() => handleSeekBy(SEEK_STEP_SECONDS)}
                            disabled={isLive}
                        >
                            <Icon name="arrowRight" size={24} color={isLive ? colors.textMuted : colors.textPrimary} />
                            <Text style={styles.seekLabel}>15s</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.bottomControls}>
                        <View style={styles.timeRow}>
                            {isLive ? (
                                <View style={styles.liveBadge}>
                                    <Text style={styles.liveBadgeText}>LIVE</Text>
                                </View>
                            ) : (
                                <Text style={styles.timeText}>{formatTime(progressTime)}</Text>
                            )}
                            {!isLive && (
                                <Text style={styles.timeText}>-{formatTime(Math.max(duration - progressTime, 0))}</Text>
                            )}
                        </View>

                        {!isLive && (
                            <View
                                style={styles.progressContainer}
                                onLayout={(event) => setProgressBarWidth(event.nativeEvent.layout.width)}
                                {...panResponder.panHandlers}
                            >
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressBuffered, { width: `${bufferPercent * 100}%` }]} />
                                    <View style={[styles.progressPlayed, { width: `${progressPercent * 100}%` }]} />
                                </View>
                                <View style={[styles.progressThumb, { left: `${progressPercent * 100}%` }]} />
                                {isScrubbing && (
                                    <View style={styles.scrubTimeBubble}>
                                        <Text style={styles.scrubTimeText}>{formatTime(scrubTime)}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Locked Overlay */}
            {controlsLocked && (
                <View style={styles.lockOverlay}>
                    <TouchableOpacity style={styles.lockButton} onPress={() => setControlsLocked(false)}>
                        <Icon name="lock" size={20} color={colors.textPrimary} />
                        <Text style={styles.lockText}>Unlock Controls</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Buffering UI */}
            {isBuffering && !hasError && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.overlayText}>Buffering...</Text>
                </View>
            )}

            {/* Error UI */}
            {hasError && (
                <View style={styles.overlay}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setHasError(false);
                            setIsBuffering(true);
                            setErrorMessage('Playback failed');
                        }}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Stats Overlay */}
            {showStats && (
                <View style={styles.statsOverlay} pointerEvents="none">
                    <Text style={styles.statsText}>Resolution: {selectedQualityLabel}</Text>
                    <Text style={styles.statsText}>Rate: {playbackRate}x</Text>
                    <Text style={styles.statsText}>Muted: {isMuted ? 'Yes' : 'No'}</Text>
                </View>
            )}

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                transparent
                animationType="fade"
                onRequestClose={handleSettingsClose}
            >
                <Pressable style={styles.modalBackdrop} onPress={handleSettingsClose} />
                <View style={styles.settingsSheet}>
                    {settingsView === 'root' && (
                        <View>
                            <Text style={styles.settingsTitle}>Player Settings</Text>

                            <TouchableOpacity style={styles.settingsRow} onPress={() => setSettingsView('quality')}>
                                <Text style={styles.settingsRowLabel}>Quality</Text>
                                <Text style={styles.settingsRowValue}>{selectedQualityLabel}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingsRow} onPress={() => setSettingsView('audio')}>
                                <Text style={styles.settingsRowLabel}>Audio</Text>
                                <Text style={styles.settingsRowValue}>{selectedAudioLabel}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingsRow} onPress={() => setSettingsView('subtitles')}>
                                <Text style={styles.settingsRowLabel}>Subtitles</Text>
                                <Text style={styles.settingsRowValue}>{selectedSubtitleLabel}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingsRow} onPress={() => setSettingsView('speed')}>
                                <Text style={styles.settingsRowLabel}>Speed</Text>
                                <Text style={styles.settingsRowValue}>{playbackRate}x</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingsRow} onPress={() => setSettingsView('aspect')}>
                                <Text style={styles.settingsRowLabel}>Aspect</Text>
                                <Text style={styles.settingsRowValue}>{resizeMode}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingsRow} onPress={() => setIsMuted(prev => !prev)}>
                                <Text style={styles.settingsRowLabel}>Mute</Text>
                                <Text style={styles.settingsRowValue}>{isMuted ? 'On' : 'Off'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingsRow} onPress={() => setRepeatEnabled(prev => !prev)}>
                                <Text style={styles.settingsRowLabel}>Repeat</Text>
                                <Text style={styles.settingsRowValue}>{repeatEnabled ? 'On' : 'Off'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingsRow} onPress={() => setShowStats(prev => !prev)}>
                                <Text style={styles.settingsRowLabel}>Stats Overlay</Text>
                                <Text style={styles.settingsRowValue}>{showStats ? 'On' : 'Off'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {settingsView === 'quality' && (
                        <View>
                            {renderSettingsHeader('Quality')}
                            {renderSettingsOption(
                                { key: 'quality-auto', label: 'Auto' },
                                selectedVideoTrack.type === SelectedVideoTrackType.AUTO,
                                () => setSelectedVideoTrack({ type: SelectedVideoTrackType.AUTO })
                            )}
                            {qualityOptions.map((option) => renderSettingsOption(
                                option,
                                selectedVideoTrack.type === SelectedVideoTrackType.INDEX &&
                                option.key === `quality-${selectedVideoTrack.value}`,
                                () => setSelectedVideoTrack({ type: SelectedVideoTrackType.INDEX, value: Number(option.key.split('-')[1]) })
                            ))}
                        </View>
                    )}

                    {settingsView === 'audio' && (
                        <View>
                            {renderSettingsHeader('Audio')}
                            {renderSettingsOption(
                                { key: 'audio-system', label: 'System Default' },
                                selectedAudioTrack.type === SelectedTrackType.SYSTEM,
                                () => setSelectedAudioTrack({ type: SelectedTrackType.SYSTEM })
                            )}
                            {audioOptions.map((option) => renderSettingsOption(
                                option,
                                selectedAudioTrack.type === SelectedTrackType.INDEX &&
                                option.key === `audio-${selectedAudioTrack.value}`,
                                () => setSelectedAudioTrack({ type: SelectedTrackType.INDEX, value: Number(option.key.split('-')[1]) })
                            ))}
                        </View>
                    )}

                    {settingsView === 'subtitles' && (
                        <View>
                            {renderSettingsHeader('Subtitles')}
                            {renderSettingsOption(
                                { key: 'sub-off', label: 'Off' },
                                selectedTextTrack.type === SelectedTrackType.DISABLED,
                                () => setSelectedTextTrack({ type: SelectedTrackType.DISABLED })
                            )}
                            {renderSettingsOption(
                                { key: 'sub-system', label: 'System Default' },
                                selectedTextTrack.type === SelectedTrackType.SYSTEM,
                                () => setSelectedTextTrack({ type: SelectedTrackType.SYSTEM })
                            )}
                            {subtitleOptions.map((option) => renderSettingsOption(
                                option,
                                selectedTextTrack.type === SelectedTrackType.INDEX &&
                                option.key === `sub-${selectedTextTrack.value}`,
                                () => setSelectedTextTrack({ type: SelectedTrackType.INDEX, value: Number(option.key.split('-')[1]) })
                            ))}
                        </View>
                    )}

                    {settingsView === 'speed' && (
                        <View>
                            {renderSettingsHeader('Speed')}
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => renderSettingsOption(
                                { key: `speed-${rate}`, label: `${rate}x` },
                                playbackRate === rate,
                                () => setPlaybackRate(rate)
                            ))}
                        </View>
                    )}

                    {settingsView === 'aspect' && (
                        <View>
                            {renderSettingsHeader('Aspect')}
                            {renderSettingsOption(
                                { key: 'aspect-contain', label: 'Fit (Contain)' },
                                resizeMode === 'contain',
                                () => setResizeMode('contain')
                            )}
                            {renderSettingsOption(
                                { key: 'aspect-cover', label: 'Fill (Cover)' },
                                resizeMode === 'cover',
                                () => setResizeMode('cover')
                            )}
                            {renderSettingsOption(
                                { key: 'aspect-stretch', label: 'Stretch' },
                                resizeMode === 'stretch',
                                () => setResizeMode('stretch')
                            )}
                        </View>
                    )}
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
    video: {
        width: '100%',
        height: '100%',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    titleBlock: {
        flex: 1,
        marginHorizontal: spacing.sm,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    topButton: {
        backgroundColor: colors.overlayLight,
        padding: spacing.sm,
        borderRadius: 8,
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.lg,
    },
    seekButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
    },
    seekLabel: {
        color: colors.textPrimary,
        fontSize: 12,
        marginTop: 4,
    },
    playPauseButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.overlayLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomControls: {
        gap: spacing.sm,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timeText: {
        color: colors.textPrimary,
        fontSize: 12,
    },
    progressContainer: {
        height: 32,
        justifyContent: 'center',
    },
    progressTrack: {
        height: 4,
        backgroundColor: colors.overlayLight,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBuffered: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    progressPlayed: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.primary,
    },
    progressThumb: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
        marginLeft: -6,
    },
    scrubTimeBubble: {
        position: 'absolute',
        top: -24,
        alignSelf: 'flex-start',
        backgroundColor: colors.overlayLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    scrubTimeText: {
        color: colors.textPrimary,
        fontSize: 10,
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
    statsOverlay: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        backgroundColor: colors.overlayLight,
        padding: spacing.sm,
        borderRadius: 8,
        gap: 4,
    },
    statsText: {
        color: colors.textPrimary,
        fontSize: 12,
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
        gap: spacing.sm,
        backgroundColor: colors.overlayLight,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 8,
    },
    lockText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    settingsSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        padding: spacing.lg,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        gap: spacing.md,
    },
    settingsTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    settingsRowLabel: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    settingsRowValue: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    settingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    settingsBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    settingsHeaderText: {
        color: colors.textPrimary,
        fontSize: 14,
    },
    settingsOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
    },
    settingsOptionText: {
        flex: 1,
    },
    settingsOptionLabel: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    settingsOptionDescription: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
});

export default PlayerScreen;
