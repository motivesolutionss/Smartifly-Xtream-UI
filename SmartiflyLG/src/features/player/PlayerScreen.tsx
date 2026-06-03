import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import shaka from 'shaka-player';
import {
  mergeStyle,
  playerButton,
  playerButtonActive,
  playerButtonPrimary,
  playerControls,
  playerEyebrow,
  playerHud,
  playerHudBadge,
  playerHudDock,
  playerHudMeta,
  playerHudTopbar,
  playerHudVisible,
  playerProgress,
  playerProgressBuffered,
  playerProgressPlayed,
  playerProgressWrap,
  playerRecovery,
  playerRecoveryCard,
  playerRecoveryCardCompact,
  playerRecoverySpinner,
  playerRecoverySrOnly,
  playerSeekToastAmount,
  playerSeekToastCard,
  playerSeekToastLabel,
  playerSeekToastLeft,
  playerSeekToastRight,
  playerScreen,
  playerScreenEmpty,
  playerSettings,
  playerSettingsBack,
  playerSettingsChoice,
  playerSettingsItem,
  playerSettingsItemActive,
  playerSettingsItemClose,
  playerSettingsItemRow,
  playerSettingsList,
  playerSettingsPanel,
  playerSubtitle,
  playerTime,
  playerTitle,
  playerVideo,
  playerVideoContain,
  playerVideoCover,
  playerVideoFill
} from '../../styles/lgTvStyles';
import { useAppStore } from '../../store/appStore';
import {
  clearLivePlayerSession,
  getLiveHandoffDelayMs,
  getLiveSwitchContext,
  LIVE_CHANNEL_REVISIT_COOLDOWN_MS,
  LIVE_SWITCH_FORBIDDEN_RETRY_MS,
  liveStreamForbiddenUntil,
  liveStreamLastStopTimes,
  hasExhaustedLiveCooldownRetry,
  isLiveStreamForbidden,
  markLiveStreamForbidden,
  performLiveChannelSwitch,
  setLiveSwitchContext,
  type LiveSwitchContext
} from './livePlayerSession';
import { choosePlaybackEngine, type PlaybackEngine } from './playbackEngine';
import useSettingsStore from '../../store/settingsStore';
import useWatchHistoryStore, { useTrackProgress, generateWatchHistoryId } from '../../store/watchHistoryStore';

type PlayerFocusId = 'back' | 'rewind' | 'play' | 'forward' | 'settings';
type PlayerSettingsView = 'root' | 'speed' | 'aspect';

const SEEK_STEP_SECONDS = 10;
const HUD_TIMEOUT_MS = 3500;
const STALL_WATCHDOG_MS = 8000;
const WEBOS_STALL_WATCHDOG_MS = 18000;
const LIVE_NO_PROGRESS_WATCHDOG_MS = 8000;
const LIVE_NO_PROGRESS_RETRY_DELAY_MS = 600;
const WAITING_DEBOUNCE_MS = 3000;
const WEBOS_WAITING_DEBOUNCE_MS = 4000;
const INITIAL_PLAY_GRACE_MS = 12000;
const STARTUP_GUARD_GRACE_MS = 15000;
const STARTUP_GUARD_RETRY_DELAY_MS = 1200;
const NATIVE_LOAD_TIMEOUT_MS = 5000;
const NATIVE_PLAY_TIMEOUT_MS = 5000;
const NATIVE_PROGRESS_TIMEOUT_MS = 9000;
const DEAD_STREAM_CACHE_TTL_MS = 30 * 60 * 1000;
const RETRY_BASE_DELAY_MS = 1200;
const LIVE_RETRY_BASE_DELAY_MS = 300;
const MAX_RETRY_ATTEMPTS = 5;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const ASPECT_OPTIONS = ['contain', 'cover', 'fill'] as const;
const PLAYER_LOG_PREFIX = '[LG Player]';
const WEBOS_HLS_MEDIA_OPTION_VALUE = JSON.stringify({ mediaTransportType: 'HLS' });
const deadStreamUntilByUrl = new Map<string, number>();

function isM3u8Url(value: string) {
  return value.split('?')[0]?.toLowerCase().endsWith('.m3u8') ?? false;
}

function clearVideoSources(video: HTMLVideoElement) {
  Array.from(video.querySelectorAll('source')).forEach((source) => source.remove());
}

function applyWebOSHlsMediaOption(video: HTMLVideoElement, src: string) {
  clearVideoSources(video);
  video.removeAttribute('src');

  const source = document.createElement('source');
  source.src = src;
  source.type = 'application/vnd.apple.mpegurl';
  source.setAttribute('mediaoption', WEBOS_HLS_MEDIA_OPTION_VALUE);
  video.appendChild(source);
}

function isStreamTemporarilyUnavailable(streamUrl: string) {
  const until = deadStreamUntilByUrl.get(streamUrl);
  if (!until) {
    return false;
  }

  if (until <= Date.now()) {
    deadStreamUntilByUrl.delete(streamUrl);
    return false;
  }

  return true;
}

function markStreamTemporarilyUnavailable(streamUrl: string, ttlMs = DEAD_STREAM_CACHE_TTL_MS) {
  deadStreamUntilByUrl.set(streamUrl, Date.now() + ttlMs);
}

function getMediaTransportAction(key: string, keyCode?: number) {
  if (key === 'MediaRewind' || key === 'MediaTrackPrevious' || key === 'Rewind' || keyCode === 412) {
    return 'rewind';
  }

  if (key === 'MediaFastForward' || key === 'MediaTrackNext' || key === 'FastForward' || keyCode === 417) {
    return 'forward';
  }

  if (
    key === 'MediaPlayPause' ||
    key === 'MediaPlay' ||
    key === 'MediaPause' ||
    key === 'PlayPause' ||
    keyCode === 415 ||
    keyCode === 19
  ) {
    return 'toggle';
  }

  if (key === 'MediaStop' || keyCode === 413) {
    return 'stop';
  }

  return null;
}

function formatTime(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function guessMimeTypeFromStreamUrl(streamUrl: string) {
  const cleanUrl = streamUrl.split('?')[0]?.toLowerCase() ?? '';

  if (cleanUrl.endsWith('.mp4')) {
    return 'video/mp4';
  }

  if (cleanUrl.endsWith('.mkv')) {
    return 'video/x-matroska';
  }

  if (cleanUrl.endsWith('.webm')) {
    return 'video/webm';
  }

  if (cleanUrl.endsWith('.ts')) {
    return 'video/mp2t';
  }

  if (cleanUrl.endsWith('.m3u8')) {
    return 'application/vnd.apple.mpegurl';
  }

  return '';
}

function summarizeHeaders(headers: Headers) {
  const keys = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'server',
    'date',
    'cache-control',
    'last-modified',
    'etag',
    'access-control-allow-origin',
    'access-control-allow-headers',
    'access-control-allow-methods',
    'vary'
  ];

  return keys.reduce<Record<string, string>>((accumulator, key) => {
    const value = headers.get(key);
    if (value) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

function formatHeaderRows(headers: Record<string, string>) {
  return Object.entries(headers).map(([header, value]) => ({ header, value }));
}

async function probeStreamHeaders(streamUrl: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);

  const tryRequest = async (method: 'HEAD' | 'GET') => {
    const response = await fetch(streamUrl, {
      method,
      mode: 'cors',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined
    });

    return {
      method,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      type: response.type,
      headers: summarizeHeaders(response.headers)
    };
  };

  try {
    const headAttempt = await tryRequest('HEAD');
    if (headAttempt.status === 405 || headAttempt.status === 501 || !headAttempt.headers['content-type']) {
      try {
        return await tryRequest('GET');
      } catch (error) {
        return {
          ...headAttempt,
          fallbackError: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return headAttempt;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function resolveRedirectedStreamUrl(streamUrl: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal
    });

    if (!response.ok) {
      return streamUrl;
    }

    const resolvedUrl = response.url || streamUrl;
    if (resolvedUrl !== streamUrl) {
      console.debug(`${PLAYER_LOG_PREFIX} resolved redirected stream url`, {
        from: streamUrl,
        to: resolvedUrl,
        status: response.status,
        contentType: response.headers.get('content-type') ?? ''
      });
    }

    return resolvedUrl;
  } catch (error) {
    console.debug(`${PLAYER_LOG_PREFIX} stream url resolution failed`, {
      streamUrl,
      error: error instanceof Error ? error.message : String(error)
    });
    return streamUrl;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getBufferedTime(video: HTMLVideoElement | null) {
  if (!video || video.buffered.length === 0) {
    return 0;
  }

  try {
    return video.buffered.end(video.buffered.length - 1);
  } catch {
    return 0;
  }
}

async function awaitPlayWithTimeout(video: HTMLVideoElement, timeoutMs: number) {
  const playPromise = video.play();
  if (!playPromise) {
    return;
  }

  await Promise.race([
    playPromise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`video.play() timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

function waitForMs(delayMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function looksForbiddenLikeMessage(message: string | undefined) {
  const normalized = (message ?? '').toLowerCase();
  return (
    normalized.includes('403') ||
    normalized.includes('forbidden') ||
    normalized.includes('denied') ||
    normalized.includes('http error')
  );
}


function isActiveLiveSwitchTarget(
  playbackKind: string | undefined,
  currentLiveStreamId: number | null,
  switchContext: LiveSwitchContext
) {
  return (
    playbackKind === 'live' &&
    currentLiveStreamId != null &&
    switchContext.fromSwitch &&
    switchContext.streamId === currentLiveStreamId
  );
}

function shouldDeferLiveSwitchFallback(switchContext: LiveSwitchContext, cooldownHoldActive: boolean) {
  if (!switchContext.fromSwitch) {
    return false;
  }

  return cooldownHoldActive || !switchContext.cooldownRetryUsed;
}

function isRecentlyStoppedStream(
  streamId: number | null,
  lastStopTimes: Map<number, number>,
  withinMs: number
) {
  if (streamId == null) {
    return false;
  }

  const lastStop = lastStopTimes.get(streamId) ?? 0;
  return lastStop > 0 && Date.now() - lastStop < withinMs;
}

function hasInPlayerLiveQueue(playback: { kind?: string; liveQueue?: unknown[] } | null | undefined) {
  return playback?.kind === 'live' && Array.isArray(playback.liveQueue) && playback.liveQueue.length > 0;
}

function shouldHoldLiveReconnect({
  playbackKind,
  streamId,
  hasLiveQueue,
  switchContext,
  cooldownHoldActive,
  lastStopTimes,
  forbiddenUntilByStream,
  revisitCooldownMs
}: {
  playbackKind: string | undefined;
  streamId: number | null;
  hasLiveQueue: boolean;
  switchContext: LiveSwitchContext;
  cooldownHoldActive: boolean;
  lastStopTimes: Map<number, number>;
  forbiddenUntilByStream: Map<number, number>;
  revisitCooldownMs: number;
}) {
  if (playbackKind !== 'live' || streamId == null || !hasLiveQueue) {
    return false;
  }

  const forbiddenUntil = forbiddenUntilByStream.get(streamId) ?? 0;
  if (forbiddenUntil > Date.now()) {
    return true;
  }

  if (
    isActiveLiveSwitchTarget(playbackKind, streamId, switchContext) &&
    shouldDeferLiveSwitchFallback(switchContext, cooldownHoldActive)
  ) {
    return true;
  }

  return isRecentlyStoppedStream(streamId, lastStopTimes, revisitCooldownMs);
}

function looksLikeLiveReconnectFailure(message: string | undefined, mediaErrorMessage?: string | null) {
  const combined = `${message ?? ''} ${mediaErrorMessage ?? ''}`.toLowerCase();
  return (
    looksForbiddenLikeMessage(combined) ||
    combined.includes('format error') ||
    combined.includes('media_element_error')
  );
}

function isUnsupportedNativeDemuxError(message: string | undefined, mediaErrorCode?: number | null) {
  const combined = (message ?? '').toLowerCase();
  return (
    mediaErrorCode === 4 &&
    (combined.includes('demuxer_error_could_not_open') ||
      combined.includes('ffmpegdemuxer: open context failed') ||
      combined.includes('could not open'))
  );
}

function rewriteHlsPlaylistText(text: string, finalUrl: string) {
  if (!text.trim().startsWith('#EXTM3U')) {
    return null;
  }

  const base = new URL(finalUrl);
  let rewriteCount = 0;

  const rewritten = text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      if (/^https?:\/\//i.test(trimmed)) {
        return line;
      }

      rewriteCount++;

      if (trimmed.startsWith('/')) {
        return `${base.origin}${trimmed}`;
      }

      return new URL(trimmed, finalUrl).toString();
    })
    .join('\n');

  return { playlistText: rewritten, finalUrl, rewriteCount };
}

/**
 * Fetches an HLS media playlist, follows redirects, rewrites all root-relative
 * and relative segment URIs to absolute URLs using the final CDN origin, and
 * returns the rewritten playlist text.
 *
 * This is the core fix for providers (e.g. Xtream/Cloudflare) whose CDN issues
 * root-relative segment paths like /hlsr/... that webOS native HLS and Shaka
 * cannot resolve when the playlist is served behind a 302 redirect.
 *
 * Returns null on any failure — callers must fall back to the original URL.
 */
async function fetchAndRewriteHlsPlaylist(
  streamUrl: string,
  signal?: AbortSignal
): Promise<{ playlistText: string; finalUrl: string } | null> {
  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      redirect: 'follow',
      signal
    });

    if (!response.ok) {
      console.warn(`${PLAYER_LOG_PREFIX} fetchAndRewriteHlsPlaylist: fetch not ok`, {
        status: response.status,
        streamUrl
      });
      return null;
    }

    const finalUrl = response.url || streamUrl;
    const text = await response.text();

    const rewritten = rewriteHlsPlaylistText(text, finalUrl);
    if (!rewritten) {
      console.warn(`${PLAYER_LOG_PREFIX} fetchAndRewriteHlsPlaylist: not a valid m3u8`, {
        finalUrl,
        preview: text.slice(0, 80)
      });
      return null;
    }

    console.warn(`${PLAYER_LOG_PREFIX} fetchAndRewriteHlsPlaylist: success`, {
      streamUrl,
      finalUrl,
      rewriteCount: rewritten.rewriteCount
    });

    return { playlistText: rewritten.playlistText, finalUrl };
  } catch (err) {
    console.warn(`${PLAYER_LOG_PREFIX} fetchAndRewriteHlsPlaylist: exception`, {
      streamUrl,
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}

function PlayerIcon({
  name
}: {
  name: 'back' | 'rewind' | 'play' | 'pause' | 'forward' | 'settings';
}) {
  const commonProps = {
    viewBox: '0 0 24 24',
    width: '1em',
    height: '1em',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': 'true' as const
  };

  switch (name) {
    case 'back':
      return (
        <svg {...commonProps}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      );
    case 'rewind':
      return (
        <svg {...commonProps}>
          <path d="M11 6L4 12l7 6V6z" />
          <path d="M20 6l-7 6 7 6V6z" />
        </svg>
      );
    case 'play':
      return (
        <svg {...commonProps} stroke="none" fill="currentColor">
          <path d="M8 5.8v12.4c0 .8.9 1.3 1.6.8l10-6.2c.7-.4.7-1.4 0-1.8l-10-6.2c-.7-.5-1.6 0-1.6.8z" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...commonProps} stroke="none" fill="currentColor">
          <path d="M7.5 5.5h3.5v13H7.5z" />
          <path d="M13 5.5h3.5v13H13z" />
        </svg>
      );
    case 'forward':
      return (
        <svg {...commonProps}>
          <path d="M4 6l7 6-7 6V6z" />
          <path d="M13 6l7 6-7 6V6z" />
        </svg>
      );
    case 'settings':
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 13.5c.04-.5.04-1 0-1.5l2-1.5-2-3.5-2.4.8a7.4 7.4 0 0 0-1.3-.8L15.2 4h-4.4l-.5 2c-.5.2-.9.5-1.3.8l-2.4-.8-2 3.5 2 1.5c-.04.5-.04 1 0 1.5l-2 1.5 2 3.5 2.4-.8c.4.3.8.6 1.3.8l.5 2h4.4l.5-2c.5-.2.9-.5 1.3-.8l2.4.8 2-3.5-2-1.5z" />
        </svg>
      );
  }
}

function PlayerScreen() {
  const playback = useAppStore((state) => state.selectedPlayback);
  const session = useAppStore((state) => state.session);
  const openPlayback = useAppStore((state) => state.openPlayback);
  const closePlayback = useAppStore((state) => state.closePlayback);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const playbackStartupGuard = useSettingsStore((state) => state.playbackStartupGuard);
  const webosNativeHlsMediaOption = useSettingsStore((state) => state.webosNativeHlsMediaOption);
  const hlsPlaylistRewrite = useSettingsStore((state) => state.hlsPlaylistRewrite);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shakaPlayerRef = useRef<shaka.Player | null>(null);
  const loadGenerationRef = useRef(0);
  const hudTimerRef = useRef<number | null>(null);

  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const lastProgressUpdateRef = useRef<number>(0);
  const liveNativeStartupRetryUsedRef = useRef(false);
  const liveShakaStartupRetryUsedRef = useRef(false);
  const { trackMovie, trackEpisode } = useTrackProgress();

  const reportPlaybackProgress = useCallback((force = false) => {
    const video = videoRef.current;
    if (!video || !playback) return;

    if (playback.kind === 'live') return;

    const durationValue = Number.isFinite(video.duration) ? video.duration : 0;
    const positionValue = video.currentTime || 0;
    if (durationValue <= 0) return;

    const now = Date.now();
    if (!force && now - lastProgressUpdateRef.current < 5000) {
      return;
    }
    lastProgressUpdateRef.current = now;

    const streamId = playback.streamId || Number(playback.id.replace('movie-', '').replace('episode-', '')) || 0;
    if (!streamId) return;

    const thumbnail = playback.posterUrl || playback.backdropUrl;

    if (playback.kind === 'movie') {
      trackMovie(
        streamId,
        playback.title,
        positionValue,
        durationValue,
        thumbnail,
        playback
      );
    } else if (playback.kind === 'series') {
      const seriesId = playback.seriesId || 0;
      trackEpisode(
        streamId,
        seriesId,
        playback.title,
        playback.episodeTitle || 'Episode',
        playback.seasonNumber || 1,
        playback.episodeNumber || 1,
        positionValue,
        durationValue,
        thumbnail,
        playback
      );
    }
  }, [playback, trackMovie, trackEpisode]);
  const retryTimerRef = useRef<number | null>(null);
  const stallTimerRef = useRef<number | null>(null);
  const waitingTimerRef = useRef<number | null>(null);
  const liveSwitchRetryTimerRef = useRef<number | null>(null);
  const liveSwitchCooldownHoldActiveRef = useRef(false);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<PlayerFocusId, HTMLButtonElement | null>>({
    back: null,
    rewind: null,
    play: null,
    forward: null,
    settings: null
  });
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [startupOverlayMessage, setStartupOverlayMessage] = useState<string | null>(null);
  const [seekFeedback, setSeekFeedback] = useState<{ direction: 'backward' | 'forward'; seconds: number } | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  const [liveSessionEpoch, setLiveSessionEpoch] = useState(0);
  const [focusedId, setFocusedId] = useState<PlayerFocusId>('play');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<PlayerSettingsView>('root');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover' | 'fill'>('fill');
  const isLive = playback?.kind === 'live';
  const playbackSources = useMemo(() => {
    if (!playback) {
      return [] as string[];
    }

    const sources = [playback.streamUrl, ...(playback.fallbackUrls ?? [])];
    return sources.filter((source, index, all) => Boolean(source) && all.indexOf(source) === index);
  }, [playback]);
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  const [engineOverride, setEngineOverride] = useState<PlaybackEngine | null>(null);
  const activeStreamUrl = playbackSources[activeStreamIndex] ?? playback?.streamUrl ?? '';
  const currentLiveQueueEntry = useMemo(() => {
    if (!playback || playback.kind !== 'live' || !Array.isArray(playback.liveQueue) || playback.liveQueue.length === 0) {
      return null;
    }

    if (typeof playback.liveIndex === 'number' && playback.liveIndex >= 0 && playback.liveIndex < playback.liveQueue.length) {
      return playback.liveQueue[playback.liveIndex] ?? null;
    }

    return playback.liveQueue.find((entry) => entry.id === playback.id) ?? null;
  }, [playback]);
  const currentLiveStreamId = currentLiveQueueEntry?.streamId ?? null;
  const isPlayingRef = useRef(isPlaying);
  const showSettingsRef = useRef(showSettings);
  const isMutedRef = useRef(isMuted);
  const retryCountRef = useRef(0);
  const activeEngineRef = useRef<PlaybackEngine>('native');
  const sessionRef = useRef(session);
  const liveSessionEpochRef = useRef(liveSessionEpoch);
  const startupAttemptInFlightRef = useRef(false);
  const startupGuardRetryTimerRef = useRef<number | null>(null);
  const startupGuardRetryUsedRef = useRef(false);
  const liveNoProgressWatchdogTimerRef = useRef<number | null>(null);
  const liveNoProgressRetryUsedRef = useRef(false);
  const suppressHudRevealRef = useRef(false);
  const playbackStartedAtRef = useRef(0);
  const lastProgressAtRef = useRef(0);
  const seekFeedbackTimerRef = useRef<number | null>(null);
  const isWebOS = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const userAgent = window.navigator.userAgent || '';
    return /web0s|webos/i.test(userAgent) || typeof (window as Window & { PalmSystem?: unknown }).PalmSystem !== 'undefined';
  }, []);
  const startupGraceMs = playbackStartupGuard ? STARTUP_GUARD_GRACE_MS : INITIAL_PLAY_GRACE_MS;

  const progressPercent = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const bufferPercent = duration > 0 ? Math.min(bufferedTime / duration, 1) : 0;
  const videoKey = isLive
    ? `live-${playback?.id ?? 'empty'}:${liveSessionEpoch}`
    : `${activeStreamUrl || 'empty'}:${loadNonce}`;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    liveSessionEpochRef.current = liveSessionEpoch;
  }, [liveSessionEpoch]);

  useEffect(() => {
    showSettingsRef.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    setActiveStreamIndex(0);
    setEngineOverride(null);
  }, [playback?.id, playback?.streamUrl]);

  const resetVideoElement = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    video.pause();
    clearVideoSources(video);
    video.removeAttribute('src');
    video.load();
  }, []);

  const clearHudTimer = () => {
    if (hudTimerRef.current) {
      window.clearTimeout(hudTimerRef.current);
      hudTimerRef.current = null;
    }
  };

  const clearSeekFeedback = useCallback(() => {
    if (seekFeedbackTimerRef.current) {
      window.clearTimeout(seekFeedbackTimerRef.current);
      seekFeedbackTimerRef.current = null;
    }

    setSeekFeedback(null);
  }, []);

  const clearRecoveryTimers = useCallback(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (stallTimerRef.current) {
      window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }

    if (waitingTimerRef.current) {
      window.clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }

    if (liveSwitchRetryTimerRef.current) {
      window.clearTimeout(liveSwitchRetryTimerRef.current);
      liveSwitchRetryTimerRef.current = null;
    }

    liveSwitchCooldownHoldActiveRef.current = false;
  }, []);

  const clearLiveNoProgressWatchdog = useCallback(() => {
    if (liveNoProgressWatchdogTimerRef.current) {
      window.clearTimeout(liveNoProgressWatchdogTimerRef.current);
      liveNoProgressWatchdogTimerRef.current = null;
    }
  }, []);

  const clearSilentSeekSuppression = useCallback(() => {
    suppressHudRevealRef.current = false;
  }, []);

  const clearStartupGuardRetry = useCallback(() => {
    if (startupGuardRetryTimerRef.current) {
      window.clearTimeout(startupGuardRetryTimerRef.current);
      startupGuardRetryTimerRef.current = null;
    }
  }, []);

  const clearRecoveryState = useCallback(() => {
    clearRecoveryTimers();
    clearLiveNoProgressWatchdog();
    clearStartupGuardRetry();
    clearSilentSeekSuppression();
    retryCountRef.current = 0;
    setRetryCount(0);
    setRecoveryMessage(null);
  }, [clearRecoveryTimers, clearLiveNoProgressWatchdog, clearSilentSeekSuppression, clearStartupGuardRetry]);

  const scheduleLiveNoProgressWatchdog = useCallback(
    (reason: string) => {
      if (!isLive || startupAttemptInFlightRef.current) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.paused || video.seeking) {
        return;
      }

      clearLiveNoProgressWatchdog();
      liveNoProgressWatchdogTimerRef.current = window.setTimeout(() => {
        liveNoProgressWatchdogTimerRef.current = null;

        const activeVideo = videoRef.current;
        if (!activeVideo || activeVideo.paused || activeVideo.seeking || startupAttemptInFlightRef.current) {
          return;
        }

        const stalledFor = Date.now() - lastProgressAtRef.current;
        if (stalledFor < LIVE_NO_PROGRESS_WATCHDOG_MS) {
          return;
        }

        console.warn(`${PLAYER_LOG_PREFIX} live no-progress watchdog fired`, {
          reason,
          stalledFor,
          currentTime: Number.isFinite(activeVideo.currentTime) ? Number(activeVideo.currentTime.toFixed(3)) : activeVideo.currentTime,
          buffered: getBufferedTime(activeVideo),
          readyState: activeVideo.readyState,
          networkState: activeVideo.networkState,
          engine: activeEngineRef.current
        });

        setIsReady(false);
        setRecoveryMessage('Buffering... reconnecting.');
        setStatusMessage('Reconnecting live stream');
        setIsHudVisible(true);
        suppressHudRevealRef.current = false;

        if (!liveNoProgressRetryUsedRef.current) {
          liveNoProgressRetryUsedRef.current = true;
          window.setTimeout(() => {
            if (playbackRef.current?.kind !== 'live') {
              return;
            }

            console.debug(`${PLAYER_LOG_PREFIX} live no-progress quick retry`, {
              reason,
              currentTime: Number.isFinite(activeVideo.currentTime) ? Number(activeVideo.currentTime.toFixed(3)) : activeVideo.currentTime
            });
            setLoadNonce((value) => value + 1);
          }, LIVE_NO_PROGRESS_RETRY_DELAY_MS);
          return;
        }

        const nextEpoch = liveSessionEpochRef.current + 1;
        liveSessionEpochRef.current = nextEpoch;
        liveNoProgressRetryUsedRef.current = false;
        startupAttemptInFlightRef.current = true;
        setEngineOverride(null);
        setLiveSessionEpoch(nextEpoch);
        setLoadNonce((value) => value + 1);
        console.warn(`${PLAYER_LOG_PREFIX} live no-progress full reload`, {
          reason,
          nextEpoch
        });
      }, LIVE_NO_PROGRESS_WATCHDOG_MS);
    },
    [clearLiveNoProgressWatchdog, isLive, setStatusMessage]
  );

  const scheduleStartupGuardRetry = useCallback(
    (reason: string) => {
      if (!playbackStartupGuard || isLive || startupGuardRetryUsedRef.current) {
        return false;
      }

      if (startupGuardRetryTimerRef.current) {
        return true;
      }

      startupGuardRetryUsedRef.current = true;
      startupAttemptInFlightRef.current = true;
      clearRecoveryTimers();
      clearHudTimer();
      setIsReady(false);
      setIsHudVisible(true);
      suppressHudRevealRef.current = false;
      setRecoveryMessage('Buffering...');
      setStatusMessage('Buffering...');
      console.warn(`${PLAYER_LOG_PREFIX} startup guard retry scheduled`, {
        reason,
        streamUrl: activeStreamUrl,
        engine: activeEngineRef.current
      });

      startupGuardRetryTimerRef.current = window.setTimeout(() => {
        startupGuardRetryTimerRef.current = null;
        setRecoveryMessage('Retrying playback...');
        setStatusMessage('Retrying playback');
        setLoadNonce((value) => value + 1);
      }, STARTUP_GUARD_RETRY_DELAY_MS);

      return true;
    },
    [activeStreamUrl, clearRecoveryTimers, isLive, playbackStartupGuard, setStatusMessage]
  );

  useEffect(() => {
    startupGuardRetryUsedRef.current = false;
    clearStartupGuardRetry();
  }, [activeStreamUrl, clearStartupGuardRetry, playback?.id]);

  useEffect(() => {
    liveNativeStartupRetryUsedRef.current = false;
    liveShakaStartupRetryUsedRef.current = false;
    liveNoProgressRetryUsedRef.current = false;
  }, [activeStreamUrl, playback?.id]);

  const teardownPlayer = useCallback(async () => {
    const player = shakaPlayerRef.current;
    if (!player) {
      return;
    }

    console.debug(`${PLAYER_LOG_PREFIX} teardown`);
    shakaPlayerRef.current = null;
    await player.destroy().catch(() => undefined);
  }, []);

  const teardownPlaybackEngines = useCallback(async (video: HTMLVideoElement | null) => {
    await teardownPlayer();
    resetVideoElement(video);
  }, [resetVideoElement, teardownPlayer]);

  const scheduleLiveSwitchCooldownRetry = useCallback(
    (reason: string, cooldownMs: number, streamId: number | null) => {
      if (!streamId) {
        return;
      }

      if (hasExhaustedLiveCooldownRetry(streamId)) {
        startupAttemptInFlightRef.current = false;
        setIsReady(false);
        setRecoveryMessage('Channel is busy. Wait a few seconds and change channel again.');
        setStatusMessage('Channel temporarily unavailable');
        console.warn(`${PLAYER_LOG_PREFIX} live switch cooldown exhausted`, { streamId, reason });
        return;
      }

      if (liveSwitchCooldownHoldActiveRef.current && liveSwitchRetryTimerRef.current) {
        console.debug(`${PLAYER_LOG_PREFIX} live switch cooldown already scheduled`, { streamId, reason });
        return;
      }

      if (liveSwitchRetryTimerRef.current) {
        window.clearTimeout(liveSwitchRetryTimerRef.current);
        liveSwitchRetryTimerRef.current = null;
      }

      markLiveStreamForbidden(streamId, cooldownMs);
      startupAttemptInFlightRef.current = true;
      void teardownPlaybackEngines(videoRef.current);

      clearRecoveryTimers();
      clearHudTimer();
      setIsReady(false);
      setIsHudVisible(false);
      suppressHudRevealRef.current = true;
      setRecoveryMessage(`${reason} Retrying channel in ${Math.ceil(cooldownMs / 1000)}s...`);
      setStatusMessage('Retrying live channel');
      liveSwitchCooldownHoldActiveRef.current = true;
      setLiveSwitchContext({
        streamId,
        fromSwitch: true,
        nativeAttempt: 0,
        cooldownMs,
        cooldownRetryUsed: false
      });

      console.warn(`${PLAYER_LOG_PREFIX} live switch cooldown hold`, {
        streamId,
        cooldownMs,
        reason
      });

      liveSwitchRetryTimerRef.current = window.setTimeout(() => {
        liveSwitchRetryTimerRef.current = null;
        liveSwitchCooldownHoldActiveRef.current = false;
        const nextEpoch = liveSessionEpochRef.current + 1;
        liveSessionEpochRef.current = nextEpoch;
        setLiveSwitchContext({
          streamId,
          fromSwitch: true,
          nativeAttempt: 0,
          cooldownRetryUsed: true,
          cooldownMs: getLiveHandoffDelayMs(streamId)
        });
        loadGenerationRef.current += 1;
        startupAttemptInFlightRef.current = true;
        setEngineOverride(null);
        setLiveSessionEpoch(nextEpoch);
        setLoadNonce((value) => value + 1);
        console.debug(`${PLAYER_LOG_PREFIX} live switch retry`, {
          streamId,
          cooldownMs: getLiveHandoffDelayMs(streamId)
        });
      }, cooldownMs);
    },
    [clearRecoveryTimers, setStatusMessage, teardownPlaybackEngines]
  );

  const applyVideoAudioState = useCallback((video: HTMLVideoElement | null, reason: string) => {
    if (!video) {
      return;
    }

    video.volume = 1;
    video.muted = isMutedRef.current;

    if (isWebOS) {
      console.debug(`${PLAYER_LOG_PREFIX} audio state`, {
        reason,
        volume: video.volume,
        muted: video.muted
      });
    }
  }, [isWebOS]);

  const revealLiveHud = useCallback(() => {
    clearSilentSeekSuppression();
    suppressHudRevealRef.current = false;
    setIsHudVisible(true);
    clearHudTimer();
    hudTimerRef.current = window.setTimeout(() => {
      if (isPlayingRef.current && !showSettingsRef.current) {
        setIsHudVisible(false);
      }
    }, HUD_TIMEOUT_MS);
  }, []);

  const showHUD = useCallback(() => {
    if (playbackRef.current?.kind === 'live') {
      return;
    }

    revealLiveHud();
  }, [revealLiveHud]);

  const requestRetry = useCallback(
    (reason: string) => {
      const currentPlayback = playbackRef.current;
      const switchContext = getLiveSwitchContext();
      const liveStreamId =
        currentPlayback?.kind === 'live'
          ? (currentPlayback.liveQueue?.find((entry) => entry.id === currentPlayback.id)?.streamId ?? null)
          : null;

      if (
        currentPlayback &&
        liveStreamId != null &&
        shouldHoldLiveReconnect({
          playbackKind: currentPlayback.kind,
          streamId: liveStreamId,
          hasLiveQueue: hasInPlayerLiveQueue(currentPlayback),
          switchContext,
          cooldownHoldActive: liveSwitchCooldownHoldActiveRef.current,
          lastStopTimes: liveStreamLastStopTimes,
          forbiddenUntilByStream: liveStreamForbiddenUntil,
          revisitCooldownMs: LIVE_CHANNEL_REVISIT_COOLDOWN_MS
        })
      ) {
        const revisitMs = isRecentlyStoppedStream(
          liveStreamId,
          liveStreamLastStopTimes,
          LIVE_CHANNEL_REVISIT_COOLDOWN_MS
        )
          ? LIVE_CHANNEL_REVISIT_COOLDOWN_MS
          : 0;
        const retryDelay = Math.max(switchContext.cooldownMs, LIVE_SWITCH_FORBIDDEN_RETRY_MS, revisitMs);
        console.warn(`${PLAYER_LOG_PREFIX} live reconnect retry redirected to cooldown`, {
          streamId: liveStreamId,
          reason,
          retryDelay
        });
        scheduleLiveSwitchCooldownRetry('Channel busy or reconnecting.', retryDelay, liveStreamId);
        return;
      }

      if (retryTimerRef.current) {
        return;
      }

      const nextRetry = retryCountRef.current + 1;
      if (nextRetry > MAX_RETRY_ATTEMPTS) {
        clearRecoveryTimers();
        setIsReady(false);
        setRecoveryMessage('Playback could not recover. Please try again.');
        setStatusMessage('Playback could not recover');
        return;
      }

      const delay = isLive ? nextRetry * LIVE_RETRY_BASE_DELAY_MS : Math.pow(2, nextRetry - 1) * RETRY_BASE_DELAY_MS;
      retryCountRef.current = nextRetry;
      setRetryCount(nextRetry);
      setIsReady(false);
      if (!isLive) {
        setIsHudVisible(true);
      }
      setRecoveryMessage(`${reason} Retrying in ${Math.ceil(delay / 1000)}s... (${nextRetry}/${MAX_RETRY_ATTEMPTS})`);
      setStatusMessage(`LG player recovering (${nextRetry}/${MAX_RETRY_ATTEMPTS})`);

      clearRecoveryTimers();
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        setLoadNonce((value) => value + 1);
      }, delay);
    },
    [clearRecoveryTimers, isLive, scheduleLiveSwitchCooldownRetry, setStatusMessage]
  );

  const scheduleWaitingRecovery = useCallback((reason: string) => {
    if (waitingTimerRef.current) {
      return;
    }

    const debounceMs = isWebOS ? WEBOS_WAITING_DEBOUNCE_MS : WAITING_DEBOUNCE_MS;
    waitingTimerRef.current = window.setTimeout(() => {
      waitingTimerRef.current = null;
      const timeSinceStart = playbackStartedAtRef.current > 0 ? Date.now() - playbackStartedAtRef.current : Number.MAX_SAFE_INTEGER;

      if (!isLive && timeSinceStart < INITIAL_PLAY_GRACE_MS) {
        setRecoveryMessage('Buffering... establishing playback.');
        return;
      }

      requestRetry(reason);
    }, debounceMs);
  }, [isLive, isWebOS, requestRetry]);

  const startStallWatchdog = useCallback(
    (reason = 'Stream stalled') => {
      if (stallTimerRef.current) {
        return;
      }

      const watchdogMs = !isLive && isWebOS ? WEBOS_STALL_WATCHDOG_MS : STALL_WATCHDOG_MS;
      const timeSinceStart = playbackStartedAtRef.current > 0 ? Date.now() - playbackStartedAtRef.current : Number.MAX_SAFE_INTEGER;
      if (!isLive && timeSinceStart < startupGraceMs) {
        setRecoveryMessage('Buffering... waiting for a stable segment.');
        scheduleWaitingRecovery(reason);
        return;
      }

      stallTimerRef.current = window.setTimeout(() => {
        stallTimerRef.current = null;
        requestRetry(reason);
      }, watchdogMs);

      setRecoveryMessage(`${reason}. Checking stream...`);
      setIsHudVisible(true);
    },
    [isLive, isWebOS, requestRetry, scheduleWaitingRecovery, startupGraceMs]
  );

  const clearStallWatchdog = useCallback(() => {
    if (stallTimerRef.current) {
      window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }

    if (waitingTimerRef.current) {
      window.clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
  }, []);

  const focusButton = (id: PlayerFocusId) => {
    setFocusedId(id);
    buttonRefs.current[id]?.focus();
  };

  const seekBy = (delta: number, shouldRevealHud = true) => {
    if (isLive) {
      return;
    }

    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    const nextTime = Math.max(0, Math.min((video.currentTime || 0) + delta, video.duration));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);

    const seconds = Math.abs(Math.round(delta));
    if (seconds > 0) {
      const direction = delta > 0 ? 'forward' : 'backward';
      setSeekFeedback((current) =>
        current && current.direction === direction
          ? { direction, seconds: current.seconds + seconds }
          : { direction, seconds }
      );
      if (seekFeedbackTimerRef.current) {
        window.clearTimeout(seekFeedbackTimerRef.current);
      }
      seekFeedbackTimerRef.current = window.setTimeout(() => {
        seekFeedbackTimerRef.current = null;
        setSeekFeedback(null);
      }, 900);
    }

    if (shouldRevealHud) {
      showHUD();
    } else {
      suppressHudRevealRef.current = true;
    }
  };

  const logVideoSnapshot = useCallback(
    (eventName: string, video: HTMLVideoElement, extra: Record<string, unknown> = {}) => {
      console.debug(`${PLAYER_LOG_PREFIX} event:${eventName}`, {
        engine: activeEngineRef.current,
        streamUrl: activeStreamUrl,
        currentTime: Number.isFinite(video.currentTime) ? Number(video.currentTime.toFixed(3)) : video.currentTime,
        duration: Number.isFinite(video.duration) ? Number(video.duration.toFixed(3)) : video.duration,
        buffered: getBufferedTime(video),
        readyState: video.readyState,
        networkState: video.networkState,
        paused: video.paused,
        seeking: video.seeking,
        ended: video.ended,
        muted: video.muted,
        volume: Number.isFinite(video.volume) ? Number(video.volume.toFixed(3)) : video.volume,
        playbackRate: Number.isFinite(video.playbackRate) ? Number(video.playbackRate.toFixed(3)) : video.playbackRate,
        mediaErrorCode: video.error?.code ?? null,
        mediaErrorMessage: video.error?.message ?? null,
        ...extra
      });
    },
    [activeStreamUrl]
  );

  const logPlaybackDiagnostics = useCallback(
    async (
      reason: string,
      details?: {
        errorMessage?: string;
        mediaErrorCode?: number | null;
        mediaErrorMessage?: string | null;
        streamUrlOverride?: string;
      }
    ) => {
      const probeStreamUrl = details?.streamUrlOverride ?? activeStreamUrl;
      const guessedMime = guessMimeTypeFromStreamUrl(probeStreamUrl);
      const probeVideo = document.createElement('video');
      const canPlayType = guessedMime ? probeVideo.canPlayType(guessedMime) : '';

      try {
        const headers = await probeStreamHeaders(probeStreamUrl);
        console.groupCollapsed(`${PLAYER_LOG_PREFIX} stream diagnostics`);
        console.warn('summary', {
          reason,
          title: playback?.title,
          id: playback?.id,
          kind: playback?.kind,
          engine: activeEngineRef.current,
          streamUrl: probeStreamUrl,
          guessedMime,
          canPlayType,
          mediaErrorCode: details?.mediaErrorCode ?? null,
          mediaErrorMessage: details?.mediaErrorMessage ?? null,
          errorMessage: details?.errorMessage ?? null
        });
        console.table(formatHeaderRows(headers.headers));
        console.groupEnd();
      } catch (error) {
        console.groupCollapsed(`${PLAYER_LOG_PREFIX} stream diagnostics probe failed`);
        console.warn('summary', {
          reason,
          title: playback?.title,
          id: playback?.id,
          kind: playback?.kind,
          engine: activeEngineRef.current,
          streamUrl: probeStreamUrl,
          guessedMime,
          canPlayType,
          mediaErrorCode: details?.mediaErrorCode ?? null,
          mediaErrorMessage: details?.mediaErrorMessage ?? null,
          errorMessage: details?.errorMessage ?? null,
          probeError: error instanceof Error ? error.message : String(error)
        });
        console.groupEnd();
      }
    },
    [activeStreamUrl, playback?.id, playback?.kind, playback?.title]
  );

  const livePlaybackActions = useMemo(
    () => ({
      getSelectedPlayback: () => useAppStore.getState().selectedPlayback,
      openPlayback: (playback: NonNullable<ReturnType<typeof useAppStore.getState>['selectedPlayback']>) =>
        useAppStore.getState().openPlayback(playback),
      setStatusMessage: (message: string) => useAppStore.getState().setStatusMessage(message)
    }),
    []
  );

  const switchLiveChannel = useCallback(
    (delta: number) => {
      clearHudTimer();
      setIsHudVisible(false);
      suppressHudRevealRef.current = true;
      setFocusedId('play');
      if (liveSwitchRetryTimerRef.current) {
        window.clearTimeout(liveSwitchRetryTimerRef.current);
        liveSwitchRetryTimerRef.current = null;
      }
      liveSwitchCooldownHoldActiveRef.current = false;
      void performLiveChannelSwitch(delta, livePlaybackActions);
    },
    [livePlaybackActions]
  );

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }

    showHUD();
  };

  const closePlayer = () => {
    // Force final progress report before closing
    reportPlaybackProgress(true);

    clearHudTimer();
    clearRecoveryState();
    clearSilentSeekSuppression();
    setEngineOverride(null);
    void teardownPlaybackEngines(videoRef.current);

    if (currentLiveStreamId) {
      liveStreamLastStopTimes.set(currentLiveStreamId, Date.now());
    }

    clearLivePlayerSession();
    closePlayback();
  };

  useEffect(() => {
    const video = videoRef.current;
    const activePlayback = playback;
    if (!video || !activePlayback) {
      return;
    }

    let cancelled = false;
    const startPlayback = (playback: NonNullable<typeof activePlayback>) => {
      const attachedVideo = video;
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(playback.resumePosition ?? 0);
    setDuration(0);
    setBufferedTime(0);
    clearRecoveryState();
    setShowSettings(false);
    setSettingsView('root');
    setFocusedId('play');
    setIsHudVisible(playback.kind !== 'live');
    setStartupOverlayMessage('Starting playback...');
    if (playback.kind === 'live') {
      clearHudTimer();
      suppressHudRevealRef.current = true;
    }
    setAspectMode('fill');

    // Holds the Blob URL for the rewritten HLS playlist so the cleanup can revoke it.
    async function load() {
      const loadGeneration = ++loadGenerationRef.current;
      startupAttemptInFlightRef.current = true;
      const liveSwitchContext = getLiveSwitchContext();
      const isCurrentSwitchTarget = isActiveLiveSwitchTarget(playback.kind, currentLiveStreamId, liveSwitchContext);
      const deferLiveSwitchFallback = shouldDeferLiveSwitchFallback(
        liveSwitchContext,
        liveSwitchCooldownHoldActiveRef.current
      );
      if (liveSwitchCooldownHoldActiveRef.current && liveSwitchRetryTimerRef.current) {
        console.debug(`${PLAYER_LOG_PREFIX} load skipped during cooldown hold`, {
          id: playback.id,
          streamId: currentLiveStreamId
        });
        return;
      }

      const handoffMs =
        playback.kind === 'live' && currentLiveStreamId != null
          ? Math.max(playback.liveHandoffMs ?? 0, getLiveHandoffDelayMs(currentLiveStreamId))
          : 0;
      const resolvedStreamUrl =
        playback.kind === 'live' && activeStreamUrl.startsWith('http')
          ? await resolveRedirectedStreamUrl(activeStreamUrl)
          : activeStreamUrl;

      // HLS playlist rewrite: fetch the playlist ourselves, follow the redirect,
      // rewrite all root-relative and relative segment paths to absolute URLs,
      // and hand a Blob URL to the native <video> element.
      // This fixes providers (e.g. Xtream/Cloudflare) whose CDN issues root-relative
      // segment paths like /hlsr/... that webOS native HLS cannot resolve correctly
      // after a 302 redirect.
      // Shaka always receives the original CDN URL because it manages its own
      // playlist refresh cycle internally.
      // Controlled by "HLS playlist rewrite" in Settings → Playback.
      let nativeSourceUrl = resolvedStreamUrl; // native always gets the resolved CDN URL

      const isLiveM3u8 = playback.kind === 'live' && isM3u8Url(activeStreamUrl);
      console.warn(`${PLAYER_LOG_PREFIX} hls rewrite check`, {
        isLiveM3u8,
        hlsPlaylistRewrite,
        activeStreamUrl
      });
      if (isLiveM3u8 && hlsPlaylistRewrite) {
        const rewritten = await fetchAndRewriteHlsPlaylist(activeStreamUrl);
        if (rewritten) {
          // nativeSourceUrl stays as resolvedStreamUrl — Shaka fetches it normally
          // and the response filter below rewrites the body on every refresh.
          console.warn(`${PLAYER_LOG_PREFIX} hls playlist rewritten`, {
            from: activeStreamUrl,
            finalCdnUrl: rewritten.finalUrl,
            resolvedUrlKey: resolvedStreamUrl
          });
        } else {
          console.warn(`${PLAYER_LOG_PREFIX} hls playlist rewrite failed, using fallback`, {
            streamUrl: activeStreamUrl
          });
        }
      }

      // Live HLS should prefer the native webOS pipeline first.
      // Shaka is still used for non-HLS or explicit fallback cases, but live
      // IPTV streams on LG have been more stable when webOS handles playlist
      // refreshes and segment fetching directly.
      const preferShakaForLiveHls = true;

      const useWebOSNativeHlsMediaOption =
        isWebOS &&
        playback.kind === 'live' &&
        webosNativeHlsMediaOption &&
        isM3u8Url(resolvedStreamUrl);

      const engineDecision = choosePlaybackEngine({
        playback,
        streamUrl: resolvedStreamUrl,
        overrideEngine: engineOverride,
        preferShakaForLiveHls
      });

      activeEngineRef.current = engineDecision.engine;

      if (engineDecision.engine === 'shaka' && !shaka.Player.isBrowserSupported()) {
        startupAttemptInFlightRef.current = false;
        setStatusMessage('Playback is not supported in this browser');
        return;
      }

      if (!isLive && isStreamTemporarilyUnavailable(activeStreamUrl)) {
        console.warn(`${PLAYER_LOG_PREFIX} stream is temporarily marked unavailable`, {
          streamUrl: activeStreamUrl,
          engine: engineDecision.engine
        });
        startupAttemptInFlightRef.current = false;
        clearRecoveryTimers();
        setIsReady(false);
        setRecoveryMessage('Stream unavailable');
        setStatusMessage('Stream unavailable');
        return;
      }

      try {
        console.warn(`${PLAYER_LOG_PREFIX} load start`, {
          id: playback.id,
          title: playback.title,
          streamUrl: activeStreamUrl,
          resolvedStreamUrl,
          nativeSourceUrl,
          kind: playback.kind,
          liveIndex: playback.liveIndex,
          loadNonce,
          handoffMs,
          engine: engineDecision.engine,
          engineReason: engineDecision.reason,
          useWebOSNativeHlsMediaOption
        });

        setIsReady(false);
        setRecoveryMessage('Loading...');
        setStatusMessage('Loading...');

        if (handoffMs > 0) {
          setRecoveryMessage('Switching channel...');
          await waitForMs(handoffMs);
          if (cancelled || loadGeneration !== loadGenerationRef.current) {
            return;
          }
        }

        if (!isLive && playbackStartupGuard) {
          setRecoveryMessage('Buffering...');
          setStatusMessage('Buffering...');
        }

        await teardownPlaybackEngines(attachedVideo);

        if (cancelled || loadGeneration !== loadGenerationRef.current) {
          return;
        }

        if (engineDecision.engine === 'native') {
          // Native path: use the resolved CDN URL with webOS HLS media option.
          // The webOS native pipeline fetches from the CDN and resolves relative
          // segment paths against the CDN origin — which is correct.
          const useBlobSource = false;
          const preferPlainSrcForLiveDiagnostics = !useWebOSNativeHlsMediaOption;
          const nativeStartupTimeoutMs =
            playback.kind === 'live' ? Math.max(NATIVE_LOAD_TIMEOUT_MS, startupGraceMs) : NATIVE_LOAD_TIMEOUT_MS;
          const nativeStartupStartedAt = Date.now();
          const sourceAttachmentMode =
            useWebOSNativeHlsMediaOption && !useBlobSource && !preferPlainSrcForLiveDiagnostics
              ? 'webos-mediaoption-source'
              : 'plain-video-src';
          if (!preferPlainSrcForLiveDiagnostics && useWebOSNativeHlsMediaOption && !useBlobSource) {
            applyWebOSHlsMediaOption(attachedVideo, nativeSourceUrl);
          } else {
            clearVideoSources(attachedVideo);
            attachedVideo.src = nativeSourceUrl;
          }
          console.warn(`${PLAYER_LOG_PREFIX} native source attached`, {
            mode: sourceAttachmentMode,
            currentSrc: attachedVideo.currentSrc || null,
            srcAttr: attachedVideo.getAttribute('src'),
            sourceCount: attachedVideo.querySelectorAll('source').length,
            hasWebOSMediaOption: useWebOSNativeHlsMediaOption,
            preferPlainSrcForLiveDiagnostics,
            nativeSourceUrl
          });
          attachedVideo.load();
          applyVideoAudioState(attachedVideo, 'native-before-play');
          console.warn(`${PLAYER_LOG_PREFIX} native startup monitor armed`, {
            timeoutMs: nativeStartupTimeoutMs,
            startupGraceMs,
            kind: playback.kind,
            engine: engineDecision.engine
          });

          if (!isLive) {
            await new Promise<void>((resolve, reject) => {
            const diagnosticTimerId = window.setInterval(() => {
              const readyStateLabels: Record<number, string> = {
                0: 'HAVE_NOTHING',
                1: 'HAVE_METADATA',
                2: 'HAVE_CURRENT_DATA',
                3: 'HAVE_FUTURE_DATA',
                4: 'HAVE_ENOUGH_DATA'
              };
              const networkStateLabels: Record<number, string> = {
                0: 'NETWORK_EMPTY',
                1: 'NETWORK_IDLE',
                2: 'NETWORK_LOADING',
                3: 'NETWORK_NO_SOURCE'
              };

              console.warn(`${PLAYER_LOG_PREFIX} native-startup-poll`, {
                engine: activeEngineRef.current,
                streamUrl: activeStreamUrl,
                liveChannel: playback.kind === 'live',
                currentTime: Number.isFinite(attachedVideo.currentTime)
                  ? Number(attachedVideo.currentTime.toFixed(3))
                  : attachedVideo.currentTime,
                duration:
                  playback.kind === 'live'
                    ? null
                    : Number.isFinite(attachedVideo.duration)
                      ? Number(attachedVideo.duration.toFixed(3))
                      : null,
                durationNote: playback.kind === 'live' ? 'duration is not a useful live startup signal' : null,
                buffered: getBufferedTime(attachedVideo),
                readyState: attachedVideo.readyState,
                readyStateLabel: readyStateLabels[attachedVideo.readyState] ?? 'UNKNOWN',
                networkState: attachedVideo.networkState,
                networkStateLabel: networkStateLabels[attachedVideo.networkState] ?? 'UNKNOWN',
                paused: attachedVideo.paused,
                seeking: attachedVideo.seeking,
                ended: attachedVideo.ended,
                muted: attachedVideo.muted,
                volume: Number.isFinite(attachedVideo.volume)
                  ? Number(attachedVideo.volume.toFixed(3))
                  : attachedVideo.volume,
                playbackRate: Number.isFinite(attachedVideo.playbackRate)
                  ? Number(attachedVideo.playbackRate.toFixed(3))
                  : attachedVideo.playbackRate,
                mediaError: {
                  code: attachedVideo.error?.code ?? null,
                  message: attachedVideo.error?.message ?? null
                },
                elapsedMs: Date.now() - nativeStartupStartedAt
              });
            }, 2000);

            const timeoutId = window.setTimeout(() => {
              cleanup();
              reject(new Error(`Native playback startup timed out after ${nativeStartupTimeoutMs}ms`));
            }, nativeStartupTimeoutMs);

            const cleanup = () => {
              window.clearTimeout(timeoutId);
              window.clearInterval(diagnosticTimerId);
              attachedVideo.removeEventListener('loadedmetadata', onLoadedMetadata);
              attachedVideo.removeEventListener('loadeddata', onLoadedData);
              attachedVideo.removeEventListener('canplay', onCanPlay);
              attachedVideo.removeEventListener('error', onNativeError);
            };

            const onLoadedMetadata = () => {
              cleanup();
              resolve();
            };

            const onLoadedData = () => {
              cleanup();
              resolve();
            };

            const onCanPlay = () => {
              cleanup();
              resolve();
            };

            const onNativeError = () => {
              cleanup();
              console.warn(`${PLAYER_LOG_PREFIX} native startup error observed`, {
                elapsedMs: Date.now() - nativeStartupStartedAt,
                code: attachedVideo.error?.code ?? null,
                message: attachedVideo.error?.message ?? null
              });
              reject(attachedVideo.error ?? new Error('Native playback failed to load metadata'));
            };

            attachedVideo.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
            attachedVideo.addEventListener('loadeddata', onLoadedData, { once: true });
            attachedVideo.addEventListener('canplay', onCanPlay, { once: true });
            attachedVideo.addEventListener('error', onNativeError, { once: true });
            });
          }

          if (isLive) {
            await awaitPlayWithTimeout(attachedVideo, Math.max(NATIVE_PLAY_TIMEOUT_MS, startupGraceMs))
              .catch((error) => {
                console.warn(`${PLAYER_LOG_PREFIX} live play promise did not resolve in time`, {
                  message: error instanceof Error ? error.message : String(error),
                  startupGraceMs,
                  timeoutMs: Math.max(NATIVE_PLAY_TIMEOUT_MS, startupGraceMs)
                });
              });
          }

          if ((playback.resumePosition ?? 0) > 0 && !isLive) {
            attachedVideo.currentTime = playback.resumePosition ?? 0;
          }

          if (isLive) {
            await awaitPlayWithTimeout(attachedVideo, NATIVE_PLAY_TIMEOUT_MS).catch((error) => {
              console.warn(`${PLAYER_LOG_PREFIX} live play promise did not resolve in time`, {
                message: error instanceof Error ? error.message : String(error),
                timeoutMs: NATIVE_PLAY_TIMEOUT_MS
              });
            });
          } else {
            await awaitPlayWithTimeout(attachedVideo, NATIVE_PLAY_TIMEOUT_MS);

            await new Promise<void>((resolve, reject) => {
              if (
                !attachedVideo.paused &&
                (attachedVideo.currentTime > 0 || attachedVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
              ) {
                resolve();
                return;
              }

              const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error(`Native playback produced no first-frame progress after ${NATIVE_PROGRESS_TIMEOUT_MS}ms`));
              }, NATIVE_PROGRESS_TIMEOUT_MS);

              const cleanup = () => {
                window.clearTimeout(timeoutId);
                attachedVideo.removeEventListener('timeupdate', onTimeUpdate);
                attachedVideo.removeEventListener('playing', onPlaying);
              };

              const onTimeUpdate = () => {
                if (attachedVideo.currentTime > 0) {
                  cleanup();
                  resolve();
                }
              };

              const onPlaying = () => {
                cleanup();
                resolve();
              };

              attachedVideo.addEventListener('timeupdate', onTimeUpdate, { once: true });
              attachedVideo.addEventListener('playing', onPlaying, { once: true });
            });
          }
        } else {
          const player = new shaka.Player();
          shakaPlayerRef.current = player;

          await player.attach(attachedVideo);
          applyVideoAudioState(attachedVideo, 'after-attach');
          player.configure({
            manifest: {
              retryParameters: isLive
                ? {
                    maxAttempts: 4,
                    baseDelay: 250,
                    backoffFactor: 1.2,
                    fuzzFactor: 0.1,
                    timeout: 5000
                  }
                : undefined
            },
            streaming: {
              bufferingGoal: isWebOS ? 15 : 30,
              rebufferingGoal: isWebOS ? 2.5 : 6,
              bufferBehind: isWebOS ? 20 : 30,
              retryParameters: isLive
                ? {
                    maxAttempts: 4,
                    baseDelay: 250,
                    backoffFactor: 1.2,
                    fuzzFactor: 0.1,
                    timeout: 5000
                  }
                : undefined
            }
          });

          // data: URI playlists are supported natively by Shaka — no scheme registration needed.

          // HLS playlist rewrite response filter: rewrite every live manifest
          // refresh on the fly so Shaka sees the newest media sequence instead
          // of a cached snapshot from the initial load.
          player.getNetworkingEngine()?.registerResponseFilter((_type, response) => {
            const responseUri = response.uri ?? response.originalUri ?? '';
            const rawData = response.data;
            const text =
              typeof rawData === 'string'
                ? rawData
                : rawData instanceof ArrayBuffer
                  ? new TextDecoder().decode(rawData)
                  : rawData instanceof Uint8Array
                    ? new TextDecoder().decode(rawData)
                    : '';

            const rewritten = rewriteHlsPlaylistText(text, responseUri);
            if (!rewritten) {
              return;
            }

            response.data = new TextEncoder().encode(rewritten.playlistText).buffer;
            console.warn(`${PLAYER_LOG_PREFIX} shaka response filter applied`, {
              uri: responseUri,
              rewriteCount: rewritten.rewriteCount
            });
          });

          // Log all requests so we can see segment fetches and any failures
          player.getNetworkingEngine()?.registerRequestFilter((type, request) => {
            if (type === 2) { // SEGMENT type
              console.warn(`${PLAYER_LOG_PREFIX} shaka segment request`, {
                uri: request.uris[0]?.slice(0, 120)
              });
            }
          });

          player.addEventListener('error', (event: Event) => {
            if (cancelled || loadGeneration !== loadGenerationRef.current) {
              return;
            }

            const detail = (event as CustomEvent).detail as { severity?: number; code?: number; message?: string } | undefined;
            const switchContext = getLiveSwitchContext();
            const holdReconnect = shouldHoldLiveReconnect({
              playbackKind: playback.kind,
              streamId: currentLiveStreamId,
              hasLiveQueue: hasInPlayerLiveQueue(playback),
              switchContext,
              cooldownHoldActive: liveSwitchCooldownHoldActiveRef.current,
              lastStopTimes: liveStreamLastStopTimes,
              forbiddenUntilByStream: liveStreamForbiddenUntil,
              revisitCooldownMs: LIVE_CHANNEL_REVISIT_COOLDOWN_MS
            });
            const forbiddenLike = looksForbiddenLikeMessage(detail?.message);
            console.warn(`${PLAYER_LOG_PREFIX} shaka error event`, {
              code: detail?.code,
              severity: detail?.severity,
              message: detail?.message,
              holdReconnect,
              forbiddenLike
            });

            if (holdReconnect && currentLiveStreamId != null) {
              const revisitMs = isRecentlyStoppedStream(
                currentLiveStreamId,
                liveStreamLastStopTimes,
                LIVE_CHANNEL_REVISIT_COOLDOWN_MS
              )
                ? LIVE_CHANNEL_REVISIT_COOLDOWN_MS
                : 0;
              const retryDelay = Math.max(switchContext.cooldownMs, LIVE_SWITCH_FORBIDDEN_RETRY_MS, revisitMs);
              if (forbiddenLike || looksLikeLiveReconnectFailure(detail?.message)) {
                markLiveStreamForbidden(currentLiveStreamId, retryDelay);
              }
              console.warn(`${PLAYER_LOG_PREFIX} shaka live reconnect cooldown hold`, {
                streamId: currentLiveStreamId,
                retryDelay,
                reason: detail?.message
              });
              scheduleLiveSwitchCooldownRetry('Channel busy or reconnecting.', retryDelay, currentLiveStreamId);
              return;
            }

            if (playback.kind === 'live' && detail?.code === 1001) {
              if (holdReconnect && currentLiveStreamId != null) {
                const revisitMs = isRecentlyStoppedStream(
                  currentLiveStreamId,
                  liveStreamLastStopTimes,
                  LIVE_CHANNEL_REVISIT_COOLDOWN_MS
                )
                  ? LIVE_CHANNEL_REVISIT_COOLDOWN_MS
                  : 0;
                const retryDelay = Math.max(switchContext.cooldownMs, LIVE_SWITCH_FORBIDDEN_RETRY_MS, revisitMs);
                scheduleLiveSwitchCooldownRetry('Channel busy or reconnecting.', retryDelay, currentLiveStreamId);
                return;
              }

              requestRetry(detail?.message || 'Live playlist refresh failed');
              return;
            }

            const isRecoverable = detail?.severity === 1;
            if (!isLive && isRecoverable) {
              setIsReady(false);
              setRecoveryMessage(detail?.message || 'Recovering playback...');
              scheduleWaitingRecovery(detail?.message || 'Playback stalled');
              return;
            }

            requestRetry(detail?.message || 'Playback failed');
          });

          let shakaLoadError: unknown = null;
          await player.load(resolvedStreamUrl).catch((err) => {
            shakaLoadError = err;
            console.warn(`${PLAYER_LOG_PREFIX} player.load raw rejection`, {
              message: err instanceof Error ? err.message : String(err),
              code: (err as { code?: number }).code,
              data: (err as { data?: unknown }).data
            });
            throw err;
          });
          console.debug(`${PLAYER_LOG_PREFIX} player.load resolved`, {
            id: playback.id,
            title: playback.title
          });

          if (cancelled) {
            await player.destroy().catch(() => undefined);
            if (shakaPlayerRef.current === player) {
              shakaPlayerRef.current = null;
            }
            return;
          }

          if ((playback.resumePosition ?? 0) > 0 && !isLive) {
            attachedVideo.currentTime = playback.resumePosition ?? 0;
          }

          applyVideoAudioState(attachedVideo, 'before-play');
          await awaitPlayWithTimeout(attachedVideo, NATIVE_PLAY_TIMEOUT_MS).catch(() => undefined);
        }

        console.warn(`${PLAYER_LOG_PREFIX} video.play resolved`, {
          paused: attachedVideo.paused,
          currentTime: attachedVideo.currentTime,
          engine: engineDecision.engine
        });

        if (cancelled) {
          return;
        }

        setIsPlaying(!attachedVideo.paused);
        setIsReady(true);
        playbackStartedAtRef.current = Date.now();
        lastProgressAtRef.current = playbackStartedAtRef.current;
        startupAttemptInFlightRef.current = false;
        if (playback.kind === 'live' && currentLiveStreamId != null && getLiveSwitchContext().streamId === currentLiveStreamId) {
          setLiveSwitchContext({ fromSwitch: false });
        }
        if (playback.kind !== 'live') {
          showHUD();
        } else {
          suppressHudRevealRef.current = true;
        }
      } catch (error) {
        if (!cancelled && loadGeneration === loadGenerationRef.current) {
          const message = error instanceof Error ? error.message : 'Playback failed to start';
          const errorCode = error instanceof Error ? (error as { code?: number }).code ?? null : null;
          const switchContext = getLiveSwitchContext();
          const recentRevisit = isRecentlyStoppedStream(
            currentLiveStreamId,
            liveStreamLastStopTimes,
            LIVE_CHANNEL_REVISIT_COOLDOWN_MS
          );
          const reconnectFailure =
            looksLikeLiveReconnectFailure(message) ||
            (currentLiveStreamId != null && isLive && isLiveStreamForbidden(currentLiveStreamId));
          const holdReconnect = shouldHoldLiveReconnect({
            playbackKind: playback.kind,
            streamId: currentLiveStreamId,
            hasLiveQueue: hasInPlayerLiveQueue(playback),
            switchContext,
            cooldownHoldActive: liveSwitchCooldownHoldActiveRef.current,
            lastStopTimes: liveStreamLastStopTimes,
            forbiddenUntilByStream: liveStreamForbiddenUntil,
            revisitCooldownMs: LIVE_CHANNEL_REVISIT_COOLDOWN_MS
          });
          const shouldCooldownLiveFailure =
            holdReconnect ||
            (isLive &&
              hasInPlayerLiveQueue(playback) &&
              currentLiveStreamId != null &&
              (isCurrentSwitchTarget || recentRevisit || reconnectFailure));
          console.warn(`${PLAYER_LOG_PREFIX} load failed`, {
            message,
            errorCode,
            engine: engineDecision.engine,
            streamUrl: activeStreamUrl,
            resolvedStreamUrl,
            fallbackIndex: activeStreamIndex,
            hasMoreFallbacks: activeStreamIndex + 1 < playbackSources.length,
            holdReconnect,
            recentRevisit,
            reconnectFailure,
            shouldCooldownLiveFailure,
            preferShakaForLiveHls
          });

          if (
            playback.kind === 'live' &&
            engineDecision.engine === 'native' &&
            isUnsupportedNativeDemuxError(message, errorCode)
          ) {
            startupAttemptInFlightRef.current = false;
            clearRecoveryTimers();
            setIsReady(false);
            setRecoveryMessage('Unsupported stream format for this device');
            setStatusMessage('Unsupported stream format');
            void logPlaybackDiagnostics('unsupported native stream format', {
              errorMessage: message,
              mediaErrorCode: errorCode,
              streamUrlOverride: resolvedStreamUrl
            });
            return;
          }

          if (shouldCooldownLiveFailure && currentLiveStreamId != null) {
            if (hasExhaustedLiveCooldownRetry(currentLiveStreamId)) {
              startupAttemptInFlightRef.current = false;
              setIsReady(false);
              setRecoveryMessage('Channel is busy. Wait a few seconds and change channel again.');
              setStatusMessage('Channel temporarily unavailable');
              return;
            }

            const revisitMs = recentRevisit ? LIVE_CHANNEL_REVISIT_COOLDOWN_MS : 0;
            const retryDelay = Math.max(
              getLiveHandoffDelayMs(currentLiveStreamId),
              switchContext.cooldownMs,
              LIVE_SWITCH_FORBIDDEN_RETRY_MS,
              revisitMs
            );
            markLiveStreamForbidden(currentLiveStreamId, retryDelay);
            console.warn(`${PLAYER_LOG_PREFIX} live reconnect cooldown hold`, {
              streamId: currentLiveStreamId,
              retryDelay,
              reason: message
            });
            scheduleLiveSwitchCooldownRetry('Channel busy or reconnecting.', retryDelay, currentLiveStreamId);
            return;
          }

          if (!isLive && playbackStartupGuard && !startupGuardRetryUsedRef.current) {
            if (scheduleStartupGuardRetry(message)) {
              return;
            }
          }

          if (
            playback.kind === 'live' &&
            engineDecision.engine === 'native' &&
            engineOverride == null &&
            !liveNativeStartupRetryUsedRef.current
          ) {
            liveNativeStartupRetryUsedRef.current = true;
            console.warn(`${PLAYER_LOG_PREFIX} retrying live native startup once`, {
              from: activeStreamUrl,
              reason: message
            });
            setRecoveryMessage('Buffering...');
            setStatusMessage('Buffering...');
            setIsReady(false);
            setLoadNonce((value) => value + 1);
            return;
          }

          if (
            engineDecision.engine === 'native' &&
            engineDecision.allowShakaFallback &&
            engineOverride !== 'shaka' &&
            !preferShakaForLiveHls
          ) {
            console.warn(`${PLAYER_LOG_PREFIX} escalating to shaka fallback`, {
              from: activeStreamUrl
            });
            setRecoveryMessage('Retrying with fallback engine...');
            setStatusMessage('Retrying with fallback engine');
            setIsReady(false);
            setEngineOverride('shaka');
            setLoadNonce((value) => value + 1);
            return;
          }

          if (
            playback.kind === 'live' &&
            engineDecision.engine === 'shaka' &&
            engineOverride == null &&
            !liveShakaStartupRetryUsedRef.current
          ) {
            liveShakaStartupRetryUsedRef.current = true;
            console.warn(`${PLAYER_LOG_PREFIX} retrying live shaka startup once`, {
              from: activeStreamUrl,
              reason: message
            });
            setRecoveryMessage('Buffering...');
            setStatusMessage('Buffering...');
            setIsReady(false);
            setEngineOverride('native');
            setLoadNonce((value) => value + 1);
            return;
          }

          if (engineDecision.engine === 'shaka' && !holdReconnect) {
            const nextFallbackIndex = activeStreamIndex + 1;
            const nextFallbackUrl = playbackSources[nextFallbackIndex];
            const allowTsFallback = !(isLive && isWebOS);

            if (nextFallbackUrl && allowTsFallback) {
              console.warn(`${PLAYER_LOG_PREFIX} escalating to fallback source`, {
                from: activeStreamUrl,
                to: nextFallbackUrl,
                nextFallbackIndex
              });
              setRecoveryMessage('Switching to fallback stream...');
              setStatusMessage('Switching to fallback stream');
              setIsReady(false);
              setEngineOverride(null);
              setActiveStreamIndex(nextFallbackIndex);
              return;
            }

            if (isLive && isWebOS && currentLiveStreamId != null && (recentRevisit || reconnectFailure)) {
              const retryDelay = Math.max(switchContext.cooldownMs, LIVE_SWITCH_FORBIDDEN_RETRY_MS, LIVE_CHANNEL_REVISIT_COOLDOWN_MS);
              markLiveStreamForbidden(currentLiveStreamId, retryDelay);
              scheduleLiveSwitchCooldownRetry('Channel busy or reconnecting.', retryDelay, currentLiveStreamId);
              return;
            }

            console.warn(`${PLAYER_LOG_PREFIX} terminal playback failure`, {
              message,
              streamUrl: activeStreamUrl,
              resolvedStreamUrl
            });
            markStreamTemporarilyUnavailable(activeStreamUrl);
            void logPlaybackDiagnostics('terminal playback failure', {
              errorMessage: message,
              streamUrlOverride: resolvedStreamUrl
            });
            startupAttemptInFlightRef.current = false;
            clearRecoveryTimers();
            setIsReady(false);
            setRecoveryMessage('Stream unavailable');
            setStatusMessage('Stream unavailable');
            return;
          }

          console.warn(`${PLAYER_LOG_PREFIX} scheduling retry`, {
            message: error instanceof Error ? error.message : 'Playback failed to start'
          });
          startupAttemptInFlightRef.current = false;
          if (playback.kind === 'live') {
            if (isWebOS && currentLiveStreamId != null && (recentRevisit || reconnectFailure)) {
              const retryDelay = Math.max(LIVE_SWITCH_FORBIDDEN_RETRY_MS, LIVE_CHANNEL_REVISIT_COOLDOWN_MS);
              markLiveStreamForbidden(currentLiveStreamId, retryDelay);
              scheduleLiveSwitchCooldownRetry('Channel busy or reconnecting.', retryDelay, currentLiveStreamId);
              return;
            }
            requestRetry(message);
            return;
          }
          requestRetry(message);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      loadGenerationRef.current += 1;
      console.debug(`${PLAYER_LOG_PREFIX} cleanup`, {
        id: playback.id,
        title: playback.title,
        streamUrl: activeStreamUrl
      });
      // Force final progress report on unmount/teardown
      const currentPlayback = playbackRef.current;
      const durationValue = Number.isFinite(attachedVideo.duration) ? attachedVideo.duration : 0;
      const positionValue = attachedVideo.currentTime || 0;
      if (currentPlayback && currentPlayback.kind !== 'live' && durationValue > 0) {
        const streamId = currentPlayback.streamId || Number(currentPlayback.id.replace('movie-', '').replace('episode-', '')) || 0;
        if (streamId) {
          const progressVal = Math.round((positionValue / durationValue) * 100);
          useWatchHistoryStore.getState().updateProgress({
            type: currentPlayback.kind,
            streamId,
            seriesId: currentPlayback.seriesId,
            seasonNumber: currentPlayback.seasonNumber,
            episodeNumber: currentPlayback.episodeNumber,
            progress: Math.min(Math.max(progressVal, 1), 100),
            position: positionValue,
            duration: durationValue,
            title: currentPlayback.title,
            episodeTitle: currentPlayback.episodeTitle,
            thumbnail: currentPlayback.posterUrl || currentPlayback.backdropUrl,
            data: currentPlayback
          });
        }
      }

      clearHudTimer();
      clearRecoveryTimers();
      clearStartupGuardRetry();
      clearSeekFeedback();
      clearSilentSeekSuppression();
      playbackStartedAtRef.current = 0;
      lastProgressAtRef.current = 0;
      startupAttemptInFlightRef.current = false;
      void teardownPlaybackEngines(attachedVideo);
    };
    };

    return startPlayback(playback);
  }, [
    activeStreamIndex,
    activeStreamUrl,
    applyVideoAudioState,
    clearRecoveryState,
    clearRecoveryTimers,
    clearStartupGuardRetry,
    clearSeekFeedback,
    currentLiveStreamId,
    engineOverride,
    isLive,
    isWebOS,
    loadNonce,
    markLiveStreamForbidden,
    playback,
    playbackStartupGuard,
    playbackSources.length,
    requestRetry,
    scheduleLiveSwitchCooldownRetry,
    scheduleStartupGuardRetry,
    scheduleWaitingRecovery,
    setStatusMessage,
    showHUD,
    startupGraceMs,
    teardownPlaybackEngines
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
      setBufferedTime(getBufferedTime(video));
      lastProgressAtRef.current = Date.now();
      if (playback?.kind === 'live') {
        liveNoProgressRetryUsedRef.current = false;
        clearLiveNoProgressWatchdog();
        scheduleLiveNoProgressWatchdog('Live playback stalled');
      }
      if (!video.paused) {
        playbackStartedAtRef.current = playbackStartedAtRef.current || Date.now();
        // Track watch progress during active playback
        reportPlaybackProgress();
      }
      setIsReady(true);
      clearStallWatchdog();

      const isPlaybackActive = !video.paused && !video.seeking && (isLive || (video.duration > 0 && video.currentTime > 0));
      if (isPlaybackActive) {
        setRecoveryMessage(null);
        setStartupOverlayMessage(null);
      }
    };

    const handleDurationChange = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setBufferedTime(getBufferedTime(video));
    };

    const handleLoadedMetadata = () => {
      logVideoSnapshot('loadedmetadata', video, {
        metadata: true
      });
      handleDurationChange();
      applyVideoAudioState(video, 'loadedmetadata');
    };

    const handleLoadedData = () => {
      logVideoSnapshot('loadeddata', video);
    };

    const handleCanPlay = () => {
      logVideoSnapshot('canplay', video);
    };

    const handleCanPlayThrough = () => {
      logVideoSnapshot('canplaythrough', video);
    };

    const handlePlayState = () => {
      const wasSuppressingHud = suppressHudRevealRef.current;
      logVideoSnapshot('play', video);
      applyVideoAudioState(video, 'play');
      setIsPlaying(true);
      setIsReady(true);
      playbackStartedAtRef.current = playbackStartedAtRef.current || Date.now();
      clearStallWatchdog();
      clearRecoveryState();
      if (playback?.kind === 'live') {
        liveNoProgressRetryUsedRef.current = false;
        scheduleLiveNoProgressWatchdog('Live playback active');
      }
      
      const isPlaybackActive = !video.paused && !video.seeking && (isLive || (video.duration > 0 && video.currentTime > 0));
      if (isPlaybackActive) {
        setRecoveryMessage(null);
        setStartupOverlayMessage(null);
      }
      if (!wasSuppressingHud && playback?.kind !== 'live') {
        showHUD();
      }
    };

    const handlePauseState = () => {
      const wasSuppressingHud = suppressHudRevealRef.current;
      logVideoSnapshot('pause', video);
      setIsPlaying(false);
      clearStallWatchdog();
      clearLiveNoProgressWatchdog();
      if (!wasSuppressingHud && playback?.kind !== 'live') {
        showHUD();
      }
    };

    const handleSeekingState = () => {
      logVideoSnapshot('seeking', video);
    };

    const handleSeekedState = () => {
      logVideoSnapshot('seeked', video);
      const isPlaybackActive = !video.paused && !video.seeking && (isLive || (video.duration > 0 && video.currentTime > 0));
      if (isPlaybackActive) {
        setRecoveryMessage(null);
        setStartupOverlayMessage(null);
      }
    };

    const handleWaitingState = () => {
      if (startupAttemptInFlightRef.current) {
        logVideoSnapshot('waiting-ignored-startup', video, {
          reason: 'startupAttemptInFlight'
        });
        return;
      }

      logVideoSnapshot('waiting', video);
      setIsReady(false);
      if (!suppressHudRevealRef.current && !video.paused) {
        setRecoveryMessage('Buffering...');
        if (playback?.kind === 'live') {
          scheduleLiveNoProgressWatchdog('Buffering stalled');
        } else {
          scheduleWaitingRecovery('Buffering stalled');
        }
      }
    };

    const handleStalledState = () => {
      if (startupAttemptInFlightRef.current) {
        logVideoSnapshot('stalled-ignored-startup', video, {
          reason: 'startupAttemptInFlight'
        });
        return;
      }

      logVideoSnapshot('stalled', video);
      setIsReady(false);
      if (!suppressHudRevealRef.current) {
        if (playback?.kind === 'live') {
          scheduleLiveNoProgressWatchdog('Stream stalled');
        } else {
          startStallWatchdog('Stream stalled');
        }
      }
    };

    const handleVolumeChange = () => {
      setIsMuted(video.muted);
      if (!video.muted && video.volume < 1) {
        video.volume = 1;
      }
    };

    const handleVideoError = () => {
      const mediaError = video.error;
      logVideoSnapshot('error', video, {
        code: mediaError?.code ?? null,
        message: mediaError?.message ?? null
      });

      if (!mediaError || mediaError.code === MediaError.MEDIA_ERR_ABORTED) {
        return;
      }

      if (activeEngineRef.current === 'native' && isUnsupportedNativeDemuxError(mediaError.message, mediaError.code)) {
        console.warn(`${PLAYER_LOG_PREFIX} unsupported native stream format`, {
          code: mediaError.code,
          message: mediaError.message,
          streamUrl: activeStreamUrl
        });
        startupAttemptInFlightRef.current = false;
        clearRecoveryTimers();
        setIsReady(false);
        setRecoveryMessage('Unsupported stream format for this device');
        setStatusMessage('Unsupported stream format');
        return;
      }

      const switchContext = getLiveSwitchContext();
      const holdReconnect =
        isLive &&
        currentLiveStreamId != null &&
        shouldHoldLiveReconnect({
          playbackKind: playback?.kind,
          streamId: currentLiveStreamId,
          hasLiveQueue: hasInPlayerLiveQueue(playback),
          switchContext,
          cooldownHoldActive: liveSwitchCooldownHoldActiveRef.current,
          lastStopTimes: liveStreamLastStopTimes,
          forbiddenUntilByStream: liveStreamForbiddenUntil,
          revisitCooldownMs: LIVE_CHANNEL_REVISIT_COOLDOWN_MS
        });

      if (holdReconnect && currentLiveStreamId != null) {
        const revisitMs = isRecentlyStoppedStream(
          currentLiveStreamId,
          liveStreamLastStopTimes,
          LIVE_CHANNEL_REVISIT_COOLDOWN_MS
        )
          ? LIVE_CHANNEL_REVISIT_COOLDOWN_MS
          : 0;
        const retryDelay = Math.max(switchContext.cooldownMs, LIVE_SWITCH_FORBIDDEN_RETRY_MS, revisitMs);
        if (looksLikeLiveReconnectFailure(undefined, mediaError.message)) {
          markLiveStreamForbidden(currentLiveStreamId, retryDelay);
        }
        console.warn(`${PLAYER_LOG_PREFIX} video error live reconnect cooldown hold`, {
          streamId: currentLiveStreamId,
          code: mediaError.code,
          message: mediaError.message,
          retryDelay
        });
        scheduleLiveSwitchCooldownRetry('Channel busy or reconnecting.', retryDelay, currentLiveStreamId);
        return;
      }

      if (startupAttemptInFlightRef.current) {
        console.warn(`${PLAYER_LOG_PREFIX} startup video error observed`, {
          code: mediaError?.code,
          message: mediaError?.message,
          engine: activeEngineRef.current,
          streamUrl: activeStreamUrl
        });
        if (scheduleStartupGuardRetry(mediaError?.message || 'Playback startup error')) {
          return;
        }
        return;
      }

      if (activeEngineRef.current === 'native') {
        const nextFallbackIndex = activeStreamIndex + 1;
        const nextFallbackUrl = playbackSources[nextFallbackIndex];
        const allowShakaFallback = !(isLive && isM3u8Url(activeStreamUrl));

        if (nextFallbackUrl) {
          console.debug(`${PLAYER_LOG_PREFIX} native fallback`, {
            from: activeStreamUrl,
            to: nextFallbackUrl,
            nextFallbackIndex
          });
          setRecoveryMessage('Switching to fallback stream...');
          setStatusMessage('Switching to fallback stream');
          setIsReady(false);
          setActiveStreamIndex(nextFallbackIndex);
          return;
        }

        if (!engineOverride && allowShakaFallback) {
          console.debug(`${PLAYER_LOG_PREFIX} native fallback to shaka`, {
            url: activeStreamUrl
          });
          setRecoveryMessage('Retrying with fallback engine...');
          setStatusMessage('Retrying with fallback engine');
          setIsReady(false);
          setEngineOverride('shaka');
          setLoadNonce((value) => value + 1);
          return;
        }

        if (!allowShakaFallback) {
          console.debug(`${PLAYER_LOG_PREFIX} native fallback to shaka suppressed for live HLS`, {
            url: activeStreamUrl
          });
        }
      }

      setIsReady(false);
      if (isLive) {
        startStallWatchdog('Live stream error');
        return;
      }

      scheduleWaitingRecovery('Playback error');
    };

    const handleEnded = () => {
      logVideoSnapshot('ended', video);
      setIsPlaying(false);
      setIsHudVisible(true);
      setStatusMessage('Playback finished');

      // Mark as completed in watch history store
      const currentPlayback = playbackRef.current;
      if (currentPlayback && currentPlayback.kind !== 'live') {
        const streamId = currentPlayback.streamId || Number(currentPlayback.id.replace('movie-', '').replace('episode-', '')) || 0;
        if (streamId) {
          const id = generateWatchHistoryId(currentPlayback.kind, streamId);
          useWatchHistoryStore.getState().markCompleted(id);
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('play', handlePlayState);
    video.addEventListener('playing', handlePlayState);
    video.addEventListener('pause', handlePauseState);
    video.addEventListener('seeking', handleSeekingState);
    video.addEventListener('seeked', handleSeekedState);
    video.addEventListener('waiting', handleWaitingState);
    video.addEventListener('stalled', handleStalledState);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('play', handlePlayState);
      video.removeEventListener('playing', handlePlayState);
      video.removeEventListener('pause', handlePauseState);
      video.removeEventListener('seeking', handleSeekingState);
      video.removeEventListener('seeked', handleSeekedState);
      video.removeEventListener('waiting', handleWaitingState);
      video.removeEventListener('stalled', handleStalledState);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleVideoError);
    };
  }, [
    activeStreamIndex,
    activeStreamUrl,
    applyVideoAudioState,
    clearRecoveryState,
    clearLiveNoProgressWatchdog,
    clearStallWatchdog,
    currentLiveStreamId,
    engineOverride,
    isLive,
    playback?.kind,
    playbackSources,
    markLiveStreamForbidden,
    scheduleLiveSwitchCooldownRetry,
    scheduleLiveNoProgressWatchdog,
    scheduleWaitingRecovery,
    startStallWatchdog,
    setStatusMessage
  ]);

  useEffect(() => {
      if (!playback) {
        return;
      }

      const onKeyDown = (event: KeyboardEvent) => {
      const transportAction = getMediaTransportAction(event.key, event.keyCode);
      if (transportAction) {
        event.preventDefault();
        event.stopPropagation();

        if (transportAction === 'rewind') {
          if (isLive) {
            void switchLiveChannel(-1);
          } else {
            seekBy(-SEEK_STEP_SECONDS, false);
          }
          return;
        }

        if (transportAction === 'forward') {
          if (isLive) {
            void switchLiveChannel(1);
          } else {
            seekBy(SEEK_STEP_SECONDS, false);
          }
          return;
        }

        if (transportAction === 'stop') {
          closePlayer();
          return;
        }

        togglePlayback();
        return;
      }

      if (showSettings) {
        const focusables = Array.from(settingsPanelRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
        const currentIndex = focusables.findIndex((button) => button === document.activeElement);

        if (event.key === 'Escape' || event.key === 'Backspace') {
          event.preventDefault();
          setShowSettings(false);
          setSettingsView('root');
          return;
        }

        if (event.key === 'Enter' && currentIndex >= 0) {
          event.preventDefault();
          focusables[currentIndex]?.click();
          return;
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          if (focusables.length === 0) {
            return;
          }

          const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
          const nextIndex = currentIndex >= 0
            ? (currentIndex + step + focusables.length) % focusables.length
            : 0;
          focusables[nextIndex]?.focus();
        }
        return;
      }

      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        closePlayer();
        return;
      }

      if (isLive && !isHudVisible && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        event.stopPropagation();
        void switchLiveChannel(event.key === 'ArrowLeft' ? -1 : 1);
        return;
      }

      if (isHudVisible && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        const order: PlayerFocusId[] = ['back', 'rewind', 'play', 'forward', 'settings'];
        const currentIndex = order.indexOf(focusedId);
        const nextId = event.key === 'ArrowLeft'
          ? order[Math.max(0, currentIndex - 1)]
          : order[Math.min(order.length - 1, currentIndex + 1)];
        focusButton(nextId);
        return;
      }

      if (!isHudVisible && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        event.stopPropagation();
        seekBy(event.key === 'ArrowLeft' ? -SEEK_STEP_SECONDS : SEEK_STEP_SECONDS, false);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (isLive) {
          revealLiveHud();
        } else {
          showHUD();
        }
        focusButton('play');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setIsHudVisible(false);
        clearSilentSeekSuppression();
        return;
      }

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (isHudVisible && focusedId !== 'play') {
          buttonRefs.current[focusedId]?.click();
          return;
        }
        togglePlayback();
        return;
      }

      if (!isHudVisible) {
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closePlayer, focusedId, isHudVisible, isLive, playback, revealLiveHud, seekBy, showHUD, showSettings, settingsView, switchLiveChannel]);

  useEffect(() => {
    if (isHudVisible) {
      if (playback?.kind === 'live') {
        revealLiveHud();
      } else {
        showHUD();
      }
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    setFocusedId('play');
  }, [isHudVisible, playback?.kind, revealLiveHud, showHUD]);

  useEffect(() => {
    if (!showSettings) {
      return;
    }

    const firstButton = settingsPanelRef.current?.querySelector<HTMLButtonElement>('button');
    firstButton?.focus();
  }, [showSettings, settingsView]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const videoFitStyle =
    aspectMode === 'contain' ? playerVideoContain : aspectMode === 'fill' ? playerVideoFill : playerVideoCover;

  if (!playback) {
    return (
      <section style={mergeStyle(playerScreen, playerScreenEmpty)} aria-label="Playback">
        <p style={playerEyebrow}>Playback</p>
        <h1 style={playerTitle}>No stream selected</h1>
        <button type="button" style={mergeStyle(playerButton, playerButtonPrimary)} onClick={closePlayer}>
          Back
        </button>
      </section>
    );
  }

  const playIconName = isPlaying ? 'pause' : 'play';

  return (
    <section style={playerScreen} aria-label={playback.title}>
      <video
        key={videoKey}
        ref={videoRef}
        style={mergeStyle(playerVideo, videoFitStyle)}
        playsInline
        muted={isMuted}
        preload="auto"
      />

      {recoveryMessage ? (
        <div style={playerRecovery} role="status" aria-live="polite">
          {(recoveryMessage.toLowerCase().includes('unavailable') || recoveryMessage.toLowerCase().includes('could not recover')) ? (
            <div style={playerRecoveryCard}>
              <span style={{
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 800
              }}>
                {recoveryMessage}
              </span>
            </div>
          ) : (
            <div style={playerRecoverySpinner} aria-hidden="true" />
          )}
        </div>
      ) : startupOverlayMessage ? (
        <div style={playerRecovery} role="status" aria-live="polite">
          <div style={playerRecoverySpinner} aria-hidden="true" />
        </div>
      ) : null}

      {seekFeedback ? (
        <div style={seekFeedback.direction === 'forward' ? playerSeekToastRight : playerSeekToastLeft} aria-hidden="true">
          <div style={playerSeekToastCard}>
            <div style={playerSeekToastAmount}>{`${seekFeedback.direction === 'forward' ? '+' : '-'}${seekFeedback.seconds}s`}</div>
          </div>
        </div>
      ) : null}

      <header style={mergeStyle(playerHud, isHudVisible && playerHudVisible)}>
        <div style={playerHudTopbar}>
          <div style={playerHudBadge}>
            <p style={playerEyebrow}>
              {playback.kind === 'live' ? 'Live TV' : playback.kind === 'movie' ? 'Movie' : 'Series'}
            </p>
            <h1 style={playerTitle}>{playback.title}</h1>
            {playback.episodeTitle ? <p style={playerSubtitle}>{playback.episodeTitle}</p> : null}
          </div>

          <div style={playerHudMeta}>
            <span>{isReady ? 'Ready' : 'Loading'}</span>
            <span>{isMuted ? 'Muted' : 'Audio on'}</span>
          </div>
        </div>

        {isHudVisible ? (
          <footer style={playerHudDock}>
            <div style={playerProgressWrap}>
              <div style={playerTime}>
                <span>{formatTime(currentTime)}</span>
                {!isLive ? <span>-{formatTime(Math.max(duration - currentTime, 0))}</span> : <span>LIVE</span>}
              </div>
              <div style={playerProgress} aria-hidden="true">
                <div style={{ ...playerProgressBuffered, width: `${bufferPercent * 100}%` }} />
                <div style={{ ...playerProgressPlayed, width: `${progressPercent * 100}%` }} />
              </div>
            </div>

            <div style={playerControls}>
              <button
                ref={(node) => {
                  buttonRefs.current.back = node;
                }}
                type="button"
                style={mergeStyle(playerButton, focusedId === 'back' && playerButtonActive)}
                onFocus={() => setFocusedId('back')}
                onClick={closePlayer}
                aria-label="Back"
                title="Back"
              >
                <PlayerIcon name="back" />
              </button>

              <button
                ref={(node) => {
                  buttonRefs.current.rewind = node;
                }}
                type="button"
                style={mergeStyle(playerButton, focusedId === 'rewind' && playerButtonActive)}
                onFocus={() => setFocusedId('rewind')}
                onClick={() => {
                  if (isLive) {
                    void switchLiveChannel(-1);
                    return;
                  }

                  seekBy(-SEEK_STEP_SECONDS);
                }}
                aria-label={isLive ? 'Prev Channel' : 'Rewind 10 seconds'}
                title={isLive ? 'Prev Channel' : 'Rewind 10 seconds'}
              >
                <PlayerIcon name="rewind" />
              </button>

              <button
                ref={(node) => {
                  buttonRefs.current.play = node;
                }}
                type="button"
                style={mergeStyle(playerButton, playerButtonPrimary, focusedId === 'play' && playerButtonActive)}
                onFocus={() => setFocusedId('play')}
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                <PlayerIcon name={playIconName} />
              </button>

              <button
                ref={(node) => {
                  buttonRefs.current.forward = node;
                }}
                type="button"
                style={mergeStyle(playerButton, focusedId === 'forward' && playerButtonActive)}
                onFocus={() => setFocusedId('forward')}
                onClick={() => {
                  if (isLive) {
                    void switchLiveChannel(1);
                    return;
                  }

                  seekBy(SEEK_STEP_SECONDS);
                }}
                aria-label={isLive ? 'Next Channel' : 'Forward 10 seconds'}
                title={isLive ? 'Next Channel' : 'Forward 10 seconds'}
              >
                <PlayerIcon name="forward" />
              </button>

              <button
                ref={(node) => {
                  buttonRefs.current.settings = node;
                }}
                type="button"
                style={mergeStyle(playerButton, focusedId === 'settings' && playerButtonActive)}
                onFocus={() => setFocusedId('settings')}
                onClick={() => setShowSettings(true)}
                aria-label="Settings"
                title="Settings"
              >
                <PlayerIcon name="settings" />
              </button>
            </div>
          </footer>
        ) : null}
      </header>

      {showSettings ? (
        <div style={playerSettings} role="dialog" aria-modal="true" aria-label="Player settings">
          <div style={playerSettingsPanel} ref={settingsPanelRef}>
            {settingsView === 'root' ? (
              <>
                <button type="button" style={mergeStyle(playerSettingsItem, playerSettingsItemRow)} onClick={() => setSettingsView('speed')}>
                  <span>Speed</span>
                  <strong>{playbackRate}x</strong>
                </button>
                <button type="button" style={mergeStyle(playerSettingsItem, playerSettingsItemRow)} onClick={() => setSettingsView('aspect')}>
                  <span>Aspect</span>
                  <strong>{aspectMode}</strong>
                </button>
                <button
                  type="button"
                  style={mergeStyle(playerSettingsItem, playerSettingsItemRow)}
                  onClick={() => {
                    setIsMuted((current) => !current);
                    if (videoRef.current) {
                      videoRef.current.muted = !videoRef.current.muted;
                      if (!videoRef.current.muted) {
                        videoRef.current.volume = 1;
                      }
                    }
                  }}
                >
                  <span>Mute</span>
                  <strong>{isMuted ? 'On' : 'Off'}</strong>
                </button>
                <button
                  type="button"
                  style={mergeStyle(playerSettingsItem, playerSettingsItemClose)}
                  onClick={() => {
                    setShowSettings(false);
                    setSettingsView('root');
                    focusButton('play');
                  }}
                >
                  Close
                </button>
              </>
            ) : settingsView === 'speed' ? (
              <>
                <button type="button" style={playerSettingsBack} onClick={() => setSettingsView('root')}>
                  Back
                </button>
                <div style={playerSettingsList}>
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      style={mergeStyle(playerSettingsItem, playerSettingsChoice, playbackRate === rate && playerSettingsItemActive)}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (videoRef.current) {
                          videoRef.current.playbackRate = rate;
                        }
                      }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button type="button" style={playerSettingsBack} onClick={() => setSettingsView('root')}>
                  Back
                </button>
                <div style={playerSettingsList}>
                  {ASPECT_OPTIONS.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      style={mergeStyle(playerSettingsItem, playerSettingsChoice, aspectMode === mode && playerSettingsItemActive)}
                      onClick={() => setAspectMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PlayerScreen;
