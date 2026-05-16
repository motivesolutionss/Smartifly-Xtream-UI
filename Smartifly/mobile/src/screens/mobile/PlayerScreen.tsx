import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, colors, Icon, spacing } from '../../theme';
import useContentStore from '../../store/contentStore';
import useAuthStore from '../../store/authStore';
import { logger } from '../../config';
import { useTrackProgress } from '../../store/watchHistoryStore';
import useDownloadStore from '../../store/downloadStore';
import useFavoritesStore, { buildFavoriteKey, buildFavoritesScope, FavoriteKind } from '../../store/favoritesStore';
import {
    ENABLE_PLAYER_AXIS_FALLBACK_V1,
    ENABLE_PLAYER_IOS_LIVE_M3U8_VLC_FALLBACK_V1,
    ENABLE_PLAYER_MKV_STRICT_MODE_V1,
    ENABLE_PLAYER_RERESOLVE_ON_RETRY_V1,
    ENABLE_PLAYER_STREAM_MEMORY_V1,
    ENABLE_PLAYER_TIMEOUT_FALLBACK_V1,
    USE_IOS_ALT_ENGINE,
    USE_IOS_VLC,
} from '../../playerFlags';
import IOSPlaybackSurface, { isIOSPlaybackSurfaceEngineAvailable } from '../../components/IOSPlaybackSurface';
import { getLearnedPlaybackRoute, getPinnedPlaybackHost, isLearnedPlaybackEngineCoolingDown, markLearnedPlaybackEngineFailure, markLearnedPlaybackRouteFailure, saveLearnedPlaybackRoute } from '../../utils/playbackRouteStore';

const SEEK_STEP_SECONDS = 10;
const CHANNEL_STEP = 1;
const AUTO_HIDE_DELAY_MS = 3500;
const UI_UPDATE_THROTTLE_MS = 500;
const UI_UPDATE_THROTTLE_HIDDEN_MS = 2000;
const EMPTY_LIVE_CHANNELS: any[] = [];
const BUFFERING_TIMEOUT_MS = 30000;
const VLC_BUFFERING_TIMEOUT_MS = 120000;
const VLC_RESOLVE_TIMEOUT_MS = 8000;
const MAX_SILENT_RECOVERY_ATTEMPTS = 4;
const GLOBAL_PLAYBACK_DEADLINE_MS = 40000;
const MKV_STRICT_GLOBAL_PLAYBACK_DEADLINE_MS = 110000;
const STARTUP_STALL_WATCHDOG_MS = 12000;
const VLC_STARTUP_TIMEOUT_DEFAULT_MS = 32000;
const VLC_STARTUP_TIMEOUT_HEALTHY_MS = 90000;
const VLC_OPEN_NO_PROGRESS_RECOVERY_MS = 25000;
const VLC_ABSOLUTE_STUCK_GUARD_MS = 45000;
const VLC_ABSOLUTE_STUCK_MAX_RETRIES = 1;
// Temporary extreme profile to verify whether iOS VLC style options are honored.
const DEFAULT_SUBTITLE_FONT_SIZE = 28;
const DEFAULT_SUBTITLE_COLOR = '#FFFF00';
const DEFAULT_SUBTITLE_OUTLINE_COLOR = '#FF0000';
const DEFAULT_SUBTITLE_OUTLINE_WIDTH = 6;
const DEFAULT_SUBTITLE_BACKGROUND_COLOR = '';
const DEFAULT_SUBTITLE_BOTTOM_MARGIN = 80;

// Fallback extensions tried in order when a movie/episode fails to play.
// The first entry is the default; subsequent entries are silent retries.
const MOVIE_FALLBACK_EXTENSIONS = ['mp4', 'mkv', 'ts', 'avi', 'm4v'];
const LIVE_FALLBACK_FORMATS = ['m3u8', 'ts'];
const EMERGENCY_VLC_NON_MKV_ORDER = ['ts', 'mp4', 'm4v', 'avi'];
const HARD_LOCK_STREAM_IDS = new Set(['38573']);

const buildVODExtensionOrder = (baseExt: string, preferredExt?: string): string[] => {
    const seen = new Set<string>();
    const order: string[] = [];
    const pushExt = (value?: string) => {
        if (!value) return;
        const ext = value.toLowerCase();
        if (seen.has(ext)) return;
        seen.add(ext);
        order.push(ext);
    };
    pushExt(preferredExt);
    pushExt(baseExt);
    for (const ext of MOVIE_FALLBACK_EXTENSIONS) {
        pushExt(ext);
    }
    return order;
};

const appendCacheBust = (url: string, nonce: number): string => {
    if (!nonce) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}sf_retry=${nonce}`;
};

const clip = (value: unknown, max = 600): string => {
    const s = String(value ?? '');
    if (s.length <= max) return s;
    return `${s.slice(0, max)}...(truncated:${s.length})`;
};

const getHostFromUrl = (url: string): string | undefined => {
    try {
        if (!url) return undefined;
        const parsed = new URL(url) as unknown as { host?: string; hostname?: string; port?: string };
        const hostname = parsed.hostname || parsed.host?.split(':')[0];
        if (!hostname) return undefined;
        return parsed.port ? `${hostname}:${parsed.port}` : hostname;
    } catch {
        return undefined;
    }
};

const replaceUrlHost = (url: string, host: string): string => {
    try {
        const parsed = new URL(url) as unknown as URL & { hostname?: string; port?: string };
        const [hostname, port] = host.split(':');
        (parsed as any).hostname = hostname;
        (parsed as any).port = port || '';
        return parsed.toString();
    } catch {
        return url;
    }
};

const classifySubtitleControl = (tracks: TextTrack[] | undefined | null): {
    mode: 'no-tracks' | 'external-likely' | 'embedded-likely' | 'mixed-or-unknown';
    details: string[];
} => {
    if (!tracks || tracks.length === 0) {
        return { mode: 'no-tracks', details: [] };
    }
    const details: string[] = [];
    let externalHits = 0;
    let embeddedHits = 0;

    for (const track of tracks) {
        const title = String(track?.title ?? '').toLowerCase();
        const language = String(track?.language ?? '').toLowerCase();
        const textType = String((track as any)?.type ?? '').toLowerCase();
        const uri = String((track as any)?.uri ?? '').toLowerCase();
        const descriptor = `${title}|${language}|${textType}|${uri}`;
        details.push(descriptor);

        if (uri.endsWith('.srt') || uri.endsWith('.vtt') || textType.includes('srt') || textType.includes('vtt')) {
            externalHits += 1;
            continue;
        }
        if (textType.includes('tx3g') || textType.includes('cea') || textType.includes('subrip') || textType.includes('webvtt')) {
            embeddedHits += 1;
            continue;
        }
    }

    if (externalHits > 0 && embeddedHits === 0) return { mode: 'external-likely', details };
    if (embeddedHits > 0 && externalHits === 0) return { mode: 'embedded-likely', details };
    return { mode: 'mixed-or-unknown', details };
};

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
    FullscreenPlayer: {
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
type VlcSubtitleTrack = {
    id: number;
    name: string;
};

type PlaybackEngine = 'native' | 'ios_vlc' | 'ios_alt_engine';

const playbackEngineToRoutePlayer = (engine: PlaybackEngine): 'vlc' | 'native' => (
    engine === 'native' ? 'native' : 'vlc'
);

const determineSelectedPlaybackEngine = ({
    forcePlayer,
    enableIosLiveM3u8VlcFallback,
    isIosAltEngineEnabled,
    isIosVlcEnabled,
    isLive,
    isMkvStrictCandidate,
    learnedEngine,
    learnedEngineCoolingDown,
    learnedPlayer,
    type,
}: {
    forcePlayer: 'vlc' | 'native' | null;
    enableIosLiveM3u8VlcFallback: boolean;
    isIosAltEngineEnabled: boolean;
    isIosVlcEnabled: boolean;
    isLive: boolean;
    isMkvStrictCandidate: boolean;
    learnedEngine?: PlaybackEngine | null;
    learnedEngineCoolingDown: boolean;
    learnedPlayer?: 'vlc' | 'native' | null;
    type: 'live' | 'movie' | 'series';
}): PlaybackEngine => {
    if (forcePlayer === 'native') return 'native';
    // Preserve explicit native force; forcePlayer='vlc' means "use non-native path",
    // but for MKV-strict streams that must remain VLC-capable, keep ios_vlc routing.
    if (forcePlayer === 'vlc' && isIosAltEngineEnabled && !isLive && !isMkvStrictCandidate) return 'ios_alt_engine';
    if (forcePlayer === 'vlc') return isIosVlcEnabled && (!isLive || enableIosLiveM3u8VlcFallback) ? 'ios_vlc' : 'native';
    // AVPlayer-backed alt engine is for non-MKV paths; MKV-strict streams should stay on VLC.
    if (isMkvStrictCandidate) return isIosVlcEnabled && !isLive ? 'ios_vlc' : 'native';
    if (!isIosVlcEnabled || isLive) return 'native';
    if (ENABLE_PLAYER_STREAM_MEMORY_V1 && !learnedEngineCoolingDown && learnedEngine === 'native') return 'native';
    if (
        ENABLE_PLAYER_STREAM_MEMORY_V1 &&
        !learnedEngineCoolingDown &&
        learnedEngine === 'ios_alt_engine' &&
        isIosAltEngineEnabled &&
        !isMkvStrictCandidate &&
        !isLive
    ) return 'ios_alt_engine';
    if (ENABLE_PLAYER_STREAM_MEMORY_V1 && !learnedEngineCoolingDown && learnedEngine === 'ios_vlc') return 'ios_vlc';
    if (ENABLE_PLAYER_STREAM_MEMORY_V1 && !learnedEngineCoolingDown && learnedPlayer === 'native') return 'native';
    return type === 'movie' || type === 'series' ? 'ios_vlc' : 'native';
};

const PlayerScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<ParamList, 'FullscreenPlayer'>>();
    const { type, episodeUrl } = route.params;
    const resumePosition = route.params.resumePosition ?? 0;
    // Use local state for item so live channel changes don't trigger navigation
    const [item, setItem] = useState(route.params.item);
    const getXtreamAPI = useContentStore((state) => state.getXtreamAPI);
    const liveItemsCount = useContentStore((state) => (type === 'live' ? state.content.live.items.length : 0));
    const portalId = useAuthStore((state) => state.selectedPortal?.id ?? null);
    const username = useAuthStore((state) => state.userInfo?.username ?? null);
    const { trackMovie, trackEpisode, trackLive } = useTrackProgress();
    const downloads = useDownloadStore((state) => state.downloads);
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const api = getXtreamAPI();

    const isLive = type === 'live';
    const isIosVlcEnabled = Platform.OS === 'ios' && USE_IOS_VLC && isIOSPlaybackSurfaceEngineAvailable('ios_vlc');
    const isIosAltEngineEnabled = Platform.OS === 'ios' && USE_IOS_ALT_ENGINE && isIOSPlaybackSurfaceEngineAvailable('ios_alt_engine');
    const playbackScope = useMemo(
        () => `${String(portalId ?? 'none')}|${String(username ?? 'none')}`,
        [portalId, username]
    );
    const routeMemoryType = type === 'movie' || type === 'series' ? type : null;
    const routeMemoryStreamId = useMemo(() => {
        if (!routeMemoryType) return null;
        if (type === 'movie') return item?.stream_id ?? item?.id ?? null;
        return item?.id ?? item?.stream_id ?? null;
    }, [item, routeMemoryType, type]);
    const learnedRoute = useMemo(() => {
        if (!ENABLE_PLAYER_STREAM_MEMORY_V1 || !routeMemoryType || routeMemoryStreamId == null) return null;
        return getLearnedPlaybackRoute(playbackScope, routeMemoryType, routeMemoryStreamId);
    }, [playbackScope, routeMemoryStreamId, routeMemoryType]);
    const pinnedPlaybackHost = useMemo(() => {
        if (!ENABLE_PLAYER_STREAM_MEMORY_V1 || !routeMemoryType || routeMemoryStreamId == null) return null;
        return getPinnedPlaybackHost(playbackScope, routeMemoryType, routeMemoryStreamId);
    }, [playbackScope, routeMemoryStreamId, routeMemoryType]);
    const learnedEngineCoolingDown = useMemo(
        () => isLearnedPlaybackEngineCoolingDown(learnedRoute, learnedRoute?.engine ?? null),
        [learnedRoute]
    );
    const favoritesScope = useMemo(() => buildFavoritesScope(portalId, username), [portalId, username]);
    const favoriteDescriptor = useMemo(() => {
        const kind: FavoriteKind = type === 'live'
            ? 'live'
            : type === 'movie'
                ? 'movie'
                : episodeUrl
                    ? 'episode'
                    : 'series';
        const entityId = kind === 'episode'
            ? String(item?.id ?? item?.stream_id ?? `${item?.series_id ?? item?.seriesId ?? 'series'}-${item?.episode_num ?? item?.episodeNumber ?? item?.name ?? 'episode'}`)
            : String(item?.stream_id ?? item?.series_id ?? item?.id ?? item?.name ?? 'unknown');
        const key = buildFavoriteKey(favoritesScope, kind, entityId);
        return { kind, entityId, key };
    }, [episodeUrl, favoritesScope, item, type]);
    const isFavorite = useFavoritesStore(
        useCallback((state) => state.isFavorite(favoriteDescriptor.key), [favoriteDescriptor.key])
    );

    // Refs and state
    const videoRef = useRef<VideoRef>(null);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('Playback failed');
    const durationRef = useRef(0);
    const lastProgressUpdateRef = useRef(0);
    const lastUiUpdateRef = useRef(0);
    const hasPlaybackStartedRef = useRef(false);
    const [hasSeeked, setHasSeeked] = useState(false);
    const hasTrackedLiveRef = useRef(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasPlayingRef = useRef(false);
    const hasSavedRouteRef = useRef(false);

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
    const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('stretch');
    const [isMuted, setIsMuted] = useState(false);
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [controlsLocked, setControlsLocked] = useState(false);
    const [playerInstanceKey, setPlayerInstanceKey] = useState(0);
    const [forcePlayer, setForcePlayer] = useState<'vlc' | 'native' | null>(null);
    const [vlcResolveEpoch, setVlcResolveEpoch] = useState(0);
    const [mkvStrictUseResolvedUrl, setMkvStrictUseResolvedUrl] = useState(false);
    const [mkvStrictUrlNonce, setMkvStrictUrlNonce] = useState(0);
    const [allowMkvStrictExtensionFallback, setAllowMkvStrictExtensionFallback] = useState(false);
    const [vlcPreflightHealthy, setVlcPreflightHealthy] = useState(false);
    const [vlcOpenedAtMs, setVlcOpenedAtMs] = useState(0);
    const startupTimeoutSuppressedRef = useRef(0);
    const vlcOpenRecoveryUsedRef = useRef(false);
    const mkvPostNonMkvResolvedRetryUsedRef = useRef(false);

    // Fallback retry state — tracks which extension/format index we're currently trying
    const [extensionIndex, setExtensionIndex] = useState(0);
    const [liveFormatIndex, setLiveFormatIndex] = useState(0);
    // How many silent auto-retries have been attempted before showing the error UI
    const silentRetryCountRef = useRef(0);
    const hasSwitchedPlayerAxisRef = useRef(false);
    const sameRouteRetryRef = useRef<Record<string, number>>({});
    const startupStallHandledRef = useRef(false);

    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
    const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
    const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<SelectedTrack>({ type: SelectedTrackType.SYSTEM });
    const [selectedTextTrack, setSelectedTextTrack] = useState<SelectedTrack>({ type: SelectedTrackType.DISABLED });
    const [selectedVideoTrack, setSelectedVideoTrack] = useState<SelectedVideoTrack>({
        type: SelectedVideoTrackType.AUTO,
    });
    const [vlcSubtitleTracks, setVlcSubtitleTracks] = useState<VlcSubtitleTrack[]>([]);
    const [selectedVlcSubtitleTrackId, setSelectedVlcSubtitleTrackId] = useState(-2);
    const [vlcSeekTime, setVlcSeekTime] = useState(-1);
    const [vlcSeekTrigger, setVlcSeekTrigger] = useState(0);
    // Pre-resolved URL for VLC — follows redirects so VLC gets the final CDN URL
    // directly, avoiding MobileVLCKit redirect issues.
    const [vlcResolvedUrl, setVlcResolvedUrl] = useState('');
    const lockedHostRef = useRef<string | null>(null);
    const vlcState4RetryUsedRef = useRef(false);
    const lastVlcDebugRef = useRef<Record<string, unknown> | null>(null);

    const controlsOverlayInsetStyle = useMemo(() => ({
        paddingTop: insets.top + spacing.sm,
        paddingBottom: insets.bottom + spacing.sm,
    }), [insets.bottom, insets.top]);
    const statsOverlayInsetStyle = useMemo(() => ({
        top: insets.top + spacing.sm,
    }), [insets.top]);
    const settingsSheetInsetStyle = useMemo(() => ({
        left: isLandscape ? insets.left + spacing.base : 0,
        right: isLandscape ? insets.right + spacing.base : 0,
        paddingBottom: insets.bottom + spacing.base,
        paddingHorizontal: isLandscape ? spacing.lg : spacing.base * 2.5,
    }), [insets.bottom, insets.left, insets.right, isLandscape]);
    const settingsSheetOrientationStyle = useMemo(() => ({
        maxHeight: isLandscape ? '84%' : '72%',
        borderTopLeftRadius: isLandscape ? 18 : 16,
        borderTopRightRadius: isLandscape ? 18 : 16,
    }), [isLandscape]);

    const download = useMemo(
        () => downloads.find(d => d.id === String(item.stream_id || item.id)),
        [downloads, item.stream_id, item.id]
    );

    const seriesBaseExt = useMemo(
        () => episodeUrl?.match(/\.([a-z0-9]+)$/i)?.[1] || 'mkv',
        [episodeUrl]
    );
    const vodBaseExt = type === 'movie' ? (item.container_extension || 'mkv') : seriesBaseExt;
    const isMkvStrictCandidate = useMemo(() => {
        if (!ENABLE_PLAYER_MKV_STRICT_MODE_V1) return false;
        if (!(type === 'movie' || type === 'series')) return false;
        const base = String(vodBaseExt || '').toLowerCase();
        return base === 'mkv';
    }, [type, vodBaseExt]);
    const isHardLockedStream = useMemo(
        () => HARD_LOCK_STREAM_IDS.has(String(item?.stream_id ?? item?.id ?? '')),
        [item?.id, item?.stream_id]
    );
    const shouldHardLockMkvRoute = isHardLockedStream && isMkvStrictCandidate;
    const vodExtensionOrder = useMemo(
        () => (
            shouldHardLockMkvRoute
                ? ['mkv']
                : isMkvStrictCandidate && !allowMkvStrictExtensionFallback
                ? ['mkv']
                : buildVODExtensionOrder(vodBaseExt, learnedRoute?.extension)
        ),
        [allowMkvStrictExtensionFallback, isMkvStrictCandidate, learnedRoute?.extension, shouldHardLockMkvRoute, vodBaseExt]
    );

    const streamUrl = useMemo(() => {
        if (!api) return '';

        if (download && download.status === 'completed' && download.localPath) {
            const url = `file://${download.localPath}`;
            logger.info('Playing from local download', { id: download.id, path: download.localPath });
            return url;
        }

        if (type === 'live') {
            const format = LIVE_FALLBACK_FORMATS[liveFormatIndex] ?? LIVE_FALLBACK_FORMATS[0];
            const url = api.getLiveStreamUrl(item.stream_id, format);
            logger.info('[Player] Live stream URL', { streamId: item.stream_id, format, url });
            return url;
        }

        if (type === 'movie') {
            const fallbackExt = vodExtensionOrder[extensionIndex] ?? vodBaseExt;
            const baseUrl = api.getVodStreamUrl(item.stream_id, fallbackExt);
            const url = isMkvStrictCandidate
                ? appendCacheBust(baseUrl, mkvStrictUrlNonce)
                : baseUrl;
            logger.info('[Player] Movie stream URL', { streamId: item.stream_id, extension: fallbackExt, index: extensionIndex, url });
            return url;
        }

        if (episodeUrl) {
            if (extensionIndex > 0) {
                const fallbackExt = vodExtensionOrder[extensionIndex];
                if (fallbackExt) {
                    const replacedBase = episodeUrl.replace(/\.[a-z0-9]+$/i, `.${fallbackExt}`);
                    const replaced = isMkvStrictCandidate
                        ? appendCacheBust(replacedBase, mkvStrictUrlNonce)
                        : replacedBase;
                    logger.info('[Player] Series episode fallback URL', { extensionIndex, fallbackExt, url: replaced });
                    return replaced;
                }
            }
            const url = isMkvStrictCandidate
                ? appendCacheBust(episodeUrl, mkvStrictUrlNonce)
                : episodeUrl;
            logger.info('[Player] Series episode URL', { url });
            return url;
        }

        return '';
    }, [api, download, episodeUrl, extensionIndex, isMkvStrictCandidate, item, liveFormatIndex, mkvStrictUrlNonce, type, vodBaseExt, vodExtensionOrder]);
    const selectedPlaybackEngine = useMemo<PlaybackEngine>(
        () => determineSelectedPlaybackEngine({
            forcePlayer,
            enableIosLiveM3u8VlcFallback: ENABLE_PLAYER_IOS_LIVE_M3U8_VLC_FALLBACK_V1,
            isIosAltEngineEnabled,
            isIosVlcEnabled,
            isLive,
            isMkvStrictCandidate,
            learnedEngine: learnedRoute?.engine as PlaybackEngine | null | undefined,
            learnedEngineCoolingDown,
            learnedPlayer: learnedRoute?.player,
            type,
        }),
        [forcePlayer, isIosAltEngineEnabled, isIosVlcEnabled, isLive, isMkvStrictCandidate, learnedEngineCoolingDown, learnedRoute?.engine, learnedRoute?.player, type]
    );
    const selectedRoutePlayer = useMemo(
        () => playbackEngineToRoutePlayer(selectedPlaybackEngine),
        [selectedPlaybackEngine]
    );
    const isUsingIosVlcEngine = selectedPlaybackEngine === 'ios_vlc';
    const activeIOSPlaybackSurfaceEngine = selectedPlaybackEngine === 'native' ? null : selectedPlaybackEngine;

    useEffect(() => {
        logger.info('[Player] iOS playback route decision', {
            type,
            isLive,
            isUsingIosVlcEngine,
            selectedPlaybackEngine,
            selectedRoutePlayer,
            isIosAltEngineEnabled,
            isIosVlcEnabled,
            streamUrl,
            routeMemoryEnabled: ENABLE_PLAYER_STREAM_MEMORY_V1,
            learnedRoute,
            learnedEngineCoolingDown,
            forcePlayer,
            mkvStrict: isMkvStrictCandidate,
        });
    }, [forcePlayer, isIosAltEngineEnabled, isIosVlcEnabled, isLive, isMkvStrictCandidate, isUsingIosVlcEngine, learnedEngineCoolingDown, learnedRoute, selectedPlaybackEngine, selectedRoutePlayer, streamUrl, type]);

    useEffect(() => {
        logger.info('[Player] Playback attempt started', {
            type,
            streamId: routeMemoryStreamId,
            player: selectedRoutePlayer,
            engine: selectedPlaybackEngine,
            extensionIndex,
            chosenExtension: vodExtensionOrder[extensionIndex],
            streamUrl: clip(streamUrl, 220),
            vlcResolvedUrl: clip(vlcResolvedUrl, 220),
            vlcResolvedHost: getHostFromUrl(vlcResolvedUrl) || 'n/a',
            mkvStrictUseResolvedUrl,
            shouldHardLockMkvRoute,
            routeMemoryEnabled: ENABLE_PLAYER_STREAM_MEMORY_V1,
            timeoutFallbackEnabled: ENABLE_PLAYER_TIMEOUT_FALLBACK_V1,
        });
    }, [extensionIndex, item?.id, item?.stream_id, mkvStrictUseResolvedUrl, routeMemoryStreamId, selectedPlaybackEngine, selectedRoutePlayer, shouldHardLockMkvRoute, streamUrl, type, vlcResolvedUrl, vodExtensionOrder]);

    // When VLC is going to play this stream, pre-resolve the redirect chain
    // so VLC receives the final CDN URL with token directly.
    // MobileVLCKit can struggle with multi-hop HTTP redirects.
    useEffect(() => {
        if (!isUsingIosVlcEngine || !streamUrl || streamUrl.startsWith('file://')) {
            setVlcResolvedUrl(streamUrl);
            return;
        }
        // Some portals issue short-lived/single-use tokens. For MKV-strict streams,
        // avoid pre-resolve requests that can consume token validity before VLC opens.
        if (isMkvStrictCandidate && !shouldHardLockMkvRoute && !mkvStrictUseResolvedUrl) {
            setVlcResolvedUrl(streamUrl);
            logger.info('[Player] MKV strict: skipping VLC pre-resolve, using original URL', {
                streamUrl: streamUrl.substring(0, 80),
            });
            return;
        }

        let cancelled = false;
        setVlcResolvedUrl(''); // clear while resolving
        const fallbackTimer = setTimeout(() => {
            if (cancelled) return;
            setVlcResolvedUrl(streamUrl);
            logger.warn('[Player] VLC resolve timeout, using original URL', {
                timeoutMs: VLC_RESOLVE_TIMEOUT_MS,
                streamUrl: streamUrl.substring(0, 80),
            });
        }, VLC_RESOLVE_TIMEOUT_MS);

        const resolveUrl = async () => {
            try {
                const { default: downloadService } = await import('../../services/downloadService');
                const resolved = await (downloadService as any).resolveFinalUrl(streamUrl);
                if (!cancelled) {
                    const resolvedHost = getHostFromUrl(resolved);
                    const pinnedHost = shouldHardLockMkvRoute
                        ? (lockedHostRef.current || pinnedPlaybackHost || resolvedHost || null)
                        : null;
                    if (shouldHardLockMkvRoute && pinnedHost && !lockedHostRef.current) {
                        lockedHostRef.current = pinnedHost;
                    }
                    const finalResolvedUrl = pinnedHost
                        ? replaceUrlHost(resolved, pinnedHost)
                        : resolved;
                    logger.info('[Player] VLC resolved URL', {
                        original: streamUrl.substring(0, 60),
                        resolved: finalResolvedUrl.substring(0, 80),
                        pinnedHost: pinnedHost || 'n/a',
                    });
                    setVlcResolvedUrl(finalResolvedUrl);
                }
            } catch {
                if (!cancelled) {
                    // Fall back to original URL if resolution fails
                    setVlcResolvedUrl(streamUrl);
                }
            } finally {
                clearTimeout(fallbackTimer);
            }
        };

        resolveUrl();
        return () => {
            cancelled = true;
            clearTimeout(fallbackTimer);
        };
    }, [isMkvStrictCandidate, isUsingIosVlcEngine, mkvStrictUseResolvedUrl, pinnedPlaybackHost, shouldHardLockMkvRoute, streamUrl, vlcResolveEpoch]);

    useEffect(() => {
        setHasSeeked(false);
    }, [item, resumePosition]);

    useEffect(() => {
        // Reset fallback indexes only when the actual item or content type changes
        // (not when streamUrl changes due to extension cycling — that would break fallbacks)
        const initialExtIndex = learnedRoute?.extension
            ? Math.max(0, vodExtensionOrder.indexOf(learnedRoute.extension.toLowerCase()))
            : 0;
        setExtensionIndex(initialExtIndex);
        setLiveFormatIndex(0);
        silentRetryCountRef.current = 0;
        sameRouteRetryRef.current = {};
        startupStallHandledRef.current = false;
        hasSwitchedPlayerAxisRef.current = false;
        setForcePlayer(null);
        setVlcResolveEpoch(0);
        setMkvStrictUseResolvedUrl(shouldHardLockMkvRoute);
        setMkvStrictUrlNonce(0);
        setAllowMkvStrictExtensionFallback(false);
        setVlcPreflightHealthy(false);
        setVlcOpenedAtMs(0);
        startupTimeoutSuppressedRef.current = 0;
        vlcOpenRecoveryUsedRef.current = false;
        mkvPostNonMkvResolvedRetryUsedRef.current = false;
        lockedHostRef.current = null;
        vlcState4RetryUsedRef.current = false;
        hasPlaybackStartedRef.current = false;
        hasSavedRouteRef.current = false;
        setHasError(false);
        setErrorMessage('Playback failed');
        setIsBuffering(true);
        setCurrentTime(0);
        setPlayableDuration(0);
        setVlcSubtitleTracks([]);
        setSelectedVlcSubtitleTrackId(-2);
        durationRef.current = 0;
    }, [learnedRoute?.extension, shouldHardLockMkvRoute, type, item?.id, item?.stream_id]);

    useEffect(() => {
        if (!isUsingIosVlcEngine || !vlcPreflightHealthy) return;
        if (!vlcOpenedAtMs) return;
        if (hasError) return;
        if (currentTime > 0.25 || hasPlaybackStartedRef.current) return;
        if (!isBuffering) return;
        if (vlcOpenRecoveryUsedRef.current) return;
        if (silentRetryCountRef.current >= MAX_SILENT_RECOVERY_ATTEMPTS) return;

        const elapsed = Date.now() - vlcOpenedAtMs;
        const left = Math.max(0, VLC_OPEN_NO_PROGRESS_RECOVERY_MS - elapsed);
        const timer = setTimeout(() => {
            if (currentTime > 0.25 || hasPlaybackStartedRef.current || hasError) return;
            if (vlcOpenRecoveryUsedRef.current) return;
            if (silentRetryCountRef.current >= MAX_SILENT_RECOVERY_ATTEMPTS) return;
            vlcOpenRecoveryUsedRef.current = true;
            silentRetryCountRef.current += 1;
            setMkvStrictUrlNonce(Date.now());
            triggerRetryReResolve();
            setHasError(false);
            setIsBuffering(true);
            setPlayerInstanceKey((prev) => prev + 1);
            logger.warn('[Player] VLC open-without-progress recovery fired', {
                streamId: item?.stream_id || item?.id || 'unknown',
                waitedMs: VLC_OPEN_NO_PROGRESS_RECOVERY_MS,
                attempts: silentRetryCountRef.current,
            });
        }, left);
        return () => clearTimeout(timer);
    }, [currentTime, hasError, isBuffering, isUsingIosVlcEngine, item, triggerRetryReResolve, vlcOpenedAtMs, vlcPreflightHealthy]);

    useEffect(() => {
        if (!isUsingIosVlcEngine) return;
        if (hasError) return;
        if (currentTime > 0.25 || hasPlaybackStartedRef.current) return;
        if (!isBuffering) return;

        const timer = setTimeout(() => {
            if (currentTime > 0.25 || hasPlaybackStartedRef.current || hasError) return;
            if (silentRetryCountRef.current < VLC_ABSOLUTE_STUCK_MAX_RETRIES) {
                silentRetryCountRef.current += 1;
                if (shouldHardLockMkvRoute && !mkvStrictUseResolvedUrl) {
                    setMkvStrictUseResolvedUrl(true);
                }
                setMkvStrictUrlNonce(Date.now());
                triggerRetryReResolve();
                setHasError(false);
                setIsBuffering(true);
                setPlayerInstanceKey((prev) => prev + 1);
                logger.error('[Player] Absolute stuck guard fired: forcing VLC retry', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    guardMs: VLC_ABSOLUTE_STUCK_GUARD_MS,
                    attempts: silentRetryCountRef.current,
                    promoteResolvedUrl: shouldHardLockMkvRoute && !mkvStrictUseResolvedUrl,
                });
                return;
            }
            if (shouldHardLockMkvRoute) {
                setHasError(true);
                setIsBuffering(false);
                setErrorMessage('This stream is not playable on this iOS session.\nVLC could not start playback.');
                markRouteFailure('hard-lock-absolute-stuck-failfast');
                logger.error('[Player] Absolute stuck guard fired: hard-lock MKV fail-fast', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    guardMs: VLC_ABSOLUTE_STUCK_GUARD_MS,
                    attempts: silentRetryCountRef.current,
                    lastVlcDebug: lastVlcDebugRef.current,
                });
                return;
            }
            if (forceEmergencyNativeFailover('absolute-stuck-guard-exceeded')) {
                return;
            }
            setHasError(true);
            setIsBuffering(false);
            setErrorMessage('Playback is stuck.\nPlease retry this stream.');
            markRouteFailure('absolute-stuck-recovery-exhausted');
            logger.error('[Player] Absolute stuck guard fired: recovery exhausted', {
                streamId: item?.stream_id || item?.id || 'unknown',
                guardMs: VLC_ABSOLUTE_STUCK_GUARD_MS,
                attempts: silentRetryCountRef.current,
                lastVlcDebug: lastVlcDebugRef.current,
            });
        }, VLC_ABSOLUTE_STUCK_GUARD_MS);

        return () => clearTimeout(timer);
    }, [currentTime, forceEmergencyNativeFailover, hasError, isBuffering, isUsingIosVlcEngine, item, markRouteFailure, mkvStrictUseResolvedUrl, shouldHardLockMkvRoute, triggerRetryReResolve]);

    useEffect(() => {
        let cancelled = false;
        const runPreflight = async () => {
            if (!isUsingIosVlcEngine || !streamUrl || streamUrl.startsWith('file://')) {
                setVlcPreflightHealthy(false);
                return;
            }
            if (!(type === 'movie' || type === 'series')) {
                setVlcPreflightHealthy(false);
                return;
            }
            try {
                const started = Date.now();
                const response = await fetch(streamUrl, {
                    method: 'GET',
                    headers: { Range: 'bytes=0-1023' },
                });
                const ms = Date.now() - started;
                const contentType = String(response.headers.get('content-type') || '').toLowerCase();
                const isHtml = contentType.includes('text/html');
                const buf = await response.arrayBuffer();
                const bytes = buf.byteLength || 0;
                const healthy = (response.status === 200 || response.status === 206) && !isHtml && bytes >= 512 && ms < 8000;
                if (!cancelled) {
                    setVlcPreflightHealthy(healthy);
                    logger.info('[Player] VLC preflight', {
                        type,
                        streamId: item?.stream_id || item?.id || 'unknown',
                        status: response.status,
                        contentType,
                        bytes,
                        ms,
                        healthy,
                    });
                }
            } catch (e: any) {
                if (!cancelled) {
                    setVlcPreflightHealthy(false);
                    logger.warn('[Player] VLC preflight failed', {
                        type,
                        streamId: item?.stream_id || item?.id || 'unknown',
                        error: e?.message || String(e),
                    });
                }
            }
        };
        runPreflight();
        return () => { cancelled = true; };
    }, [isUsingIosVlcEngine, item, streamUrl, type]);

    useEffect(() => {
        // Each new player instance (retry/recreate) should get its own startup watchdog window.
        startupStallHandledRef.current = false;
    }, [playerInstanceKey]);

    const triggerRetryReResolve = useCallback(() => {
        if (!ENABLE_PLAYER_RERESOLVE_ON_RETRY_V1) return;
        if (!isUsingIosVlcEngine) return;
        if (silentRetryCountRef.current >= MAX_SILENT_RECOVERY_ATTEMPTS) return;
        setVlcResolvedUrl('');
        setVlcResolveEpoch((prev) => prev + 1);
    }, [isUsingIosVlcEngine]);

    const sameRouteRetryKey = useMemo(() => (
        [
            selectedRoutePlayer,
            type,
            String(item?.stream_id || item?.id || 'unknown'),
            String(extensionIndex),
        ].join('|')
    ), [extensionIndex, item, selectedRoutePlayer, type]);

    const currentPlaybackHost = useMemo(
        () => getHostFromUrl(isUsingIosVlcEngine ? (vlcResolvedUrl || streamUrl) : streamUrl),
        [isUsingIosVlcEngine, streamUrl, vlcResolvedUrl]
    );

    const markRouteFailure = useCallback((reason: string) => {
        if (!ENABLE_PLAYER_STREAM_MEMORY_V1 || isLive) return;
        if (!routeMemoryType || routeMemoryStreamId == null) return;
        markLearnedPlaybackEngineFailure(playbackScope, routeMemoryType, routeMemoryStreamId, selectedPlaybackEngine);
        markLearnedPlaybackRouteFailure(playbackScope, routeMemoryType, routeMemoryStreamId);
        logger.warn('[Player] Learned playback route marked failed', {
            reason,
            type,
            streamId: routeMemoryStreamId,
            player: selectedRoutePlayer,
            engine: selectedPlaybackEngine,
            extension: vodExtensionOrder[extensionIndex] || vodBaseExt,
            host: currentPlaybackHost || 'n/a',
        });
    }, [
        currentPlaybackHost,
        extensionIndex,
        isLive,
        playbackScope,
        routeMemoryStreamId,
        routeMemoryType,
        selectedPlaybackEngine,
        selectedRoutePlayer,
        type,
        vodBaseExt,
        vodExtensionOrder,
    ]);

    const trySameRouteTokenRefresh = useCallback((reason: 'error' | 'timeout'): boolean => {
        if (!ENABLE_PLAYER_RERESOLVE_ON_RETRY_V1) return false;
        const used = sameRouteRetryRef.current[sameRouteRetryKey] || 0;
        if (used >= 1) return false;
        sameRouteRetryRef.current[sameRouteRetryKey] = used + 1;
        triggerRetryReResolve();
        setHasError(false);
        setIsBuffering(true);
        setPlayerInstanceKey((prev) => prev + 1);
        logger.info('[Player] Same-route token refresh retry', {
            reason,
            type,
            streamId: item?.stream_id || item?.id || 'unknown',
            playerAxis: selectedRoutePlayer,
            engine: selectedPlaybackEngine,
            extensionIndex,
            retryCountForKey: sameRouteRetryRef.current[sameRouteRetryKey],
        });
        return true;
    }, [extensionIndex, item, sameRouteRetryKey, selectedRoutePlayer, selectedPlaybackEngine, triggerRetryReResolve, type]);

    const isTokenAuthLikeError = useCallback((errorString: string, errorCode: string, domain: string, fullError: string): boolean => {
        const blob = `${errorString} ${errorCode} ${domain} ${fullError}`.toLowerCase();
        return (
            blob.includes('401')
            || blob.includes('403')
            || blob.includes('unauthorized')
            || blob.includes('forbidden')
            || blob.includes('token')
            || blob.includes('expired')
            || blob.includes('text/html')
            || blob.includes('invalid credentials')
        );
    }, []);

    const trySwitchPlaybackAxis = useCallback((reason: 'timeout' | 'error'): boolean => {
        if (!ENABLE_PLAYER_AXIS_FALLBACK_V1) return false;
        if (isMkvStrictCandidate) return false;
        if (isLive || hasSwitchedPlayerAxisRef.current) return false;
        if (!isUsingIosVlcEngine) return false;
        hasSwitchedPlayerAxisRef.current = true;
        setForcePlayer('native');
        setExtensionIndex(0);
        setHasError(false);
        setIsBuffering(true);
        setPlayerInstanceKey((prev) => prev + 1);
        logger.warn('[Player] Axis fallback: switching VLC -> native', {
            type,
            streamId: item?.stream_id || item?.id || 'unknown',
            reason,
        });
        return true;
    }, [isLive, isMkvStrictCandidate, isUsingIosVlcEngine, item, type]);

    const trySwitchLiveM3u8ToVlc = useCallback((reason: 'timeout' | 'error'): boolean => {
        if (!ENABLE_PLAYER_IOS_LIVE_M3U8_VLC_FALLBACK_V1) return false;
        if (!isLive || hasSwitchedPlayerAxisRef.current) return false;
        if (!isIosVlcEnabled || isUsingIosVlcEngine) return false;
        const currentFormat = LIVE_FALLBACK_FORMATS[liveFormatIndex] ?? LIVE_FALLBACK_FORMATS[0];
        if (currentFormat !== 'm3u8') return false;

        hasSwitchedPlayerAxisRef.current = true;
        setForcePlayer('vlc');
        setHasError(false);
        setIsBuffering(true);
        setPlayerInstanceKey((prev) => prev + 1);
        logger.warn('[Player] Live iOS fallback: switching native m3u8 -> VLC m3u8', {
            type,
            streamId: item?.stream_id || item?.id || 'unknown',
            reason,
            currentFormat,
        });
        return true;
    }, [isIosVlcEnabled, isLive, isUsingIosVlcEngine, item, liveFormatIndex, type]);

    const forceEmergencyNativeFailover = useCallback((reason: string): boolean => {
        if (!ENABLE_PLAYER_AXIS_FALLBACK_V1) return false;
        if (isLive || hasSwitchedPlayerAxisRef.current) return false;
        if (!isUsingIosVlcEngine) return false;

        // Hard-locked MKV routes must never drop into native AVFoundation,
        // because iOS will reject the stream with -11828.
        if (shouldHardLockMkvRoute) {
            logger.error('[Player] Emergency native failover blocked for hard-locked MKV route', {
                reason,
                type,
                streamId: item?.stream_id || item?.id || 'unknown',
            });
            return false;
        }

        // For MKV-strict stuck sessions, try non-MKV extensions on VLC first
        // before switching to native (which is known to fail MKV with -11828).
        if (isMkvStrictCandidate && !shouldHardLockMkvRoute) {
            const fullOrder = buildVODExtensionOrder(vodBaseExt, learnedRoute?.extension);
            const targetExt = EMERGENCY_VLC_NON_MKV_ORDER.find((ext) => fullOrder.includes(ext));
            if (targetExt) {
                const targetIndex = fullOrder.indexOf(targetExt);
                if (targetIndex >= 0 && targetIndex !== extensionIndex) {
                    setAllowMkvStrictExtensionFallback(true);
                    setExtensionIndex(targetIndex);
                    setMkvStrictUrlNonce(Date.now());
                    triggerRetryReResolve();
                    setHasError(false);
                    setIsBuffering(true);
                    setPlayerInstanceKey((prev) => prev + 1);
                    logger.error('[Player] Emergency VLC non-MKV fallback before native failover', {
                        reason,
                        type,
                        streamId: item?.stream_id || item?.id || 'unknown',
                        targetExt,
                        targetIndex,
                    });
                    return true;
                }
            }
        }

        hasSwitchedPlayerAxisRef.current = true;
        setForcePlayer('native');
        setExtensionIndex(0);
        setHasError(false);
        setIsBuffering(true);
        setPlayerInstanceKey((prev) => prev + 1);
        logger.error('[Player] Emergency axis failover: VLC -> native', {
            reason,
            type,
            streamId: item?.stream_id || item?.id || 'unknown',
            mkvStrict: isMkvStrictCandidate,
        });
        return true;
    }, [extensionIndex, isLive, isMkvStrictCandidate, isUsingIosVlcEngine, item, learnedRoute?.extension, shouldHardLockMkvRoute, triggerRetryReResolve, type, vodBaseExt]);

    const persistSuccessfulRoute = useCallback(() => {
        if (!ENABLE_PLAYER_STREAM_MEMORY_V1 || isLive || hasSavedRouteRef.current) return;
        if (!routeMemoryType || routeMemoryStreamId == null) return;
        const extension = vodExtensionOrder[extensionIndex] || vodBaseExt;
        const player = selectedRoutePlayer;
        saveLearnedPlaybackRoute(playbackScope, routeMemoryType, routeMemoryStreamId, {
            player,
            engine: selectedPlaybackEngine,
            extension,
            host: currentPlaybackHost,
            timeoutProfile: isUsingIosVlcEngine ? 'vlc' : 'default',
        });
        hasSavedRouteRef.current = true;
        logger.info('[Player] Learned playback route saved', {
            type,
            streamId: routeMemoryStreamId,
            player,
            engine: selectedPlaybackEngine,
            extension,
            host: currentPlaybackHost || 'n/a',
        });
    }, [
        currentPlaybackHost,
        extensionIndex,
        isLive,
        playbackScope,
        routeMemoryStreamId,
        routeMemoryType,
        selectedRoutePlayer,
        selectedPlaybackEngine,
        type,
        isUsingIosVlcEngine,
        vodBaseExt,
        vodExtensionOrder,
    ]);

    useEffect(() => {
        if (streamUrl) return;
        setHasError(true);
        setIsBuffering(false);
        setErrorMessage('Stream unavailable');
    }, [streamUrl]);

    useEffect(() => {
        if (!isBuffering || hasError) return;
        if (isUsingIosVlcEngine && vlcPreflightHealthy) {
            // For verified-healthy VLC routes, avoid premature JS timeout.
            // Native VLC watchdog + global deadline handle true stalls.
            return;
        }
        // VLC streams (MKV) need more time to fill the initial buffer.
        // AVFoundation streams (MP4/HLS) are faster so keep a shorter timeout.
        const timeoutMs = isUsingIosVlcEngine ? VLC_BUFFERING_TIMEOUT_MS : BUFFERING_TIMEOUT_MS;
        const timeout = setTimeout(() => {
            // Ignore timeout if playback has already started (VLC may still toggle buffering).
            if (hasPlaybackStartedRef.current || currentTime > 0.25) {
                return;
            }
            if (ENABLE_PLAYER_TIMEOUT_FALLBACK_V1 && (type === 'movie' || type === 'series')) {
                if (silentRetryCountRef.current >= MAX_SILENT_RECOVERY_ATTEMPTS) {
                    setHasError(true);
                    setIsBuffering(false);
                    setErrorMessage('Playback recovery exhausted.\nPlease retry this stream.');
                    markRouteFailure('timeout-cap-reached');
                    logger.error('[Player] Recovery attempt cap reached (timeout)', {
                        type,
                        streamId: item?.stream_id || item?.id || 'unknown',
                        attempts: silentRetryCountRef.current,
                    });
                    return;
                }
                if (trySameRouteTokenRefresh('timeout')) {
                    silentRetryCountRef.current += 1;
                    return;
                }
                const nextIndex = extensionIndex + 1;
                if (nextIndex < vodExtensionOrder.length) {
                    logger.info('[Player] Timeout fallback: trying next extension', {
                        type,
                        streamId: item?.stream_id || item?.id || 'unknown',
                        nextIndex,
                        nextExtension: vodExtensionOrder[nextIndex],
                    });
                    silentRetryCountRef.current += 1;
                    triggerRetryReResolve();
                    setExtensionIndex(nextIndex);
                    setIsBuffering(true);
                    setPlayerInstanceKey((prev) => prev + 1);
                    return;
                }
                if (trySwitchPlaybackAxis('timeout')) {
                    return;
                }
            }

            if (type === 'live') {
                if (trySwitchLiveM3u8ToVlc('timeout')) {
                    return;
                }
                const nextFormat = liveFormatIndex + 1;
                if (nextFormat < LIVE_FALLBACK_FORMATS.length) {
                    logger.info(`Live timeout fallback: trying format index ${nextFormat} (${LIVE_FALLBACK_FORMATS[nextFormat]})`);
                    silentRetryCountRef.current += 1;
                    setLiveFormatIndex(nextFormat);
                    setIsBuffering(true);
                    setPlayerInstanceKey((prev) => prev + 1);
                    return;
                }
            }

            const timeoutMessage = type === 'live'
                ? 'This channel is taking too long to load.\nIt may be offline or experiencing issues.'
                : type === 'movie'
                    ? 'This movie is taking too long to load.\nCheck your connection or try again.'
                    : 'This episode is taking too long to load.\nCheck your connection or try again.';
            setHasError(true);
            setIsBuffering(false);
            setErrorMessage(timeoutMessage);
            markRouteFailure('buffering-timeout');
            logger.error('Video buffering timeout', {
                type,
                itemId: item?.stream_id || item?.id || 'unknown',
                timeoutMs,
                extensionIndex,
                extension: vodExtensionOrder[extensionIndex],
            });
        }, timeoutMs);
        return () => clearTimeout(timeout);
    }, [currentTime, extensionIndex, hasError, isBuffering, isUsingIosVlcEngine, item, liveFormatIndex, markRouteFailure, trySameRouteTokenRefresh, triggerRetryReResolve, trySwitchLiveM3u8ToVlc, trySwitchPlaybackAxis, type, vodExtensionOrder]);

    useEffect(() => {
        if (hasError) return;
        if (!isBuffering) return;
        if (hasPlaybackStartedRef.current || currentTime > 0.25) return;
        if (startupStallHandledRef.current) return;
        if (!(type === 'movie' || type === 'series')) return;

        const stallTimer = setTimeout(() => {
            if (hasPlaybackStartedRef.current || currentTime > 0.25 || hasError) return;
            startupStallHandledRef.current = true;
                logger.warn('[Player] Startup stall watchdog fired', {
                    type,
                    streamId: item?.stream_id || item?.id || 'unknown',
                    watchdogMs: STARTUP_STALL_WATCHDOG_MS,
                    playerAxis: selectedRoutePlayer,
                    extensionIndex,
                });

            if (silentRetryCountRef.current >= MAX_SILENT_RECOVERY_ATTEMPTS) {
                setHasError(true);
                setIsBuffering(false);
                setErrorMessage('Playback recovery exhausted.\nPlease retry this stream.');
                return;
            }

            if (trySameRouteTokenRefresh('timeout')) {
                silentRetryCountRef.current += 1;
                logger.warn('[Player] Watchdog stage=token_refresh', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    attempts: silentRetryCountRef.current,
                });
                return;
            }

            if (trySwitchPlaybackAxis('timeout')) {
                logger.warn('[Player] Watchdog stage=axis_switch', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    attempts: silentRetryCountRef.current,
                });
                return;
            }

            const nextIndex = extensionIndex + 1;
            if (nextIndex < vodExtensionOrder.length) {
                silentRetryCountRef.current += 1;
                triggerRetryReResolve();
                setExtensionIndex(nextIndex);
                setIsBuffering(true);
                setPlayerInstanceKey((prev) => prev + 1);
                logger.warn('[Player] Watchdog stage=extension_fallback', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    nextIndex,
                    attempts: silentRetryCountRef.current,
                });
                return;
            }
        }, STARTUP_STALL_WATCHDOG_MS);

        return () => clearTimeout(stallTimer);
    }, [
        currentTime,
        extensionIndex,
        hasError,
        isBuffering,
        item,
        selectedRoutePlayer,
        triggerRetryReResolve,
        trySameRouteTokenRefresh,
        trySwitchPlaybackAxis,
        type,
        isUsingIosVlcEngine,
        vodExtensionOrder,
    ]);

    useEffect(() => {
        if (hasError) return;
        if (hasPlaybackStartedRef.current || currentTime > 0.25) return;
        const deadlineMs = isMkvStrictCandidate
            ? MKV_STRICT_GLOBAL_PLAYBACK_DEADLINE_MS
            : GLOBAL_PLAYBACK_DEADLINE_MS;
        const deadline = setTimeout(() => {
            if (hasPlaybackStartedRef.current || currentTime > 0.25) return;
            if (isMkvStrictCandidate && silentRetryCountRef.current < MAX_SILENT_RECOVERY_ATTEMPTS) {
                if (trySameRouteTokenRefresh('timeout')) {
                    silentRetryCountRef.current += 1;
                    logger.warn('[Player] Global deadline retry: mkvStrict token re-resolve', {
                        type,
                        streamId: item?.stream_id || item?.id || 'unknown',
                        deadlineMs,
                        attempts: silentRetryCountRef.current,
                    });
                    return;
                }
            }
            if (
                type !== 'live'
                && isUsingIosVlcEngine
                && !isMkvStrictCandidate
                && !hasSwitchedPlayerAxisRef.current
                && ENABLE_PLAYER_AXIS_FALLBACK_V1
            ) {
                hasSwitchedPlayerAxisRef.current = true;
                setForcePlayer('native');
                setExtensionIndex(0);
                setHasError(false);
                setIsBuffering(true);
                setPlayerInstanceKey((prev) => prev + 1);
                logger.warn('[Player] Global deadline escalation: switching VLC -> native', {
                    type,
                    streamId: item?.stream_id || item?.id || 'unknown',
                    deadlineMs,
                });
                return;
            }
            setHasError(true);
            setIsBuffering(false);
            setErrorMessage(
                shouldHardLockMkvRoute
                    ? 'This stream is not playable on this iOS session.\nVLC never reached playback.'
                    : 'Playback could not start in time.\nPlease retry this stream.'
            );
            markRouteFailure('global-playback-deadline-exceeded');
            logger.error('[Player] Global playback deadline exceeded', {
                type,
                streamId: item?.stream_id || item?.id || 'unknown',
                deadlineMs,
                playerAxis: selectedRoutePlayer,
                extensionIndex,
                attempts: silentRetryCountRef.current,
                lastVlcDebug: lastVlcDebugRef.current,
            });
        }, deadlineMs);
        return () => clearTimeout(deadline);
    }, [currentTime, extensionIndex, hasError, isMkvStrictCandidate, isUsingIosVlcEngine, item, markRouteFailure, selectedRoutePlayer, shouldHardLockMkvRoute, trySameRouteTokenRefresh, type]);

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
        if (controlsLocked || showSettings || paused) return;
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
        if (isLive) return;
        // Some streams play without exposing duration metadata. In that case,
        // allow relative seeking using unclamped positive time.
        const clamped = duration > 0
            ? Math.max(0, Math.min(time, duration))
            : Math.max(0, time);
        if (isUsingIosVlcEngine) {
            setVlcSeekTime(clamped);
            setVlcSeekTrigger((prev) => prev + 1);
        } else if (videoRef.current) {
            videoRef.current.seek(clamped);
        }
        setCurrentTime(clamped);
    }, [duration, isLive, isUsingIosVlcEngine]);

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
        onStartShouldSetPanResponder: () => !isLive && !showSettings,
        onMoveShouldSetPanResponder: () => !isLive && !showSettings,
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
    }), [beginScrub, duration, endScrub, isLive, progressBarWidth, showControlsNow, showSettings]);

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
        if (activeIOSPlaybackSurfaceEngine) {
            return vlcSubtitleTracks.map((track) => ({
                key: `vlc-sub-${track.id}`,
                label: track.name || `Track ${track.id}`,
                description: `Track ID ${track.id}`,
            }));
        }
        return textTracks.map((track) => {
            const label = track.title || track.language || `Track ${track.index + 1}`;
            return { key: `sub-${track.index}`, label, description: track.language };
        });
    }, [activeIOSPlaybackSurfaceEngine, textTracks, vlcSubtitleTracks]);

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
        if (activeIOSPlaybackSurfaceEngine) {
            if (selectedVlcSubtitleTrackId === -1) return 'Off';
            if (selectedVlcSubtitleTrackId === -2) return 'Auto';
            const track = vlcSubtitleTracks.find(t => t.id === selectedVlcSubtitleTrackId);
            return track?.name || `Track ${selectedVlcSubtitleTrackId}`;
        }
        if (!selectedTextTrack || selectedTextTrack.type === SelectedTrackType.DISABLED) return 'Off';
        if (selectedTextTrack.type === SelectedTrackType.SYSTEM) return 'System';
        if (selectedTextTrack.type === SelectedTrackType.INDEX) {
            const track = textTracks.find(t => t.index === selectedTextTrack.value);
            return track?.title || track?.language || 'Track';
        }
        return 'Custom';
    }, [activeIOSPlaybackSurfaceEngine, selectedTextTrack, selectedVlcSubtitleTrackId, textTracks, vlcSubtitleTracks]);

    const liveChannelList = useMemo(() => {
        if (!isLive) return [];
        if (liveItemsCount === 0) return [];

        const liveItems = useContentStore.getState().content.live.items || EMPTY_LIVE_CHANNELS;
        const currentCategoryId = item?.category_id != null ? String(item.category_id) : null;
        const pool = currentCategoryId
            ? liveItems.filter((channel) => String(channel?.category_id ?? '') === currentCategoryId)
            : liveItems;

        return pool.filter((channel) => channel?.stream_id && channel?.name);
    }, [isLive, item?.category_id, liveItemsCount]);

    const currentLiveIndex = useMemo(() => {
        if (!isLive) return -1;
        const currentStreamId = Number(item?.stream_id ?? item?.id ?? 0);
        return liveChannelList.findIndex((channel) => Number(channel.stream_id) === currentStreamId);
    }, [isLive, item?.id, item?.stream_id, liveChannelList]);

    const changeChannel = useCallback((direction: -1 | 1) => {
        if (!isLive || liveChannelList.length === 0) return;

        const baseIndex = currentLiveIndex >= 0 ? currentLiveIndex : 0;
        const nextIndex = (baseIndex + (direction * CHANNEL_STEP) + liveChannelList.length) % liveChannelList.length;
        const nextChannel = liveChannelList[nextIndex];

        if (!nextChannel) return;

        // Update item in-place — no navigation, no screen flash
        setItem(nextChannel);
    }, [currentLiveIndex, isLive, liveChannelList]);

    const handleTapSeek = useCallback((delta: number) => {
        if (isLive) {
            showControlsNow();
            return;
        }

        handleSeekBy(delta);
        setShowControls(false);
    }, [handleSeekBy, isLive, showControlsNow]);

    // Double-tap detection refs for left/right seek zones
    const lastTapTimeLeft = useRef(0);
    const lastTapTimeRight = useRef(0);
    const tapTimerLeft = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tapTimerRight = useRef<ReturnType<typeof setTimeout> | null>(null);
    const DOUBLE_TAP_DELAY_MS = 300;

    const handleLeftZoneTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapTimeLeft.current < DOUBLE_TAP_DELAY_MS) {
            // Double tap — cancel the pending single-tap action and seek
            if (tapTimerLeft.current) {
                clearTimeout(tapTimerLeft.current);
                tapTimerLeft.current = null;
            }
            lastTapTimeLeft.current = 0;
            handleTapSeek(-SEEK_STEP_SECONDS);
        } else {
            // First tap — wait to see if a second tap comes
            lastTapTimeLeft.current = now;
            tapTimerLeft.current = setTimeout(() => {
                tapTimerLeft.current = null;
                showControlsNow();
            }, DOUBLE_TAP_DELAY_MS);
        }
    }, [handleTapSeek, showControlsNow]);

    const handleRightZoneTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapTimeRight.current < DOUBLE_TAP_DELAY_MS) {
            // Double tap — cancel the pending single-tap action and seek
            if (tapTimerRight.current) {
                clearTimeout(tapTimerRight.current);
                tapTimerRight.current = null;
            }
            lastTapTimeRight.current = 0;
            handleTapSeek(SEEK_STEP_SECONDS);
        } else {
            // First tap — wait to see if a second tap comes
            lastTapTimeRight.current = now;
            tapTimerRight.current = setTimeout(() => {
                tapTimerRight.current = null;
                showControlsNow();
            }, DOUBLE_TAP_DELAY_MS);
        }
    }, [handleTapSeek, showControlsNow]);

    const handleSettingsClose = () => {
        setSettingsView('root');
        setShowSettings(false);
        showControlsNow();
    };

    const handleToggleFavorite = useCallback(() => {
        const image = item?.info?.movie_image || item?.stream_icon || item?.cover;
        const subtitle = favoriteDescriptor.kind === 'episode'
            ? (item?.series_name || item?.seriesTitle || item?.name)
            : undefined;
        toggleFavorite({
            key: favoriteDescriptor.key,
            scope: favoritesScope,
            kind: favoriteDescriptor.kind,
            entityId: favoriteDescriptor.entityId,
            title: favoriteDescriptor.kind === 'episode'
                ? (item?.title || item?.episodeTitle || item?.name || 'Episode')
                : (item?.name || item?.title || 'Unknown'),
            subtitle,
            image,
            rating: item?.rating_5based || item?.rating,
            year: item?.year || item?.releaseDate,
            episodeUrl,
            data: item,
        });
        showControlsNow();
    }, [episodeUrl, favoriteDescriptor.entityId, favoriteDescriptor.key, favoriteDescriptor.kind, favoritesScope, item, showControlsNow, toggleFavorite]);

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

    const handlePlaybackError = (errorString: string, errorCode: string, domain: string, fullError: string) => {
        let parsedError: any = null;
        try {
            parsedError = JSON.parse(fullError);
        } catch {
            parsedError = null;
        }
        const nativeError = parsedError?.error || parsedError?.nativeEvent?.error || parsedError;
        const safeStreamUrl = clip(streamUrl, 260);
        const safeFullError = clip(fullError, 800);
        const safeNativeDescription = clip(
            nativeError?.localizedDescription
            || nativeError?.localizedFailureReason
            || nativeError?.errorString
            || '',
            400
        );
        logger.error('[Player] Playback error', {
            type,
            playerAxis: selectedRoutePlayer,
            engine: selectedPlaybackEngine,
            errorString,
            errorCode,
            domain,
            isIosVlcEnabled,
            extensionIndex,
            liveFormatIndex,
            streamUrl: safeStreamUrl,
            nativeErrorCode: nativeError?.code,
            nativeErrorWhat: nativeError?.what,
            nativeErrorExtra: nativeError?.extra,
            nativeErrorLocalizedDescription: safeNativeDescription,
            vlcResolvedUrl: clip(vlcResolvedUrl, 260),
            vlcResolvedHost: getHostFromUrl(vlcResolvedUrl) || 'n/a',
            mkvStrictUseResolvedUrl,
            shouldHardLockMkvRoute,
            fullError: safeFullError,
        });

        // Safety net: if MKV strict candidate somehow hits native path, immediately recover to VLC.
        if (isMkvStrictCandidate && !isUsingIosVlcEngine && isIosVlcEnabled) {
            logger.warn('[Player] MKV strict recovery: forcing VLC axis after native error', {
                type,
                streamId: item?.stream_id || item?.id || 'unknown',
                errorString,
                errorCode,
                domain,
            });
            setForcePlayer('vlc');
            setHasError(false);
            setIsBuffering(true);
            setPlayerInstanceKey((prev) => prev + 1);
            return;
        }

        if (type === 'movie' || type === 'series') {
            if (shouldHardLockMkvRoute && isUsingIosVlcEngine && errorCode === 'vlc-state-4') {
                if (!vlcState4RetryUsedRef.current) {
                    vlcState4RetryUsedRef.current = true;
                    silentRetryCountRef.current += 1;
                    setMkvStrictUseResolvedUrl(true);
                    setMkvStrictUrlNonce(Date.now());
                    triggerRetryReResolve();
                    setHasError(false);
                    setIsBuffering(true);
                    setPlayerInstanceKey((prev) => prev + 1);
                    logger.warn('[Player] Hard-lock route: single native restart on vlc-state-4', {
                        streamId: item?.stream_id || item?.id || 'unknown',
                        host: lockedHostRef.current || pinnedPlaybackHost || 'n/a',
                    });
                    return;
                }
                setHasError(true);
                setIsBuffering(false);
                setErrorMessage('This stream is not playable on this iOS session.\nPlease try again later.');
                markRouteFailure('hard-lock-vlc-state-4-failfast');
                logger.error('[Player] Hard-lock route fail-fast after one vlc-state-4 retry', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    host: lockedHostRef.current || pinnedPlaybackHost || 'n/a',
                });
                return;
            }
            if (isMkvStrictCandidate && isUsingIosVlcEngine && errorCode === 'vlc-state-4' && allowMkvStrictExtensionFallback) {
                if (!mkvPostNonMkvResolvedRetryUsedRef.current) {
                    mkvPostNonMkvResolvedRetryUsedRef.current = true;
                    silentRetryCountRef.current += 1;
                    setAllowMkvStrictExtensionFallback(false);
                    setMkvStrictUseResolvedUrl(true);
                    setExtensionIndex(0);
                    setMkvStrictUrlNonce(Date.now());
                    triggerRetryReResolve();
                    setHasError(false);
                    setIsBuffering(true);
                    setPlayerInstanceKey((prev) => prev + 1);
                    logger.warn('[Player] Post non-MKV fail: single resolved MKV retry', {
                        streamId: item?.stream_id || item?.id || 'unknown',
                        attempts: silentRetryCountRef.current,
                    });
                    return;
                }
                setHasError(true);
                setIsBuffering(false);
                setErrorMessage('This stream is not playable on this iOS session.\nPlease try again later.');
                markRouteFailure('mkv-post-non-mkv-vlc-state-4-failfast');
                logger.error('[Player] Fail-fast after resolved MKV retry (vlc-state-4)', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    attempts: silentRetryCountRef.current,
                });
                return;
            }
            if (isMkvStrictCandidate && isUsingIosVlcEngine && errorCode === 'vlc-state-4') {
                const fullOrder = buildVODExtensionOrder(vodBaseExt, learnedRoute?.extension);
                const targetExt = EMERGENCY_VLC_NON_MKV_ORDER.find((ext) => fullOrder.includes(ext));
                if (targetExt) {
                    const targetIndex = fullOrder.indexOf(targetExt);
                    if (targetIndex >= 0 && targetIndex !== extensionIndex) {
                        silentRetryCountRef.current += 1;
                        setAllowMkvStrictExtensionFallback(true);
                        setExtensionIndex(targetIndex);
                        setMkvStrictUrlNonce(Date.now());
                        triggerRetryReResolve();
                        setHasError(false);
                        setIsBuffering(true);
                        setPlayerInstanceKey((prev) => prev + 1);
                        logger.warn('[Player] Immediate VLC non-MKV fallback on vlc-state-4', {
                            streamId: item?.stream_id || item?.id || 'unknown',
                            targetExt,
                            targetIndex,
                            attempts: silentRetryCountRef.current,
                        });
                        return;
                    }
                }
            }
            if (errorCode === 'startup-timeout' && isUsingIosVlcEngine && vlcPreflightHealthy && startupTimeoutSuppressedRef.current < 2) {
                startupTimeoutSuppressedRef.current += 1;
                silentRetryCountRef.current += 1;
                setMkvStrictUrlNonce(Date.now());
                triggerRetryReResolve();
                setHasError(false);
                setIsBuffering(true);
                setPlayerInstanceKey((prev) => prev + 1);
                logger.warn('[Player] Suppressing startup-timeout after healthy preflight', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    suppressedCount: startupTimeoutSuppressedRef.current,
                    attempts: silentRetryCountRef.current,
                });
                return;
            }
            if (isMkvStrictCandidate && isUsingIosVlcEngine && errorCode === 'startup-timeout' && !mkvStrictUseResolvedUrl) {
                if (silentRetryCountRef.current >= MAX_SILENT_RECOVERY_ATTEMPTS) {
                    setHasError(true);
                    setIsBuffering(false);
                    setErrorMessage('Playback recovery exhausted.\nPlease retry this stream.');
                    return;
                }
                silentRetryCountRef.current += 1;
                setMkvStrictUseResolvedUrl(true);
                triggerRetryReResolve();
                setHasError(false);
                setIsBuffering(true);
                setPlayerInstanceKey((prev) => prev + 1);
                logger.warn('[Player] MKV strict fallback: switching to resolved URL path after startup-timeout', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    attempts: silentRetryCountRef.current,
                });
                return;
            }
            if (isMkvStrictCandidate && isUsingIosVlcEngine && errorCode === 'startup-timeout' && mkvStrictUseResolvedUrl) {
                if (silentRetryCountRef.current >= MAX_SILENT_RECOVERY_ATTEMPTS) {
                    setHasError(true);
                    setIsBuffering(false);
                    setErrorMessage('Playback recovery exhausted.\nPlease retry this stream.');
                    return;
                }
                silentRetryCountRef.current += 1;
                setMkvStrictUrlNonce(Date.now());
                triggerRetryReResolve();
                setHasError(false);
                setIsBuffering(true);
                setPlayerInstanceKey((prev) => prev + 1);
                logger.warn('[Player] MKV strict fallback: forcing fresh URL retry after startup-timeout', {
                    streamId: item?.stream_id || item?.id || 'unknown',
                    attempts: silentRetryCountRef.current,
                });
                return;
            }
            if (silentRetryCountRef.current >= MAX_SILENT_RECOVERY_ATTEMPTS) {
                setHasError(true);
                setIsBuffering(false);
                setErrorMessage('Playback recovery exhausted.\nPlease retry this stream.');
                markRouteFailure('error-cap-reached');
                logger.error('[Player] Recovery attempt cap reached (error)', {
                    type,
                    streamId: item?.stream_id || item?.id || 'unknown',
                    attempts: silentRetryCountRef.current,
                    errorString,
                    errorCode,
                    domain,
                });
                return;
            }
            if (isTokenAuthLikeError(errorString, errorCode, domain, fullError)) {
                if (trySameRouteTokenRefresh('error')) {
                    silentRetryCountRef.current += 1;
                    return;
                }
            }
            const nextIndex = extensionIndex + 1;
            if (nextIndex < vodExtensionOrder.length) {
                logger.info(`Fallback: trying extension index ${nextIndex} (${vodExtensionOrder[nextIndex]})`);
                silentRetryCountRef.current += 1;
                triggerRetryReResolve();
                setExtensionIndex(nextIndex);
                setIsBuffering(true);
                setPlayerInstanceKey((prev) => prev + 1);
                return;
            }
            if (trySwitchPlaybackAxis('error')) {
                return;
            }
        }

        if (type === 'live') {
            if (trySwitchLiveM3u8ToVlc('error')) {
                return;
            }
            const nextFormat = liveFormatIndex + 1;
            if (nextFormat < LIVE_FALLBACK_FORMATS.length) {
                logger.info(`Live fallback: trying format index ${nextFormat} (${LIVE_FALLBACK_FORMATS[nextFormat]})`);
                silentRetryCountRef.current += 1;
                setLiveFormatIndex(nextFormat);
                setIsBuffering(true);
                setPlayerInstanceKey((prev) => prev + 1);
                return;
            }
        }

        const contextualMessage = (() => {
            if (type === 'live') return 'This channel is currently unavailable.\nIt may be offline or your subscription may not include it.';
            if (type === 'movie') return 'This movie could not be played.\nThe file may be unavailable on the server.';
            if (type === 'series') return 'This episode could not be played.\nThe file may be unavailable on the server.';
            return 'Playback failed. Please try again.';
        })();

        setHasError(true);
        setIsBuffering(false);
        setErrorMessage(contextualMessage);
    };

    return (
        <View style={styles.container}>
            {/* Video Player */}
            {activeIOSPlaybackSurfaceEngine ? (
                vlcResolvedUrl ? (
                <IOSPlaybackSurface
                    engine={activeIOSPlaybackSurfaceEngine}
                    key={`${type}-${String(item?.stream_id ?? item?.id ?? 'unknown')}-${playerInstanceKey}-${activeIOSPlaybackSurfaceEngine}`}
                    src={vlcResolvedUrl}
                    style={styles.video}
                    paused={paused}
                    muted={isMuted}
                    rate={playbackRate}
                    subtitleFontSize={DEFAULT_SUBTITLE_FONT_SIZE}
                    subtitleColor={DEFAULT_SUBTITLE_COLOR}
                    subtitleOutlineColor={DEFAULT_SUBTITLE_OUTLINE_COLOR}
                    subtitleOutlineWidth={DEFAULT_SUBTITLE_OUTLINE_WIDTH}
                    subtitleBackgroundColor={DEFAULT_SUBTITLE_BACKGROUND_COLOR}
                    subtitleBottomMargin={DEFAULT_SUBTITLE_BOTTOM_MARGIN}
                    subtitleTrackId={selectedVlcSubtitleTrackId}
                    startupTimeoutMs={vlcPreflightHealthy ? VLC_STARTUP_TIMEOUT_HEALTHY_MS : VLC_STARTUP_TIMEOUT_DEFAULT_MS}
                    seekTime={vlcSeekTime}
                    seekTrigger={vlcSeekTrigger}
                    onVLCOpen={() => {
                        if (!vlcPreflightHealthy) return;
                        // Track that VLC opened session; if no progress follows,
                        // recovery watchdog will retry with a fresh URL.
                        setVlcOpenedAtMs(Date.now());
                    }}
                    onVLCDebug={(event) => {
                        const payload = event.nativeEvent || {};
                        lastVlcDebugRef.current = payload;
                        logger.info('[Player][iOS Playback Debug]', {
                            engine: activeIOSPlaybackSurfaceEngine,
                            streamId: item?.stream_id || item?.id || 'unknown',
                            playerState: payload.playerState,
                            debugReason: payload.debugReason,
                            stateRaw: payload.stateRaw,
                            isPlaying: payload.isPlaying,
                            timeMs: payload.timeMs,
                            position: payload.position,
                            rate: payload.rate,
                            lengthMs: payload.lengthMs,
                            bitrate: payload.bitrate,
                            demuxReadBytes: payload.demuxReadBytes,
                            startupRecoveryAttempts: payload.startupRecoveryAttempts,
                        });
                    }}
                    onVLCError={(event) => {
                        const errorString = event.nativeEvent?.error?.errorString || 'unknown';
                        const errorCode = event.nativeEvent?.error?.errorCode || 'unknown';
                        const domain = event.nativeEvent?.error?.domain || 'MobileVLCKit';
                        handlePlaybackError(errorString, errorCode, domain, JSON.stringify(event.nativeEvent || {}));
                    }}
                    onVLCLoad={(event) => {
                        const loadedDuration = event.nativeEvent?.duration || 0;
                        logger.info('[Player] Subtitle control diagnostics', {
                            streamId: item?.stream_id || item?.id || 'unknown',
                            type,
                            engine: activeIOSPlaybackSurfaceEngine,
                            subtitleControlMode: 'ios-surface-unknown',
                            note: 'iOS native surface does not expose parsed textTracks metadata in this bridge.',
                        });
                        // VLC fired onLoad — stream is open and media info is known.
                        // Mark playback as started so the buffering timeout doesn't
                        // fire while VLC is filling its initial buffer.
                        hasPlaybackStartedRef.current = true;
                        persistSuccessfulRoute();
                        setHasError(false);
                        setIsBuffering(false);
                        durationRef.current = loadedDuration;
                        setDuration(loadedDuration);
                        if (!isLive && resumePosition > 0 && !hasSeeked) {
                            setHasSeeked(true);
                            setCurrentTime(resumePosition);
                            setVlcSeekTime(resumePosition);
                            setVlcSeekTrigger((prev) => prev + 1);
                        }
                    }}
                    onVLCSubtitleTracks={(event) => {
                        const payload = event.nativeEvent || {};
                        const tracksRaw = Array.isArray(payload.tracks) ? payload.tracks : [];
                        const tracks: VlcSubtitleTrack[] = tracksRaw
                            .map((t: any) => ({
                                id: Number(t?.id),
                                name: String(t?.name || ''),
                            }))
                            .filter((t: VlcSubtitleTrack) => Number.isFinite(t.id));
                        setVlcSubtitleTracks(tracks);
                        const selectedId = Number(payload.selectedTrackId);
                        if (Number.isFinite(selectedId)) {
                            setSelectedVlcSubtitleTrackId(selectedId);
                        }
                        logger.info('[Player] iOS subtitle tracks', {
                            streamId: item?.stream_id || item?.id || 'unknown',
                            type,
                            engine: activeIOSPlaybackSurfaceEngine,
                            reason: payload.reason || 'unknown',
                            selectedTrackId: Number.isFinite(selectedId) ? selectedId : payload.selectedTrackId,
                            subtitleTrackCount: tracks.length,
                            subtitleTrackSample: tracks.slice(0, 8),
                        });
                    }}
                    onVLCProgress={({ nativeEvent }) => {
                        const progressTime = nativeEvent.currentTime || 0;
                        if (progressTime > 0.25) {
                            hasPlaybackStartedRef.current = true;
                            setVlcOpenedAtMs(0);
                            persistSuccessfulRoute();
                            if (isBuffering) {
                                setIsBuffering(false);
                            }
                        }
                        const now = Date.now();
                        const uiThrottle = (showControls || showStats)
                            ? UI_UPDATE_THROTTLE_MS
                            : UI_UPDATE_THROTTLE_HIDDEN_MS;
                        if (!isScrubbing && now - lastUiUpdateRef.current >= uiThrottle) {
                            setCurrentTime(progressTime);
                            if (typeof nativeEvent.playableDuration === 'number') {
                                setPlayableDuration(nativeEvent.playableDuration);
                            }
                            lastUiUpdateRef.current = now;
                        }
                        handleProgressTracking(progressTime);
                    }}
                    onVLCBuffer={({ nativeEvent }) => {
                        const buffering = !!nativeEvent?.isBuffering;
                        // After playback starts, ignore spurious VLC buffering toggles
                        // that can leave the blocking overlay stuck on top.
                        if (hasPlaybackStartedRef.current && buffering) {
                            return;
                        }
                        setIsBuffering(buffering);
                    }}
                    onVLCEnd={() => {
                        if (!isLive) {
                            setPaused(true);
                            setShowControls(true);
                        }
                    }}
                />
                ) : (
                    // URL still resolving — show buffering spinner
                    <View style={[styles.video, { backgroundColor: '#000' }]} />
                )
            ) : (
                <Video
                key={`${type}-${String(item?.stream_id ?? item?.id ?? 'unknown')}-${playerInstanceKey}`}
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
                subtitleStyle={{
                    fontSize: DEFAULT_SUBTITLE_FONT_SIZE,
                    paddingBottom: 24,
                }}
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
                    bufferForPlaybackMs: 5000,
                    bufferForPlaybackAfterRebufferMs: 8000,
                }}
                onError={(error) => {
                    const errorString = error.error?.errorString || 'unknown';
                    const errorCode = error.error?.errorCode || 'unknown';
                    const domain = (error.error as any)?.domain || '';
                    handlePlaybackError(errorString, errorCode, domain, JSON.stringify(error));
                }}
                onLoad={(data: OnLoadData) => {
                    logger.debug('Video loaded', {
                        duration: data.duration,
                        hasAudio: data.audioTracks?.length > 0,
                    });
                    hasPlaybackStartedRef.current = false;
                    // Auto-dismiss error overlay when stream recovers
                    setHasError(false);
                    setIsBuffering(false);
                    persistSuccessfulRoute();
                    durationRef.current = data.duration || 0;
                    setDuration(data.duration || 0);
                    setAudioTracks(data.audioTracks || []);
                    setTextTracks(data.textTracks || []);
                    const subtitleDiag = classifySubtitleControl(data.textTracks);
                    logger.info('[Player] Subtitle control diagnostics', {
                        streamId: item?.stream_id || item?.id || 'unknown',
                        type,
                        textTrackCount: data.textTracks?.length || 0,
                        selectedTextTrack: data.textTracks?.find(t => t.selected)?.title || null,
                        subtitleControlMode: subtitleDiag.mode,
                        subtitleTrackHints: subtitleDiag.details,
                    });
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
                    if (time > 0.25) {
                        hasPlaybackStartedRef.current = true;
                        persistSuccessfulRoute();
                    }
                    const now = Date.now();
                    const uiThrottle = (showControls || showStats)
                        ? UI_UPDATE_THROTTLE_MS
                        : UI_UPDATE_THROTTLE_HIDDEN_MS;
                    if (!isScrubbing && now - lastUiUpdateRef.current >= uiThrottle) {
                        setCurrentTime(time);
                        if (typeof playable === 'number') {
                            setPlayableDuration(playable);
                        }
                        lastUiUpdateRef.current = now;
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
            )}

            {/* Hidden-state tap zones */}
            {!showControls && !controlsLocked && (
                isLive ? (
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={showControlsNow} />
                ) : (
                    <View style={styles.tapZones} pointerEvents="box-none">
                        <Pressable style={styles.tapZoneSide} onPress={handleLeftZoneTap} />
                        <Pressable style={styles.tapZoneCenter} onPress={showControlsNow} />
                        <Pressable style={styles.tapZoneSide} onPress={handleRightZoneTap} />
                    </View>
                )
            )}

            {/* Controls Overlay */}
            {showControls && !controlsLocked && (
                <View style={[styles.controlsOverlay, controlsOverlayInsetStyle]} pointerEvents="box-none">
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
                                onPress={handleToggleFavorite}
                            >
                                <Icon
                                    name="heart"
                                    size={20}
                                    color={isFavorite ? colors.primary : colors.textPrimary}
                                    weight={isFavorite ? 'fill' : 'regular'}
                                />
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
                            onPress={() => {
                                if (isLive) {
                                    changeChannel(-1);
                                    return;
                                }
                                handleSeekBy(-SEEK_STEP_SECONDS);
                            }}
                        >
                            <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
                            <Text style={styles.seekLabel}>{isLive ? 'CH-' : '10s'}</Text>
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
                            onPress={() => {
                                if (isLive) {
                                    changeChannel(1);
                                    return;
                                }
                                handleSeekBy(SEEK_STEP_SECONDS);
                            }}
                        >
                            <Icon name="arrowRight" size={24} color={colors.textPrimary} />
                            <Text style={styles.seekLabel}>{isLive ? 'CH+' : '10s'}</Text>
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
                                <Text style={styles.timeText}>
                                    {duration > 0
                                        ? `-${formatTime(Math.max(duration - progressTime, 0))}`
                                        : '--:--'}
                                </Text>
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
                    <TouchableOpacity
                        style={styles.bufferBackButton}
                        onPress={() => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                                return;
                            }
                            navigation.navigate('HomeMain');
                        }}
                    >
                        <Text style={styles.bufferBackButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Error UI */}
            {hasError && (
                <View style={styles.overlay}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <View style={styles.errorActions}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => {
                                if (navigation.canGoBack()) {
                                    navigation.goBack();
                                    return;
                                }
                                navigation.navigate('HomeMain');
                            }}
                        >
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setHasError(false);
                                setErrorMessage('Playback failed');
                                setExtensionIndex(0);
                                setLiveFormatIndex(0);
                                silentRetryCountRef.current = 0;
                                setIsBuffering(Boolean(streamUrl));
                                setPlayerInstanceKey((prev) => prev + 1);
                            }}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={() => setHasError(false)}
                        >
                            <Text style={styles.dismissButtonText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                    {isLive && liveChannelList.length > 1 && (
                        <View style={styles.errorChannelActions}>
                            <TouchableOpacity
                                style={styles.channelSkipButton}
                                onPress={() => {
                                    setHasError(false);
                                    setIsBuffering(true);
                                    changeChannel(-1);
                                }}
                            >
                                <Text style={styles.channelSkipText}>◀ Prev Channel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.channelSkipButton}
                                onPress={() => {
                                    setHasError(false);
                                    setIsBuffering(true);
                                    changeChannel(1);
                                }}
                            >
                                <Text style={styles.channelSkipText}>Next Channel ▶</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Stats Overlay */}
            {showStats && (
                <View style={[styles.statsOverlay, statsOverlayInsetStyle]} pointerEvents="none">
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
                presentationStyle="overFullScreen"
                supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
                onRequestClose={handleSettingsClose}
            >
                <Pressable style={styles.modalBackdrop} onPress={handleSettingsClose} />
                <View style={[styles.settingsSheet, settingsSheetInsetStyle, settingsSheetOrientationStyle]}>
                    {settingsView === 'root' && (
                        <ScrollView
                            style={styles.settingsScroll}
                            contentContainerStyle={styles.settingsScrollContent}
                            showsVerticalScrollIndicator
                        >
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
                        </ScrollView>
                    )}

                    {settingsView === 'quality' && (
                        <ScrollView
                            style={styles.settingsScroll}
                            contentContainerStyle={styles.settingsScrollContent}
                            showsVerticalScrollIndicator
                        >
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
                        </ScrollView>
                    )}

                    {settingsView === 'audio' && (
                        <ScrollView
                            style={styles.settingsScroll}
                            contentContainerStyle={styles.settingsScrollContent}
                            showsVerticalScrollIndicator
                        >
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
                        </ScrollView>
                    )}

                    {settingsView === 'subtitles' && (
                        <ScrollView
                            style={styles.settingsScroll}
                            contentContainerStyle={styles.settingsScrollContent}
                            showsVerticalScrollIndicator
                        >
                            {renderSettingsHeader('Subtitles')}
                            {activeIOSPlaybackSurfaceEngine ? (
                                <>
                                    {renderSettingsOption(
                                        { key: 'vlc-sub-off', label: 'Off' },
                                        selectedVlcSubtitleTrackId === -1,
                                        () => setSelectedVlcSubtitleTrackId(-1)
                                    )}
                                    {renderSettingsOption(
                                        { key: 'vlc-sub-auto', label: 'Auto / Default' },
                                        selectedVlcSubtitleTrackId === -2,
                                        () => setSelectedVlcSubtitleTrackId(-2)
                                    )}
                                    {subtitleOptions.map((option) => renderSettingsOption(
                                        option,
                                        option.key === `vlc-sub-${selectedVlcSubtitleTrackId}`,
                                        () => setSelectedVlcSubtitleTrackId(Number(option.key.replace('vlc-sub-', '')))
                                    ))}
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </ScrollView>
                    )}

                    {settingsView === 'speed' && (
                        <ScrollView
                            style={styles.settingsScroll}
                            contentContainerStyle={styles.settingsScrollContent}
                            showsVerticalScrollIndicator
                        >
                            {renderSettingsHeader('Speed')}
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => renderSettingsOption(
                                { key: `speed-${rate}`, label: `${rate}x` },
                                playbackRate === rate,
                                () => setPlaybackRate(rate)
                            ))}
                        </ScrollView>
                    )}

                    {settingsView === 'aspect' && (
                        <ScrollView
                            style={styles.settingsScroll}
                            contentContainerStyle={styles.settingsScrollContent}
                            showsVerticalScrollIndicator
                        >
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
                        </ScrollView>
                    )}
                </View>
            </Modal>
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
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: spacing.base,
    },
    tapZones: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
    },
    tapZoneSide: {
        flex: 1,
    },
    tapZoneCenter: {
        flex: 1.2,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    titleBlock: {
        flex: 1,
        marginHorizontal: 8,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    topButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
    },
    seekButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(9, 14, 22, 0.56)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    seekLabel: {
        color: colors.textPrimary,
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    playPauseButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(9, 14, 22, 0.68)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    bottomControls: {
        gap: 4,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timeText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    progressContainer: {
        height: 28,
        justifyContent: 'center',
    },
    progressTrack: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    progressBuffered: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.4)',
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
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    scrubTimeBubble: {
        position: 'absolute',
        top: -22,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    scrubTimeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(229, 9, 20, 0.82)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    liveBadgeText: {
        color: colors.textPrimary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    overlayText: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 12,
        fontWeight: '600',
    },
    bufferBackButton: {
        marginTop: spacing.md,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    bufferBackButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    errorText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    errorActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    backButton: {
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    backButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    retryButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    dismissButton: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    dismissButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    errorChannelActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    channelSkipButton: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    channelSkipText: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '600',
    },
    statsOverlay: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: colors.backgroundSecondary,
        padding: 10,
        borderRadius: borderRadius.md,
        gap: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statsText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
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
        gap: 8,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    lockText: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '600',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    settingsSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.backgroundSecondary,
        padding: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: colors.border,
        gap: 8,
        maxHeight: '60%',
        overflow: 'hidden',
    },
    settingsScroll: {
        flex: 1,
    },
    settingsScrollContent: {
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.base,
    },
    settingsTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    settingsRowLabel: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    settingsRowValue: {
        color: colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },
    settingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    settingsBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    settingsHeaderText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    settingsOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 6,
    },
    settingsOptionText: {
        flex: 1,
    },
    settingsOptionLabel: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    settingsOptionDescription: {
        color: colors.textMuted,
        fontSize: 11,
        marginTop: 2,
    },
});

export default PlayerScreen;
