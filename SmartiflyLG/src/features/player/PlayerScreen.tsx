import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type HlsConfig,
  type Loader,
  type LoaderCallbacks,
  type LoaderConfiguration,
  type LoaderContext,
  type LoaderStats,
  type PlaylistLoaderConstructor
} from 'hls.js';
import {
  mergeStyle,
  playerButton,
  playerButtonActive,
  playerButtonPrimary,
  playerCenterControls,
  playerCenterButton,
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
  playerVideoFill,
  netflixPanelStyle,
  netflixLeftColumnStyle,
  netflixRightColumnStyle,
  netflixBrandHeaderStyle,
  netflixCategoryButtonStyle,
  netflixCategoryButtonActiveStyle,
  netflixCategoryButtonFocusedStyle,
  netflixCategoryTitleStyle,
  netflixCategoryValueStyle,
  netflixOptionButtonStyle,
  netflixOptionButtonActiveStyle,
  netflixOptionButtonFocusedStyle,
  netflixCheckmarkStyle,
  netflixOptionsListStyle,
  netflixNoOptionsStyle,
  netflixClosePromptStyle,
  playerChannelRail,
  playerChannelCard,
  playerChannelCardActive,
  playerChannelCardFocused,
  playerChannelCardLogo,
  playerChannelCardTitle
} from '../../styles/lgTvStyles';
import { useAppStore } from '../../store/appStore';
import {
  clearLivePlayerSession,
  clearLiveStreamMemory,
  getLiveHandoffDelayMs,
  getLiveSwitchContext,
  hasExhaustedLiveCooldownRetry,
  isLiveStreamForbidden,
  LIVE_CHANNEL_REVISIT_COOLDOWN_MS,
  LIVE_SWITCH_FORBIDDEN_RETRY_MS,
  liveStreamForbiddenUntil,
  liveStreamLastStopTimes,
  markLiveStreamForbidden,
  setLiveSwitchContext,
  type LiveSwitchContext
} from './livePlayerSession';
import { performFreshLiveChannelSwitch } from './liveFreshOpenSwitch';
import { isFreshLiveOpenIsolationActive, setFreshLiveOpenIsolationActive } from './liveFreshOpenTestState';
import { buildLivePlaybackRequest } from '../live/livePlayback';
import { choosePlaybackEngine, type PlaybackEngine, type PlaybackEngineDecision } from './playbackEngine';
import useSettingsStore from '../../store/settingsStore';
import useWatchHistoryStore, { useTrackProgress, generateWatchHistoryId } from '../../store/watchHistoryStore';
import { createXtreamApi, type XtreamShortEpgEntry } from '../../services/api';
import { legacyChromiumBrowser, chrome38CompatMode } from '../../utils/legacyBrowser';

declare global {
  interface Window {
    Hls?: typeof import('hls.js').default;
    shaka?: typeof import('shaka-player').default;
  }
}

type PlayerFocusId = 'back' | 'rewind' | 'play' | 'forward' | 'settings';
type PlayerSettingsView = 'root' | 'speed' | 'aspect' | 'subtitles' | 'quality';

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
const useChrome38Proxy = process.env.ENABLE_MEDIA_PROXY === 'true';
const WEBOS_HLS_MEDIA_OPTION_VALUE = JSON.stringify({ mediaTransportType: 'HLS' });
const deadStreamUntilByUrl = new Map<string, number>();
let manifestRequestTraceCounter = 0;
const NATIVE_HLS_MIME_TYPES = [
  'application/vnd.apple.mpegurl',
  'application/x-mpegURL',
  'audio/mpegurl'
];

function isM3u8Url(value: string) {
  return value.split('?')[0]?.toLowerCase().endsWith('.m3u8') ?? false;
}

function canPlayNativeHls(video: HTMLVideoElement) {
  return NATIVE_HLS_MIME_TYPES.some((type) => video.canPlayType(type) !== '');
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

function formatEpgTime(timestamp: number) {
  if (!timestamp) {
    return '--:--';
  }

  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp));
}

function truncateLine(value: string | undefined, maxLength = 42) {
  const trimmed = value?.trim() || '';
  if (!trimmed) {
    return '';
  }

  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}...` : trimmed;
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

function setLastLiveUrlForDebug(url: string | null) {
  const debugWindow = window as Window & {
    __smartiflyLastLiveUrl?: string;
    __smartiflySetLastLiveUrl?: (value: string | null) => void;
  };

  if (typeof debugWindow.__smartiflySetLastLiveUrl === 'function') {
    debugWindow.__smartiflySetLastLiveUrl(url);
    return;
  }

  debugWindow.__smartiflyLastLiveUrl = url ?? undefined;
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

function summarizeCookieJar() {
  const cookie = typeof document !== 'undefined' ? document.cookie : '';
  if (!cookie) {
    return {
      hasCookie: false,
      cookieCount: 0,
      cookiePreview: '',
      cookieLength: 0
    };
  }

  const names = cookie
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split('=')[0]?.trim() || '')
    .filter(Boolean);

  return {
    hasCookie: true,
    cookieCount: names.length,
    cookiePreview: names.join('; '),
    cookieLength: cookie.length
  };
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

async function resolveRedirectedStreamUrl(streamUrl: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const abortFromExternalSignal = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', abortFromExternalSignal, { once: true });
    }
  }
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);

  try {
    let response;
    try {
      response = await fetch(streamUrl, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal
      });
      if (!response.ok && response.status !== 403) {
        throw new Error('HEAD failed');
      }
    } catch (headError) {
      if (controller.signal.aborted) {
        throw headError;
      }
      response = await fetch(streamUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
        headers: { Range: 'bytes=0-0' }
      });
    }

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
    signal?.removeEventListener('abort', abortFromExternalSignal);
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

function getBufferedRanges(video: HTMLVideoElement | null) {
  if (!video) {
    return [] as Array<{ start: number; end: number }>;
  }

  const ranges: Array<{ start: number; end: number }> = [];
  try {
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({
        start: Number(video.buffered.start(i).toFixed(3)),
        end: Number(video.buffered.end(i).toFixed(3))
      });
    }
  } catch {
    // Ignore buffer access error
  }

  return ranges;
}

function getFallbackDuration(video: HTMLVideoElement) {
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return video.duration;
  }

  if (video.seekable.length > 0) {
    try {
      const end = video.seekable.end(video.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) {
        return end;
      }
    } catch {
      // Ignore seekable access errors and keep falling back.
    }
  }

  if (video.buffered.length > 0) {
    try {
      const end = video.buffered.end(video.buffered.length - 1);
      if (Number.isFinite(end) && end > 0) {
        return end;
      }
    } catch {
      // Ignore buffered access errors and keep the duration unset.
    }
  }

  return 0;
}

function isPlaybackVisiblyActive(video: HTMLVideoElement, isLive: boolean) {
  return !video.paused && !video.seeking && (isLive || video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
}

function getReadyStateLabel(readyState: number) {
  const readyStateLabels: Record<number, string> = {
    0: 'HAVE_NOTHING',
    1: 'HAVE_METADATA',
    2: 'HAVE_CURRENT_DATA',
    3: 'HAVE_FUTURE_DATA',
    4: 'HAVE_ENOUGH_DATA'
  };

  return readyStateLabels[readyState] ?? 'UNKNOWN';
}

function getNetworkStateLabel(networkState: number) {
  const networkStateLabels: Record<number, string> = {
    0: 'NETWORK_EMPTY',
    1: 'NETWORK_IDLE',
    2: 'NETWORK_LOADING',
    3: 'NETWORK_NO_SOURCE'
  };

  return networkStateLabels[networkState] ?? 'UNKNOWN';
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

async function awaitPlaybackStartSignal(video: HTMLVideoElement, timeoutMs: number) {
  const hasPlaybackStarted = () =>
    !video.paused &&
    (video.currentTime > 0 ||
      getBufferedTime(video) > 0 ||
      video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA);

  if (hasPlaybackStarted()) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const cleanupCallbacks: Array<() => void> = [];

    const cleanup = () => {
      while (cleanupCallbacks.length > 0) {
        cleanupCallbacks.pop()?.();
      }
    };

    const maybeResolve = () => {
      if (hasPlaybackStarted()) {
        cleanup();
        resolve();
      }
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Playback produced no start signal after ${timeoutMs}ms`));
    }, timeoutMs);
    cleanupCallbacks.push(() => window.clearTimeout(timeoutId));

    const bind = (eventName: keyof HTMLMediaElementEventMap) => {
      const handler = () => {
        maybeResolve();
      };

      video.addEventListener(eventName, handler);
      cleanupCallbacks.push(() => video.removeEventListener(eventName, handler));
    };

    bind('playing');
    bind('timeupdate');
    bind('progress');
    bind('loadeddata');
    bind('canplay');
    bind('canplaythrough');

    maybeResolve();
  });
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
  return false;
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
  return false;
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
  const shakaPlayerRef = useRef<any>(null);
  const hlsPlayerRef = useRef<any>(null);
  const hlsRuntime = window.Hls;
  const shakaRuntime = window.shaka;
  const loadGenerationRef = useRef(0);
  const loadAbortControllerRef = useRef<AbortController | null>(null);
  const hudTimerRef = useRef<number | null>(null);

  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const lastProgressUpdateRef = useRef<number>(0);
  const liveNativeStartupRetryUsedRef = useRef(false);
  const liveShakaStartupRetryUsedRef = useRef(false);
  const liveHlsJsStartupRetryUsedRef = useRef(false);
  const liveHlsJsFallbackToShakaUsedRef = useRef(false);
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
        {
          description: playback.description,
          playbackId: playback.id,
          containerExtension: playback.containerExtension
        }
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
        {
          description: playback.description,
          playbackId: playback.id,
          containerExtension: playback.containerExtension
        }
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
  const [focusedId, setFocusedId] = useState<PlayerFocusId>(() => {
    return playback?.kind === 'live' ? 'back' : 'play';
  });
  const [hudFocusSection, setHudFocusSection] = useState<'center' | 'bottom' | 'rail'>(() => {
    return playback?.kind === 'live' ? 'rail' : 'center';
  });
  const [focusedChannelIdx, setFocusedChannelIdx] = useState<number>(0);
  const channelRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [liveEpg, setLiveEpg] = useState<XtreamShortEpgEntry[]>([]);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<PlayerSettingsView>('root');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover' | 'fill'>('contain');

  type SubtitleTrackInfo = { id: string | number; label: string; language: string; active: boolean };
  type QualityTrackInfo = { id: string | number; label: string; active: boolean };

  const [subtitles, setSubtitles] = useState<SubtitleTrackInfo[]>([]);
  const [qualities, setQualities] = useState<QualityTrackInfo[]>([]);
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | number>('off');
  const [activeQualityId, setActiveQualityId] = useState<string | number>('auto');

  type SettingsCategory = 'subtitles' | 'quality' | 'speed' | 'aspect' | 'mute' | 'close';

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('subtitles');
  const [settingsFocusSection, setSettingsFocusSection] = useState<'categories' | 'options'>('categories');
  const [focusedOptionIdx, setFocusedOptionIdx] = useState(0);

  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const getOptionsForCategory = (category: SettingsCategory) => {
    switch (category) {
      case 'subtitles':
        return [{ id: 'off', label: 'Off' }, ...subtitles.map(s => ({ id: s.id, label: s.label }))];
      case 'quality':
        return [{ id: 'auto', label: getActiveQualityLabel() }, ...qualities.map(q => ({ id: q.id, label: q.label }))];
      case 'speed':
        return SPEED_OPTIONS.map(r => ({ id: r, label: `${r}x` }));
      case 'aspect':
        return ASPECT_OPTIONS.map(m => ({ id: m, label: m }));
      case 'mute':
        return [{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }];
      default:
        return [];
    }
  };

  const isOptionActive = (category: SettingsCategory, optionId: string | number) => {
    switch (category) {
      case 'subtitles':
        return activeSubtitleId === optionId;
      case 'quality':
        return activeQualityId === optionId;
      case 'speed':
        return playbackRate === Number(optionId);
      case 'aspect':
        return aspectMode === optionId;
      case 'mute':
        return (isMuted ? 'on' : 'off') === optionId;
      default:
        return false;
    }
  };

  const handleOptionSelect = (category: SettingsCategory, optionId: string | number) => {
    switch (category) {
      case 'subtitles':
        handleSubtitleChange(optionId);
        break;
      case 'quality':
        handleQualityChange(optionId);
        break;
      case 'speed':
        setPlaybackRate(Number(optionId));
        if (videoRef.current) {
          videoRef.current.playbackRate = Number(optionId);
        }
        break;
      case 'aspect':
        setAspectMode(optionId as any);
        break;
      case 'mute':
        const targetMute = optionId === 'on';
        setIsMuted(targetMute);
        if (videoRef.current) {
          videoRef.current.muted = targetMute;
          if (!targetMute) {
            videoRef.current.volume = 1;
          }
        }
        break;
    }
  };

  const handleNativeTracks = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const tracks = Array.from(video.textTracks || []);
    if (tracks.length > 0) {
      setSubtitles(
        tracks.map((t: any, idx: number) => ({
          id: idx,
          label: t.label || t.language || `Track ${idx + 1}`,
          language: t.language || '',
          active: t.mode === 'showing'
        }))
      );
      const activeIdx = tracks.findIndex((t: any) => t.mode === 'showing');
      setActiveSubtitleId(activeIdx >= 0 ? activeIdx : 'off');
    }
  }, []);

  const handleSubtitleChange = (trackId: string | number) => {
    setActiveSubtitleId(trackId);
    if (activeEngineRef.current === 'shaka' && shakaPlayerRef.current) {
      if (trackId === 'off') {
        shakaPlayerRef.current.setTextTrackVisibility(false);
      } else {
        const track = shakaPlayerRef.current.getTextTracks().find((t: any) => t.id === Number(trackId));
        if (track) {
          shakaPlayerRef.current.selectTextTrack(track);
          shakaPlayerRef.current.setTextTrackVisibility(true);
        }
      }
    } else if (activeEngineRef.current === 'hlsjs' && hlsPlayerRef.current) {
      hlsPlayerRef.current.subtitleTrack = trackId === 'off' ? -1 : Number(trackId);
    } else if (activeEngineRef.current === 'native' && videoRef.current) {
      const tracks = videoRef.current.textTracks;
      if (trackId === 'off') {
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = 'disabled';
        }
      } else {
        const targetIdx = Number(trackId);
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = i === targetIdx ? 'showing' : 'disabled';
        }
      }
    }
  };

  const handleQualityChange = (qualityId: string | number) => {
    setActiveQualityId(qualityId);
    if (activeEngineRef.current === 'shaka' && shakaPlayerRef.current) {
      if (qualityId === 'auto') {
        shakaPlayerRef.current.configure({ abr: { enabled: true } });
      } else {
        shakaPlayerRef.current.configure({ abr: { enabled: false } });
        const chosenHeight = Number(qualityId);
        const variants = shakaPlayerRef.current.getVariantTracks();
        const matching = variants.filter((v: any) => v.height === chosenHeight);
        if (matching.length > 0) {
          const best = matching.reduce((prev: any, curr: any) => (prev.bandwidth > curr.bandwidth ? prev : curr), matching[0]);
          shakaPlayerRef.current.selectVariantTrack(best, true);
        }
      }
    } else if (activeEngineRef.current === 'hlsjs' && hlsPlayerRef.current) {
      hlsPlayerRef.current.currentLevel = qualityId === 'auto' ? -1 : Number(qualityId);
    }
  };

  const getActiveQualityLabel = () => {
    if (activeQualityId !== 'auto') {
      return `${activeQualityId}p`;
    }
    const video = videoRef.current;
    if (video && video.videoHeight) {
      return `Auto (${video.videoHeight}p)`;
    }
    return 'Auto';
  };

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

  const currentLiveIndex = useMemo(() => {
    if (!playback || playback.kind !== 'live' || !Array.isArray(playback.liveQueue) || playback.liveQueue.length === 0) {
      return -1;
    }
    if (typeof playback.liveIndex === 'number' && playback.liveIndex >= 0 && playback.liveIndex < playback.liveQueue.length) {
      return playback.liveIndex;
    }
    return playback.liveQueue.findIndex((entry) => entry.id === playback.id);
  }, [playback]);

  useEffect(() => {
    if (playback?.kind !== 'live' || !activeStreamUrl) {
      return;
    }

    setLastLiveUrlForDebug(activeStreamUrl);
  }, [activeStreamUrl, playback?.kind]);

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
  const lastPlayTimeRef = useRef(0);
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
    if (!isLive) return;
    const interval = window.setInterval(() => {
      setClockMs(Date.now());
    }, 30000);
    return () => window.clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    const username = session?.username?.trim();
    const password = session?.userInfo?.password?.trim();
    const portalBaseUrl = session?.portalBaseUrl?.trim();

    if (!isLive || !currentLiveStreamId || !username || !password || !portalBaseUrl) {
      setLiveEpg([]);
      return;
    }

    let active = true;
    const api = createXtreamApi(portalBaseUrl);
    
    const fetchEpg = async () => {
      try {
        const programs = await api.getShortEpg(username, password, currentLiveStreamId, 3);
        if (active) {
          setLiveEpg(programs || []);
          setClockMs(Date.now());
        }
      } catch (err) {
        console.warn(`${PLAYER_LOG_PREFIX} failed to load live EPG`, err);
        if (active) {
          setLiveEpg([]);
        }
      }
    };

    fetchEpg();

    return () => {
      active = false;
    };
  }, [isLive, currentLiveStreamId, session?.portalBaseUrl, session?.userInfo?.password, session?.username]);

  const currentProgram = useMemo(() => {
    if (!isLive || liveEpg.length === 0) return null;
    return liveEpg.find((p) => clockMs >= p.startTime && clockMs <= p.endTime) || null;
  }, [isLive, liveEpg, clockMs]);

  const nextProgram = useMemo(() => {
    if (!isLive || liveEpg.length === 0) return null;
    return liveEpg.find((p) => p.startTime > clockMs) || null;
  }, [isLive, liveEpg, clockMs]);

  const currentProgramProgress = useMemo(() => {
    if (!currentProgram) return 0;
    const durationMs = currentProgram.endTime - currentProgram.startTime;
    if (durationMs <= 0) return 0;
    return Math.min(1, Math.max(0, (clockMs - currentProgram.startTime) / durationMs));
  }, [currentProgram, clockMs]);

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
    setFocusedChannelIdx(currentLiveIndex >= 0 ? currentLiveIndex : 0);
    setHudFocusSection('center');
  }, [playback?.id, playback?.streamUrl, currentLiveIndex]);

  const resetVideoElement = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    console.debug(`${PLAYER_LOG_PREFIX} resetVideoElement start`, { currentSrc: video.currentSrc || null, srcAttr: video.getAttribute('src'), ts: Date.now() });
    video.pause();
    clearVideoSources(video);
    video.removeAttribute('src');
    video.load();
    console.debug(`${PLAYER_LOG_PREFIX} resetVideoElement complete`, { ts: Date.now() });
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

  const cancelActivePlaybackLoad = useCallback(
    (reason: string) => {
      loadGenerationRef.current += 1;
      loadAbortControllerRef.current?.abort();
      loadAbortControllerRef.current = null;
      startupAttemptInFlightRef.current = false;
      clearRecoveryTimers();
      clearLiveNoProgressWatchdog();
      clearStartupGuardRetry();

      console.debug(`${PLAYER_LOG_PREFIX} cancel active playback load`, {
        reason,
        playbackId: playbackRef.current?.id ?? null,
        streamUrl: activeStreamUrl,
        engine: activeEngineRef.current
      });
    },
    [activeStreamUrl, clearLiveNoProgressWatchdog, clearRecoveryTimers, clearStartupGuardRetry]
  );

  const scheduleLiveNoProgressWatchdog = useCallback(
    (reason: string) => {
      if (!isLive || startupAttemptInFlightRef.current) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.paused) {
        return;
      }

      clearLiveNoProgressWatchdog();
      liveNoProgressWatchdogTimerRef.current = window.setTimeout(() => {
        liveNoProgressWatchdogTimerRef.current = null;

        const activeVideo = videoRef.current;
        if (!activeVideo || activeVideo.paused || startupAttemptInFlightRef.current) {
          return;
        }

        const stalledFor = Date.now() - lastProgressAtRef.current;
        if (stalledFor < LIVE_NO_PROGRESS_WATCHDOG_MS) {
          return;
        }

        const bufferedRanges: string[] = [];
        if (activeVideo) {
          try {
            for (let i = 0; i < activeVideo.buffered.length; i++) {
              bufferedRanges.push(
                `[${activeVideo.buffered.start(i).toFixed(3)}, ${activeVideo.buffered.end(i).toFixed(3)}]`
              );
            }
          } catch (e) {
            bufferedRanges.push(`error: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        console.warn(`${PLAYER_LOG_PREFIX} live no-progress watchdog fired`, {
          reason,
          stalledFor,
          currentTime: Number.isFinite(activeVideo.currentTime) ? Number(activeVideo.currentTime.toFixed(3)) : activeVideo.currentTime,
          buffered: getBufferedTime(activeVideo),
          bufferedRanges,
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

        let targetEngine: PlaybackEngine | null = null;
        if (
          activeEngineRef.current === 'hlsjs' &&
          !liveHlsJsFallbackToShakaUsedRef.current &&
          !isFreshLiveOpenIsolationActive()
        ) {
          liveHlsJsFallbackToShakaUsedRef.current = true;
          targetEngine = 'shaka';
        } else if (
          activeEngineRef.current === 'shaka' &&
          !liveShakaStartupRetryUsedRef.current &&
          !isFreshLiveOpenIsolationActive()
        ) {
          liveShakaStartupRetryUsedRef.current = true;
          targetEngine = 'native';
        } else {
          targetEngine = null;
        }

        console.warn(`${PLAYER_LOG_PREFIX} live no-progress full reload / escalation`, {
          reason,
          nextEpoch,
          currentEngine: activeEngineRef.current,
          escalatingTo: targetEngine || 'default'
        });

        setEngineOverride(targetEngine);
        setLiveSessionEpoch(nextEpoch);
        setLoadNonce((value) => value + 1);
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
    liveHlsJsStartupRetryUsedRef.current = false;
    liveHlsJsFallbackToShakaUsedRef.current = false;
    liveNoProgressRetryUsedRef.current = false;
    lastPlayTimeRef.current = 0;
  }, [activeStreamUrl, playback?.id]);

  const teardownPlayer = useCallback(async () => {
    const player = shakaPlayerRef.current;
    if (!player) {
      return;
    }

    console.debug(`${PLAYER_LOG_PREFIX} teardown`);
    shakaPlayerRef.current = null;
    await player.destroy().catch(() => undefined);
    console.warn(`${PLAYER_LOG_PREFIX} teardown complete`, { ts: Date.now() });
  }, []);

  const teardownHlsPlayer = useCallback(async () => {
    const player = hlsPlayerRef.current;
    if (!player) {
      return;
    }

    console.debug(`${PLAYER_LOG_PREFIX} hls.js teardown`);
    hlsPlayerRef.current = null;
    try {
      player.destroy();
    } catch (destroyError) {
      console.warn(`${PLAYER_LOG_PREFIX} hls.js destroy failed`, {
        message: destroyError instanceof Error ? destroyError.message : String(destroyError)
      });
    }
    console.warn(`${PLAYER_LOG_PREFIX} hls.js teardown complete`, { ts: Date.now() });
  }, []);

  const teardownPlaybackEngines = useCallback(async (video: HTMLVideoElement | null) => {
    console.warn(`${PLAYER_LOG_PREFIX} teardownPlaybackEngines start`, { streamUrl: activeStreamUrl, liveSessionEpoch: liveSessionEpochRef.current, ts: Date.now() });
    await teardownHlsPlayer();
    await teardownPlayer();
    resetVideoElement(video);
    console.warn(`${PLAYER_LOG_PREFIX} teardownPlaybackEngines complete`, { streamUrl: activeStreamUrl, liveSessionEpoch: liveSessionEpochRef.current, ts: Date.now() });
  }, [resetVideoElement, teardownHlsPlayer, teardownPlayer]);

  const scheduleLiveSwitchCooldownRetry = useCallback(
    (reason: string, cooldownMs: number, streamId: number | null) => {
      void cooldownMs;
      void streamId;
      console.warn(`${PLAYER_LOG_PREFIX} live switch cooldown suppressed to match Samsung behavior`, {
        reason
      });
    },
    []
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
      const ranges = getBufferedRanges(video);

      const isStandardVideoEvent = [
        'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
        'play', 'playing', 'pause', 'seeking', 'seeked', 'waiting',
        'waiting-ignored-startup', 'stalled-ignored-startup', 'stalled',
        'error', 'ended', 'ratechange'
      ].includes(eventName);

      const isHlsjsEvent = eventName.startsWith('hlsjs-');
      const isShakaEvent = eventName.startsWith('shaka-');

      if (!isStandardVideoEvent && !isHlsjsEvent && !isShakaEvent) {
        console.warn(`${PLAYER_LOG_PREFIX} event:${eventName}`, {
          engine: activeEngineRef.current,
          streamUrl: activeStreamUrl,
          currentTime: Number.isFinite(video.currentTime) ? Number(video.currentTime.toFixed(3)) : video.currentTime,
          duration: Number.isFinite(video.duration) ? Number(video.duration.toFixed(3)) : video.duration,
          buffered: getBufferedTime(video),
          bufferedRanges: ranges,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
          readyStateLabel: getReadyStateLabel(video.readyState),
          networkState: video.networkState,
          networkStateLabel: getNetworkStateLabel(video.networkState),
          paused: video.paused,
          seeking: video.seeking,
          ended: video.ended,
          muted: video.muted,
          volume: Number.isFinite(video.volume) ? Number(video.volume.toFixed(3)) : video.volume,
          playbackRate: Number.isFinite(video.playbackRate) ? Number(video.playbackRate.toFixed(3)) : video.playbackRate,
          mediaErrorCode: video.error?.code ?? null,
          mediaErrorMessage: video.error?.message ?? null,
          currentSrc: video.currentSrc || null,
          src: video.getAttribute('src'),
          ...extra
        });
      }
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

      if (chrome38CompatMode) {
        console.groupCollapsed(`${PLAYER_LOG_PREFIX} stream diagnostics (skipped header probe for Chrome 38)`);
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
        console.groupEnd();
        return;
      }

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
      setStatusMessage: (message: string) => useAppStore.getState().setStatusMessage(message),
      teardownPlaybackEngines: () => teardownPlaybackEngines(videoRef.current),
      resetLiveSurface: () => {
        setLiveSessionEpoch((value) => value + 1);
      }
    }),
    [teardownPlaybackEngines]
  );

  const switchLiveChannel = useCallback(
    (delta: number) => {
      clearHudTimer();
      setIsHudVisible(false);
      suppressHudRevealRef.current = true;
      setFocusedId('play');
      cancelActivePlaybackLoad('manual live channel switch');
      console.warn('[LG Player] fresh live open enabled', {
        delta,
        currentId: playbackRef.current?.id ?? null
      });
      void performFreshLiveChannelSwitch(delta, livePlaybackActions);
    },
    [cancelActivePlaybackLoad, livePlaybackActions]
  );

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }

    showHUD();
  };

  const getPlayerSessionId = () => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return null;
    }

    return currentSession.authenticatedAt || `${currentSession.portalCode}:${currentSession.username}`;
  };

  const getRevisitDebugInfo = () => ({
    channelId: playbackRef.current?.streamId ?? playbackRef.current?.id ?? null,
    channelTitle: playbackRef.current?.title ?? null,
    streamUrl: activeStreamUrl || null,
    playerSessionId: getPlayerSessionId(),
    liveStreamId: currentLiveStreamId
  });

  const closePlayer = () => {
    // Force final progress report before closing
    reportPlaybackProgress(true);

    const revisitInfo = getRevisitDebugInfo();
    window.__smartiflyRevisitDebug?.logCloseStart(revisitInfo);

    console.warn(`${PLAYER_LOG_PREFIX} player closing`, {
      currentPlaybackId: playbackRef.current?.id ?? null,
      currentPlaybackTitle: playbackRef.current?.title ?? null,
      currentPlaybackKind: playbackRef.current?.kind ?? null,
      currentStreamUrl: activeStreamUrl || null,
      currentLiveStreamId
    });

    clearHudTimer();
    clearRecoveryState();
    clearSilentSeekSuppression();
    setEngineOverride(null);
    setFreshLiveOpenIsolationActive(false);
    void teardownPlaybackEngines(videoRef.current);

    clearLiveStreamMemory(currentLiveStreamId);

    clearLivePlayerSession();
    closePlayback();

    window.__smartiflyRevisitDebug?.logCloseDone(revisitInfo);
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
    setAspectMode('contain');
    setSubtitles([]);
    setQualities([]);
    setActiveSubtitleId('off');
    setActiveQualityId('auto');

    // Holds the Blob URL for the rewritten HLS playlist so the cleanup can revoke it.
    async function load() {
      const loadGeneration = ++loadGenerationRef.current;
      loadAbortControllerRef.current?.abort();
      const loadAbortController = new AbortController();
      loadAbortControllerRef.current = loadAbortController;
      startupAttemptInFlightRef.current = true;
      const liveSwitchContext = getLiveSwitchContext();
      const isCurrentSwitchTarget = isActiveLiveSwitchTarget(playback.kind, currentLiveStreamId, liveSwitchContext);
      const isManualLiveSwitchStartup = isCurrentSwitchTarget && liveSwitchContext.fromSwitch;
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
        playback.kind === 'live' && currentLiveStreamId != null && !isManualLiveSwitchStartup
          ? Math.max(playback.liveHandoffMs ?? 0, getLiveHandoffDelayMs(currentLiveStreamId))
          : 0;
      let resolvedStreamUrl = activeStreamUrl;

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
      // For live M3U8 with playlist rewrite enabled, we pre-fetch and rewrite
      // the manifest text so segment URIs are absolute. The rewritten text is
      // injected into hls.js via a custom pLoader on the first manifest load,
      // while all subsequent live playlist polls go to the real origin URL
      // (with User-Agent set via xhrSetup so the server doesn't return 403).
      // hlsSourceUrl always stays as resolvedStreamUrl — hls.js is pointed at
      // the real URL so live polling works normally after the first load.
      let hlsSourceUrl = resolvedStreamUrl;
      // Force Shaka for live HLS during manual switch to avoid hls.js retry/fallback creating duplicate opens
      const preferShakaForLiveHls = playback.kind === 'live' && isM3u8Url(activeStreamUrl) && isManualLiveSwitchStartup;
      const preferNativeHlsForLiveM3u8 =
        playback.kind === 'live' &&
        isM3u8Url(activeStreamUrl) &&
        engineOverride == null &&
        canPlayNativeHls(attachedVideo);
      let useWebOSNativeHlsMediaOption = false;
      let engineDecision: PlaybackEngineDecision = {
        engine: 'native',
        reason: 'Playback engine pending resolution',
        allowShakaFallback: false
      };
      let selectedEngine: PlaybackEngine = engineOverride === 'hlsjs' ? 'hlsjs' : 'native';

      try {
        setIsReady(false);
        setRecoveryMessage('Loading...');
        setStatusMessage('Loading...');

        if (handoffMs > 0) {
          setRecoveryMessage('Switching channel...');
          await waitForMs(handoffMs);
          if (cancelled || loadGeneration !== loadGenerationRef.current || loadAbortController.signal.aborted) {
            return;
          }
        }

        // Ensure a fresh player state for live opens so every channel switch
        // behaves like a first-time open. Teardown the playback engines for
        // live playback even when this is a manual live switch startup.
        if (!isManualLiveSwitchStartup || playback.kind === 'live') {
          console.warn(`${PLAYER_LOG_PREFIX} live open tearing down previous playback engines`, {
            activeStreamUrl,
            selectedEngine: activeEngineRef.current,
            isFreshLiveOpenIsolationActive: isFreshLiveOpenIsolationActive(),
            liveSessionEpoch: liveSessionEpochRef.current
          });
          await teardownPlaybackEngines(attachedVideo);
          console.warn(`${PLAYER_LOG_PREFIX} live open teardown complete`, {
            activeStreamUrl,
            liveSessionEpoch: liveSessionEpochRef.current,
            ts: Date.now()
          });
        }

        if (cancelled || loadGeneration !== loadGenerationRef.current || loadAbortController.signal.aborted) {
          return;
        }

        console.warn(`${PLAYER_LOG_PREFIX} choosing playback engine`, {
          playbackId: playback.id,
          playbackKind: playback.kind,
          activeStreamUrl,
          engineOverride,
          preferNativeHlsForLiveM3u8,
          preferShakaForLiveHls,
          isManualLiveSwitchStartup,
          liveSessionEpoch: liveSessionEpochRef.current,
          freshIsolation: isFreshLiveOpenIsolationActive()
        });

        engineDecision = choosePlaybackEngine({
          playback,
          streamUrl: activeStreamUrl,
          overrideEngine: engineOverride,
          preferNativeHlsForLiveM3u8,
          canUseNativeHls: preferNativeHlsForLiveM3u8,
          legacyChromiumBrowser,
          preferShakaForLiveHls
        });

        selectedEngine = engineOverride === 'hlsjs' ? 'hlsjs' : engineDecision.engine;
        if (!chrome38CompatMode && legacyChromiumBrowser && playback.kind === 'live' && isM3u8Url(activeStreamUrl)) {
          if (selectedEngine === 'hlsjs') {
            console.warn(`${PLAYER_LOG_PREFIX} overriding hls.js engine for legacy Chromium live HLS`, {
              activeStreamUrl,
              previousEngine: selectedEngine,
              legacyChromiumBrowser,
              preferNativeHlsForLiveM3u8
            });
          }
          selectedEngine = 'native';
        }
        activeEngineRef.current = selectedEngine;
        console.debug(`${PLAYER_LOG_PREFIX} engine decision`, { engineDecision, selectedEngine, ts: Date.now() });

        const isLegacyNativeLiveHls =
          legacyChromiumBrowser &&
          playback.kind === 'live' &&
          isM3u8Url(activeStreamUrl) &&
          selectedEngine === 'native';
        const shouldSkipRedirectResolution =
          isManualLiveSwitchStartup ||
          isLegacyNativeLiveHls ||
          chrome38CompatMode ||
          (playback.kind === 'live' && (selectedEngine === 'hlsjs' || selectedEngine === 'shaka'));
        console.debug(`${PLAYER_LOG_PREFIX} redirect resolution`, { shouldSkipRedirectResolution, activeStreamUrl, selectedEngine, isManualLiveSwitchStartup, ts: Date.now() });

        if (shouldSkipRedirectResolution) {
          console.warn(`${PLAYER_LOG_PREFIX} skipping redirect resolution`, {
            activeStreamUrl,
            selectedEngine,
            isManualLiveSwitchStartup,
            playKind: playback.kind
          });
          resolvedStreamUrl = activeStreamUrl;
        } else {
          console.warn(`${PLAYER_LOG_PREFIX} resolving redirected stream URL`, {
            activeStreamUrl,
            selectedEngine,
            isManualLiveSwitchStartup,
            playKind: playback.kind
          });
          resolvedStreamUrl = activeStreamUrl.startsWith('http')
            ? await resolveRedirectedStreamUrl(activeStreamUrl, loadAbortController.signal)
            : activeStreamUrl;

          console.debug(`${PLAYER_LOG_PREFIX} resolved stream url`, { from: activeStreamUrl, to: resolvedStreamUrl, ts: Date.now() });
        }

        if (cancelled || loadGeneration !== loadGenerationRef.current || loadAbortController.signal.aborted) {
          return;
        }

        if (chrome38CompatMode && useChrome38Proxy && selectedEngine === 'hlsjs' && resolvedStreamUrl && resolvedStreamUrl.startsWith('http')) {
          const originalUrl = resolvedStreamUrl;
          resolvedStreamUrl = `http://${window.location.host}/proxy?url=${encodeURIComponent(resolvedStreamUrl)}`;
          console.warn(`${PLAYER_LOG_PREFIX} routing stream through local CORS proxy`, {
            original: originalUrl,
            proxied: resolvedStreamUrl
          });
        }

        if (chrome38CompatMode) {
          if (playback.kind === 'live') {
            console.warn(`${PLAYER_LOG_PREFIX} verification logs:\n` +
              `chrome38CompatMode: true\n` +
              `selectedEngine: ${selectedEngine}\n` +
              `nativeHlsDisabledForDesktopChrome38: true\n` +
              `fallbackSuppression: false\n` +
              `proxyEnabled: ${useChrome38Proxy}`);
          } else {
            console.warn(`${PLAYER_LOG_PREFIX} verification logs:\n` +
              `chrome38CompatMode: true\n` +
              `selectedEngine: ${selectedEngine}\n` +
              `skipRedirectResolution: true\n` +
              `skipDiagnosticsProbe: true\n` +
              `shakaDisabled: true\n` +
              `mkvFallbackDisabled: true`);
          }
        } else {
          console.warn(`${PLAYER_LOG_PREFIX} verification logs:\n` +
            `chrome38CompatMode: false\n` +
            `existing webOS native behavior unchanged`);
        }

        nativeSourceUrl = resolvedStreamUrl;
        hlsSourceUrl = resolvedStreamUrl;

        window.__smartiflyRevisitDebug?.logOpenStart({
          channelId: playback.kind === 'live' ? currentLiveStreamId ?? playback.id : playback.id,
          channelTitle: playback.title,
          streamUrl: resolvedStreamUrl,
          playerSessionId: getPlayerSessionId(),
          liveStreamId: currentLiveStreamId
        });

        // Live HLS prefers the native webOS pipeline first for MPEG-audio TS
        // channels, with Shaka kept as a fallback if native cannot sustain it.
        useWebOSNativeHlsMediaOption =
          isWebOS &&
          playback.kind === 'live' &&
          webosNativeHlsMediaOption &&
          isM3u8Url(resolvedStreamUrl);

        // Pre-fetch playlist rewriting is disabled because:
        // 1. For hls.js: it does not need it (it resolves paths using responseURL).
        // 2. For Shaka: it has an on-the-fly response filter to rewrite playlists during playback.
        // 3. For native: it does not support Blob source URLs anyway (useBlobSource = false).
        // Disabling it prevents redundant network connections to the IPTV server on initial load.
        const shouldRewriteLivePlaylistForEngine = false;

        if (isLiveM3u8 && hlsPlaylistRewrite && isManualLiveSwitchStartup) {
          // skipping live playlist rewrite for manual live switch log removed
        } else if (isLiveM3u8 && hlsPlaylistRewrite && shouldRewriteLivePlaylistForEngine) {
          const rewritten = await fetchAndRewriteHlsPlaylist(activeStreamUrl, loadAbortController.signal);
          if (rewritten) {
            // Store the rewritten playlist text; the pLoader below will serve it
            // on the first manifest fetch and then let hls.js poll the real URL.
            hlsSourceUrl = rewritten.playlistText;
            console.warn(`${PLAYER_LOG_PREFIX} hls playlist rewritten`, {
              from: activeStreamUrl,
              finalCdnUrl: rewritten.finalUrl,
              resolvedUrlKey: resolvedStreamUrl,
              rewrittenForPLoader: true
            });
          } else {
            console.warn(`${PLAYER_LOG_PREFIX} hls playlist rewrite failed, using fallback`, {
              streamUrl: activeStreamUrl
            });
          }
        } else if (isLiveM3u8 && hlsPlaylistRewrite && !shouldRewriteLivePlaylistForEngine) {
          // skipping live playlist rewrite log removed
        }

        if (selectedEngine === 'shaka' && (!shakaRuntime || !shakaRuntime.Player.isBrowserSupported())) {
          startupAttemptInFlightRef.current = false;
          setStatusMessage('Playback is not supported in this browser');
          return;
        }

        if (selectedEngine === 'hlsjs' && (!hlsRuntime || !hlsRuntime.isSupported())) {
          startupAttemptInFlightRef.current = false;
          setStatusMessage('Playback is not supported in this browser');
          return;
        }

        if (!isLive && isStreamTemporarilyUnavailable(activeStreamUrl)) {
          console.warn(`${PLAYER_LOG_PREFIX} stream is temporarily marked unavailable`, {
            streamUrl: activeStreamUrl,
            engine: selectedEngine
          });
          startupAttemptInFlightRef.current = false;
          clearRecoveryTimers();
          setIsReady(false);
          setRecoveryMessage('Stream unavailable');
          setStatusMessage('Stream unavailable');
          return;
        }

        if (!isLive && playbackStartupGuard) {
          setRecoveryMessage('Buffering...');
          setStatusMessage('Buffering...');
        }

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
          engine: selectedEngine,
          engineReason: engineDecision.reason,
          preferNativeHlsForLiveM3u8,
          useWebOSNativeHlsMediaOption
        });

        if (selectedEngine === 'hlsjs') {
          if (!chrome38CompatMode && legacyChromiumBrowser && playback.kind === 'live' && isM3u8Url(activeStreamUrl)) {
            console.warn(`${PLAYER_LOG_PREFIX} blocked hls.js startup for legacy Chromium live HLS`, {
              activeStreamUrl,
              selectedEngine,
              legacyChromiumBrowser
            });
            selectedEngine = 'native';
            activeEngineRef.current = selectedEngine;
          }
        }

        if (selectedEngine === 'hlsjs') {
          const hlsStartupTimeoutMs = Math.max(NATIVE_LOAD_TIMEOUT_MS, startupGraceMs);

          // Build a custom playlist loader that serves the pre-rewritten manifest
          // text on the very first fetch, then falls back to normal XHR for all
          // subsequent live playlist polls (with User-Agent forwarded on every
          // request so the server never returns 403).
          //
          // A closure boolean (not an instance flag) is used because hls.js may
          // construct multiple loader instances across retries, but we only want
          // to intercept the very first manifest load once per playback session.
          const rewrittenPlaylistText = hlsSourceUrl !== resolvedStreamUrl ? hlsSourceUrl : null;
          let firstManifestServed = false;
          const DefaultLoader = hlsRuntime.DefaultConfig.loader as new (config: HlsConfig) => Loader<LoaderContext>;
          const mediaSourceCtor = typeof window !== 'undefined' ? (window as Window & typeof globalThis).MediaSource : undefined;
          const mediaSourceProto = mediaSourceCtor?.prototype as any;
          const originalAddSourceBuffer = mediaSourceProto?.addSourceBuffer;
          const mediaSourceInstances = new WeakSet<MediaSource>();
          const sourceBufferInstances = new WeakSet<SourceBuffer>();
          let restoreMediaSourceDebugging = () => undefined;

          const logHlsVideoState = (eventName: string, extra: Record<string, unknown> = {}) => {
            logVideoSnapshot(`hlsjs-${eventName}`, attachedVideo, extra);
          };

          if (mediaSourceProto && originalAddSourceBuffer) {
            const patchedAddSourceBuffer: typeof MediaSource.prototype.addSourceBuffer = function (
              this: MediaSource,
              mimeType: string
            ): SourceBuffer {
              if (!mediaSourceInstances.has(this)) {
                mediaSourceInstances.add(this);
                this.addEventListener('sourceopen', () => {
                  logHlsVideoState('mediasource-sourceopen', {
                    mediaSourceReadyState: this.readyState,
                    mediaSourceDuration: Number.isFinite(this.duration) ? Number(this.duration.toFixed(3)) : this.duration
                  });
                });
                this.addEventListener('sourceended', () => {
                  logHlsVideoState('mediasource-sourceended', {
                    mediaSourceReadyState: this.readyState
                  });
                });
                this.addEventListener('sourceclose', () => {
                  logHlsVideoState('mediasource-sourceclose', {
                    mediaSourceReadyState: this.readyState
                  });
                });
              }

              logHlsVideoState('mediasource-add-source-buffer', {
                mimeType,
                mediaSourceReadyState: this.readyState,
                mediaSourceDuration: Number.isFinite(this.duration) ? Number(this.duration.toFixed(3)) : this.duration,
                sourceBufferCount: this.sourceBuffers.length
              });

              const sourceBuffer = originalAddSourceBuffer.call(this, mimeType);

              if (!sourceBufferInstances.has(sourceBuffer)) {
                sourceBufferInstances.add(sourceBuffer);
                sourceBuffer.addEventListener('updatestart', () => {
                  logHlsVideoState('sourcebuffer-updatestart', {
                    mimeType,
                    updating: sourceBuffer.updating,
                    bufferedRanges: getBufferedRanges(attachedVideo)
                  });
                });
                sourceBuffer.addEventListener('update', () => {
                  logHlsVideoState('sourcebuffer-update', {
                    mimeType,
                    updating: sourceBuffer.updating,
                    bufferedRanges: getBufferedRanges(attachedVideo)
                  });
                });
                sourceBuffer.addEventListener('updateend', () => {
                  logHlsVideoState('sourcebuffer-updateend', {
                    mimeType,
                    updating: sourceBuffer.updating,
                    bufferedRanges: getBufferedRanges(attachedVideo)
                  });
                });
                sourceBuffer.addEventListener('error', () => {
                  logHlsVideoState('sourcebuffer-error', {
                    mimeType,
                    updating: sourceBuffer.updating,
                    bufferedRanges: getBufferedRanges(attachedVideo)
                  });
                });
                sourceBuffer.addEventListener('abort', () => {
                  logHlsVideoState('sourcebuffer-abort', {
                    mimeType,
                    updating: sourceBuffer.updating,
                    bufferedRanges: getBufferedRanges(attachedVideo)
                  });
                });
              }

              return sourceBuffer;
            };
            mediaSourceProto.addSourceBuffer = patchedAddSourceBuffer;

            restoreMediaSourceDebugging = () => {
              if (mediaSourceProto.addSourceBuffer === patchedAddSourceBuffer) {
                mediaSourceProto.addSourceBuffer = originalAddSourceBuffer;
              }
            };
          }

          let hlsPlayer: any;
          if (chrome38CompatMode) {
            hlsPlayer = new hlsRuntime({
              enableWorker: false,
              autoStartLoad: false,
              maxBufferLength: 30,
              liveSyncDurationCount: 3,
              manifestLoadingTimeOut: 10000,
              levelLoadingTimeOut: 10000,
              fragLoadingTimeOut: 15000,
              xhrSetup: (xhr: XMLHttpRequest) => {
                const ua = window.navigator.userAgent;
                if (ua) {
                  try {
                    xhr.setRequestHeader('User-Agent', ua);
                  } catch {}
                }
              }
            });
          } else {
            class PatchedPlaylistLoader extends DefaultLoader {
              load(
                context: LoaderContext,
                config: LoaderConfiguration,
                callbacks: LoaderCallbacks<LoaderContext>
              ) {
                // Serve the pre-rewritten text in-memory for the first manifest
                // request so segment URIs are absolute. All subsequent live
                // playlist polls go through normal XHR to the real origin.
                if (!firstManifestServed && rewrittenPlaylistText) {
                  firstManifestServed = true;
                  const now = performance.now();
                  const stats: LoaderStats = {
                    aborted: false,
                    loaded: rewrittenPlaylistText.length,
                    retry: 0,
                    total: rewrittenPlaylistText.length,
                    chunkCount: 0,
                    bwEstimate: 5000000,
                    loading: { start: now - 50, first: now - 20, end: now },
                    parsing: { start: now, end: now + 5 },
                    buffering: { start: now + 5, first: now + 10, end: now + 15 }
                  };
                  // Defer onSuccess by one tick so hls.js finishes its internal
                  // setup after load() returns before we fire the callback.
                  // Calling onSuccess synchronously inside load() causes hls.js
                  // to emit MANIFEST_LOADED before its internal state is ready,
                  // which triggers an immediate second loadSource() that aborts
                  // the first play() call and leaves readyState at 0 forever.
                  window.setTimeout(() => {
                    callbacks.onSuccess(
                      { data: rewrittenPlaylistText, url: resolvedStreamUrl, code: 200 },
                      stats,
                      context,
                      null
                    );
                  }, 0);
                  return;
                }

                super.load(context, config, callbacks);
              }
            }

            hlsPlayer = new hlsRuntime({
              enableWorker: !isWebOS && !legacyChromiumBrowser,
              lowLatencyMode: false,
              // Disable automatic load start so hls.js doesn't begin live
              // playlist polling before we've attached to the video element
              // and had a chance to buffer the first fragment. Without this,
              // the live refresh cycle fires _onMediaSourceOpen on every poll,
              // resetting the SourceBuffer and discarding buffered data.
              autoStartLoad: false,
              backBufferLength: isLive ? 20 : 30,
              maxBufferLength: isLive ? 30 : 60,
              liveBackBufferLength: isLive ? 30 : 60,
              manifestLoadingTimeOut: 5000,
              levelLoadingTimeOut: 5000,
              fragLoadingTimeOut: 5000,
              // Reduce retry counts for live HLS to prevent duplicate/overlapping playlist opens
              // that can trigger 403 errors on IPTV servers with per-connection limits
              manifestLoadingMaxRetry: isLive ? 0 : 4,
              levelLoadingMaxRetry: isLive ? 0 : 4,
              fragLoadingMaxRetry: isLive ? 1 : 4,
              pLoader: rewrittenPlaylistText ? (PatchedPlaylistLoader as unknown as PlaylistLoaderConstructor) : undefined,
              // Forward the browser/TV User-Agent on every XHR so live playlist
              // polling is not rejected by servers that enforce UA-based access
              // control (e.g. Xtream Codes returning 403 without a proper UA).
              xhrSetup: (xhr) => {
              const ua = window.navigator.userAgent;
              const requestTrace = {
                streamUrl: resolvedStreamUrl,
                currentSrc: attachedVideo.currentSrc || null
              };
              const revisitInfo = {
                ...getRevisitDebugInfo(),
                streamUrl: resolvedStreamUrl
              };
              const originalOpen = xhr.open.bind(xhr);
              const originalSend = xhr.send.bind(xhr);
              const originalSetRequestHeader = xhr.setRequestHeader.bind(xhr);
              const requestStartedAt = Date.now();
              const readXhrPreview = () => {
                try {
                  if (xhr.responseType && xhr.responseType !== 'text' && xhr.responseType !== '') {
                    return null;
                  }
                  const responseText = xhr.responseText;
                  return typeof responseText === 'string' ? responseText.slice(0, 160) : null;
                } catch {
                  return null;
                }
              };
              const shouldTraceRequest = (url: string | null | undefined) =>
                typeof url === 'string' && /\.m3u8(?:\?|$)/i.test(url);
              const traceRequestId = `manifest-${Date.now()}-${++manifestRequestTraceCounter}`;

              xhr.open = ((method: string, url: string, async?: boolean, username?: string | null, password?: string | null) => {
                (xhr as typeof xhr & { __smartiflyRequestUrl?: string }).__smartiflyRequestUrl = url;
                if (shouldTraceRequest(url)) {
                  window.__smartiflyRevisitDebug?.logHlsRequestStart({
                    requestId: traceRequestId,
                    url,
                    info: revisitInfo
                  });
                  console.warn(`${PLAYER_LOG_PREFIX} hls manifest xhr open`, {
                    requestId: traceRequestId,
                    ...requestTrace,
                    method,
                    url,
                    async,
                    username: username ?? null,
                    password: password ? '[redacted]' : null
                  });
                  console.warn(`${PLAYER_LOG_PREFIX} hls manifest request context`, {
                    requestId: traceRequestId,
                    ...requestTrace,
                    withCredentials: xhr.withCredentials,
                    ...summarizeCookieJar(),
                    locationHref: window.location.href,
                    userAgent: ua
                  });
                }
                return originalOpen(method, url, async, username ?? undefined, password ?? undefined);
              }) as typeof xhr.open;

              xhr.setRequestHeader = ((header: string, value: string) => {
                const requestUrl = (xhr as typeof xhr & { __smartiflyRequestUrl?: string }).__smartiflyRequestUrl;
                const normalizedHeader = header.toLowerCase();
                if (shouldTraceRequest(requestUrl) && (normalizedHeader === 'cookie' || normalizedHeader === 'authorization')) {
                  console.warn(`${PLAYER_LOG_PREFIX} hls manifest xhr header`, {
                    ...requestTrace,
                    header,
                    value: normalizedHeader === 'cookie' ? '[redacted]' : value
                  });
                }
                return originalSetRequestHeader(header, value);
              }) as typeof xhr.setRequestHeader;

              xhr.send = ((body?: Document | XMLHttpRequestBodyInit | null) => {
                const requestUrl = (xhr as typeof xhr & { __smartiflyRequestUrl?: string }).__smartiflyRequestUrl;
                const tracedRequest = shouldTraceRequest(requestUrl);
                if (tracedRequest) {
                  console.warn(`${PLAYER_LOG_PREFIX} hls manifest xhr send`, {
                    requestId: traceRequestId,
                    ...requestTrace,
                    bodyType: body == null ? 'none' : body instanceof FormData ? 'formdata' : typeof body
                  });
                }
                xhr.addEventListener('readystatechange', () => {
                  if (xhr.readyState === XMLHttpRequest.DONE && tracedRequest) {
                    console.warn(`${PLAYER_LOG_PREFIX} hls manifest xhr done`, {
                      requestId: traceRequestId,
                      ...requestTrace,
                      status: xhr.status,
                      responseURL: xhr.responseURL || null,
                      responseTextPreview: readXhrPreview()
                    });
                    window.__smartiflyRevisitDebug?.logHlsRequestDone({
                      requestId: traceRequestId,
                      url: requestUrl || resolvedStreamUrl,
                      responseUrl: xhr.responseURL || undefined,
                      status: xhr.status,
                      durationMs: Date.now() - requestStartedAt,
                      info: revisitInfo
                    });
                  }
                });
                xhr.addEventListener('abort', () => {
                  if (!tracedRequest) {
                    return;
                  }
                  window.__smartiflyRevisitDebug?.logHlsRequestAbort({
                    requestId: traceRequestId,
                    url: requestUrl || resolvedStreamUrl,
                    info: revisitInfo
                  });
                });
                xhr.addEventListener('error', () => {
                  if (!tracedRequest) {
                    return;
                  }
                  window.__smartiflyRevisitDebug?.logHlsRequestError({
                    requestId: traceRequestId,
                    url: requestUrl || resolvedStreamUrl,
                    status: xhr.status,
                    error: 'xhr error',
                    info: revisitInfo
                  });
                });
                return originalSend(body);
              }) as typeof xhr.send;
              if (ua) {
                try {
                  xhr.setRequestHeader('User-Agent', ua);
                } catch {
                  // Some environments block setting User-Agent via XHR — ignore.
                }
              }
            }
          });
        }
        hlsPlayerRef.current = hlsPlayer;

          // hls.js startup monitor armed log removed

          await new Promise<void>((resolve, reject) => {
            const hlsStartupStartedAt = Date.now();
            let settled = false;
            const finish = () => {
              if (settled) {
                return;
              }
              settled = true;
              cleanup();
              resolve();
            };

            const fail = (message: string) => {
              if (settled) {
                return;
              }
              settled = true;
              cleanup();
              reject(new Error(message));
            };

            const cleanup = () => {
              window.clearTimeout(timeoutId);
              window.clearInterval(diagnosticTimerId);
              hlsPlayer.off(hlsRuntime.Events.MEDIA_ATTACHED, onMediaAttached);
              hlsPlayer.off(hlsRuntime.Events.MEDIA_ATTACHING, onMediaAttaching);
              hlsPlayer.off(hlsRuntime.Events.MANIFEST_PARSED, onManifestParsed);
              hlsPlayer.off(hlsRuntime.Events.FRAG_BUFFERED, onFirstFragBuffered);
              hlsPlayer.off(hlsRuntime.Events.BUFFER_CREATED, onBufferCreated);
              hlsPlayer.off(hlsRuntime.Events.BUFFER_APPENDING, onBufferAppending);
              hlsPlayer.off(hlsRuntime.Events.BUFFER_APPENDED, onBufferAppended);
              hlsPlayer.off(hlsRuntime.Events.BUFFER_FLUSHING, onBufferFlushing);
              hlsPlayer.off(hlsRuntime.Events.BUFFER_EOS, onBufferEos);
              hlsPlayer.off(hlsRuntime.Events.SUBTITLE_TRACKS_UPDATED, onSubtitleTracksUpdated);
              hlsPlayer.off(hlsRuntime.Events.SUBTITLE_TRACK_SWITCH, onSubtitleTrackSwitch);
              restoreMediaSourceDebugging();
              // Keep the ERROR listener active so we receive logs and run recovery/escalation during playback.
            };
            const escalateToShaka = (reason: string) => {
              if (chrome38CompatMode || liveHlsJsFallbackToShakaUsedRef.current) {
                return;
              }

              liveHlsJsFallbackToShakaUsedRef.current = true;
              startupAttemptInFlightRef.current = false;
              clearRecoveryTimers();
              setIsReady(false);
              setRecoveryMessage('Retrying with fallback engine...');
              setStatusMessage('Retrying with fallback engine');
              setEngineOverride('shaka');
              setLoadNonce((value) => value + 1);
              console.warn(`${PLAYER_LOG_PREFIX} escalating hls.js to shaka fallback`, {
                from: activeStreamUrl,
                reason
              });
              void teardownHlsPlayer();
            };

            const onMediaAttaching = () => {
              logHlsVideoState('media-attaching');
            };

            const onMediaAttached = () => {
              if (cancelled || loadGeneration !== loadGenerationRef.current) {
                return;
              }

              hlsPlayer.loadSource(resolvedStreamUrl);
              // With autoStartLoad: false, we must call startLoad() explicitly.
              // This gives us control: the manifest is fetched (via loadSource),
              // but fragment loading only begins after we call startLoad(), which
              // prevents the live playlist poll cycle from firing _onMediaSourceOpen
              // before the SourceBuffer is ready.
              if (chrome38CompatMode) {
                hlsPlayer.startLoad(-1);
              } else {
                hlsPlayer.startLoad();
              }
            };

            const onBufferCreated = (_event: string, data: { tracks?: Record<string, { id?: string; codec?: string; container?: string; levelCodec?: string }> }) => {
              logHlsVideoState('buffer-created', {
                tracks: Object.entries(data.tracks ?? {}).map(([name, track]) => ({
                  name,
                  id: track?.id ?? null,
                  codec: track?.codec ?? null,
                  container: track?.container ?? null,
                  levelCodec: track?.levelCodec ?? null
                }))
              });
            };

            const onBufferAppending = (
              _event: string,
              data: { type?: string; parent?: string; data?: Uint8Array | ArrayBuffer; content?: string }
            ) => {
              const byteLength =
                data.data instanceof Uint8Array
                  ? data.data.byteLength
                  : data.data instanceof ArrayBuffer
                    ? data.data.byteLength
                    : null;
              logHlsVideoState('buffer-appending', {
                type: data.type ?? null,
                parent: data.parent ?? null,
                content: data.content ?? null,
                byteLength
              });
            };

            const onBufferAppended = (_event: string, data: { parent?: string; pending?: number; timeRanges?: unknown }) => {
              logHlsVideoState('buffer-appended', {
                parent: data.parent ?? null,
                pending: data.pending ?? null,
                timeRanges: data.timeRanges ?? null
              });
            };

            const onBufferFlushing = (
              _event: any,
              data: any
            ) => {
              logHlsVideoState('buffer-flushing', {
                type: data.type ?? null,
                startOffset: data.startOffset ?? null,
                endOffset: data.endOffset ?? null
              });
            };

            const onBufferEos = (_event: string, data: { type?: string }) => {
              logHlsVideoState('buffer-eos', {
                type: data.type ?? null
              });
            };

            const onManifestParsed = () => {
              if (cancelled || loadGeneration !== loadGenerationRef.current) {
                return;
              }

              applyVideoAudioState(attachedVideo, 'hlsjs-manifest-parsed');

              // Populate qualities/levels
              if (Array.isArray(hlsPlayer.levels)) {
                const levelTracks = hlsPlayer.levels.map((lvl: any, idx: number) => ({
                  id: idx,
                  label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
                  active: hlsPlayer.currentLevel === idx
                }));
                setQualities(levelTracks);
                setActiveQualityId(hlsPlayer.currentLevel === -1 ? 'auto' : hlsPlayer.currentLevel);
              }

              // Populate subtitles
              if (Array.isArray(hlsPlayer.subtitleTracks)) {
                const subtitleTracks = hlsPlayer.subtitleTracks.map((t: any, idx: number) => ({
                  id: idx,
                  label: t.name || t.lang || `Track ${idx + 1}`,
                  language: t.lang || '',
                  active: hlsPlayer.subtitleTrack === idx
                }));
                setSubtitles(subtitleTracks);
                setActiveSubtitleId(hlsPlayer.subtitleTrack === -1 ? 'off' : hlsPlayer.subtitleTrack);
              }

              window.clearTimeout(timeoutId);
              if (chrome38CompatMode) {
                finish();
                attachedVideo.play();
                return;
              }
              timeoutId = window.setTimeout(() => {
                fail(`hls.js startup timed out after ${hlsStartupTimeoutMs}ms`);
              }, hlsStartupTimeoutMs);
            };

            const onSubtitleTracksUpdated = () => {
              if (cancelled || loadGeneration !== loadGenerationRef.current) {
                return;
              }
              if (Array.isArray(hlsPlayer.subtitleTracks)) {
                const subtitleTracks = hlsPlayer.subtitleTracks.map((t: any, idx: number) => ({
                  id: idx,
                  label: t.name || t.lang || `Track ${idx + 1}`,
                  language: t.lang || '',
                  active: hlsPlayer.subtitleTrack === idx
                }));
                setSubtitles(subtitleTracks);
                setActiveSubtitleId(hlsPlayer.subtitleTrack === -1 ? 'off' : hlsPlayer.subtitleTrack);
              }
            };

            const onSubtitleTrackSwitch = () => {
              if (cancelled || loadGeneration !== loadGenerationRef.current) {
                return;
              }
              setActiveSubtitleId(hlsPlayer.subtitleTrack === -1 ? 'off' : hlsPlayer.subtitleTrack);
            };

            const onFirstFragBuffered = () => {
              if (cancelled || loadGeneration !== loadGenerationRef.current) {
                return;
              }

              hlsPlayer.off(hlsRuntime.Events.FRAG_BUFFERED, onFirstFragBuffered);

              // hls.js first frag buffered log removed
              applyVideoAudioState(attachedVideo, 'hlsjs-first-frag-buffered');

              // On webOS MSE streams video.play() may never settle or gets
              // interrupted by hls.js's internal live playlist reload. Treat
              // FRAG_BUFFERED itself as the startup success signal and call
              // finish() immediately, then fire play() in the background.
              // This unblocks setIsReady(true) without waiting for a promise
              // that may never resolve on this platform.
              finish();

              void (async () => {
                try {
                  await awaitPlayWithTimeout(attachedVideo, Math.max(NATIVE_PLAY_TIMEOUT_MS, startupGraceMs));
                } catch (error) {
                  console.warn(`${PLAYER_LOG_PREFIX} hls.js play promise did not resolve in time`, {
                    message: error instanceof Error ? error.message : String(error),
                    startupGraceMs,
                    timeoutMs: Math.max(NATIVE_PLAY_TIMEOUT_MS, startupGraceMs)
                  });
                }
              })();
            };

            const onHlsError = (
              _event: string,
              data: { type?: string; details?: string; fatal?: boolean; response?: { code?: number; text?: string } }
            ) => {
              if (cancelled || loadGeneration !== loadGenerationRef.current) {
                return;
              }

              console.warn(`${PLAYER_LOG_PREFIX} hls.js error event`, {
                type: data.type,
                details: data.details,
                fatal: data.fatal,
                responseCode: data.response?.code ?? null
              });
              window.__smartiflyRevisitDebug?.logHlsError({
                errorType: data.type,
                errorDetails: data,
                info: {
                  ...getRevisitDebugInfo(),
                  streamUrl: resolvedStreamUrl
                }
              });

              if (!data.fatal) {
                return;
              }

              const isFatalManifestStartupError =
                data.type === hlsRuntime.ErrorTypes.NETWORK_ERROR &&
                (data.details === 'manifestLoadError' ||
                  data.details === 'manifestLoadTimeOut' ||
                  data.details === 'manifestParsingError');

              if (isFatalManifestStartupError) {
                fail(
                  data.response?.code
                    ? `manifest request failed with ${data.response.code}`
                    : data.details || data.type || 'hls.js fatal manifest error'
                );
                return;
              }

              if (data.type === hlsRuntime.ErrorTypes.NETWORK_ERROR) {
                hlsPlayer.startLoad();
                return;
              }

              if (data.type === hlsRuntime.ErrorTypes.MEDIA_ERROR) {
                try {
                  hlsPlayer.recoverMediaError();
                  return;
                } catch (recoverError) {
                  console.warn(`${PLAYER_LOG_PREFIX} hls.js media recovery failed`, {
                    message: recoverError instanceof Error ? recoverError.message : String(recoverError)
                  });
                }
              }

              if (playback.kind === 'live' && !liveHlsJsFallbackToShakaUsedRef.current) {
                escalateToShaka(data.details || data.type || 'hls.js fatal error');
                fail(data.details || data.type || 'hls.js fatal error');
                return;
              }

              fail(data.details || data.type || 'hls.js fatal error');
            };

            // Two-phase timeout: a longer grace period before the first fragment
            // buffers, then a tighter window for play() to resolve after that.
            // This prevents the 15s timer from firing before FRAG_BUFFERED when
            // hls.js is still fetching the first segment.
            let timeoutId = window.setTimeout(() => {
              fail(`hls.js startup timed out after ${hlsStartupTimeoutMs}ms`);
            }, hlsStartupTimeoutMs);
            const diagnosticTimerId = window.setInterval(() => {
              logHlsVideoState('startup-poll', {
                elapsedMs: Date.now() - hlsStartupStartedAt,
                mediaErrorCode: attachedVideo.error?.code ?? null,
                mediaErrorMessage: attachedVideo.error?.message ?? null
              });
            }, 2000);

            hlsPlayer.on(hlsRuntime.Events.MEDIA_ATTACHING, onMediaAttaching);
            hlsPlayer.on(hlsRuntime.Events.MEDIA_ATTACHED, onMediaAttached);
            hlsPlayer.on(hlsRuntime.Events.MANIFEST_PARSED, onManifestParsed);
            hlsPlayer.on(hlsRuntime.Events.FRAG_BUFFERED, onFirstFragBuffered);
            hlsPlayer.on(hlsRuntime.Events.BUFFER_CREATED, onBufferCreated);
            hlsPlayer.on(hlsRuntime.Events.BUFFER_APPENDING, onBufferAppending);
            hlsPlayer.on(hlsRuntime.Events.BUFFER_APPENDED, onBufferAppended);
            hlsPlayer.on(hlsRuntime.Events.BUFFER_FLUSHING, onBufferFlushing);
            hlsPlayer.on(hlsRuntime.Events.BUFFER_EOS, onBufferEos);
            hlsPlayer.on(hlsRuntime.Events.ERROR, onHlsError);
            hlsPlayer.on(hlsRuntime.Events.SUBTITLE_TRACKS_UPDATED, onSubtitleTracksUpdated);
            hlsPlayer.on(hlsRuntime.Events.SUBTITLE_TRACK_SWITCH, onSubtitleTrackSwitch);

            // hls.js level/frag logs removed

            applyVideoAudioState(attachedVideo, 'hlsjs-before-attach');
            hlsPlayer.attachMedia(attachedVideo);
          });
        } else if (selectedEngine === 'native') {
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
          attachedVideo.load();
          applyVideoAudioState(attachedVideo, 'native-before-play');

          if (!isLive) {
          await new Promise<void>((resolve, reject) => {
            const diagnosticTimerId: any = undefined;

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
            try {
              await awaitPlayWithTimeout(attachedVideo, Math.max(NATIVE_PLAY_TIMEOUT_MS, startupGraceMs));
            } catch (error) {
              console.warn(`${PLAYER_LOG_PREFIX} live play promise did not resolve in time`, {
                message: error instanceof Error ? error.message : String(error),
                startupGraceMs,
                timeoutMs: Math.max(NATIVE_PLAY_TIMEOUT_MS, startupGraceMs)
              });
            }
          }

          if ((playback.resumePosition ?? 0) > 0 && !isLive) {
            attachedVideo.currentTime = playback.resumePosition ?? 0;
          }

          if (isLive) {
            try {
              await awaitPlayWithTimeout(attachedVideo, NATIVE_PLAY_TIMEOUT_MS);
            } catch (error) {
              console.warn(`${PLAYER_LOG_PREFIX} live play promise did not resolve in time`, {
                message: error instanceof Error ? error.message : String(error),
                timeoutMs: NATIVE_PLAY_TIMEOUT_MS
              });
            }
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
          const player = new shakaRuntime.Player();
          shakaPlayerRef.current = player;

          // Shaka loading/buffering diagnostics removed

          player.addEventListener('manifestparsed', () => {
            console.warn(`${PLAYER_LOG_PREFIX} shaka manifestparsed event`);
          });

          player.addEventListener('trackschanged', () => {
            if (cancelled) return;
            try {
              const textTracks = player.getTextTracks();
              setSubtitles(textTracks.map((t: any) => ({
                id: t.id,
                label: t.label || t.language || 'Unknown Language',
                language: t.language || '',
                active: t.active
              })));

              const isVisible = player.isTextTrackVisible();
              const activeText = textTracks.find((t: any) => t.active);
              setActiveSubtitleId(isVisible && activeText ? activeText.id : 'off');

              const variantTracks = player.getVariantTracks();
              const heights = Array.from(new Set(variantTracks.map((t: any) => t.height).filter(Boolean))) as number[];
              heights.sort((a, b) => b - a);
              setQualities(heights.map((h: number) => ({
                id: h,
                label: `${h}p`,
                active: false
              })));

              const isAuto = player.getConfiguration().abr.enabled;
              setActiveQualityId(isAuto ? 'auto' : (variantTracks.find((t: any) => t.active)?.height || 'auto'));
            } catch (err) {
              console.warn(`${PLAYER_LOG_PREFIX} shaka failed to read tracks on trackschanged`, err);
            }
          });

          player.addEventListener('adaptation', () => {
            if (cancelled) return;
            try {
              const isAuto = player.getConfiguration().abr.enabled;
              if (isAuto) {
                setActiveQualityId('auto');
              } else {
                const activeVariant = player.getVariantTracks().find((t: any) => t.active);
                if (activeVariant && activeVariant.height) {
                  setActiveQualityId(activeVariant.height);
                }
              }
            } catch (err) {
              console.warn(`${PLAYER_LOG_PREFIX} shaka failed on adaptation`, err);
            }
          });

          await player.attach(attachedVideo);
          applyVideoAudioState(attachedVideo, 'after-attach');
          logVideoSnapshot('shaka-after-attach', attachedVideo, {
            currentSrc: attachedVideo.currentSrc || null,
            src: attachedVideo.getAttribute('src')
          });
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
            console.warn(`${PLAYER_LOG_PREFIX} shaka request`, {
              type,
              method: request.method ?? null,
              uris: (request.uris ?? []).map((uri) => uri.slice(0, 200)),
              headers: request.headers ?? null
            });
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

            if (playback.kind === 'live' && detail?.code === 1001) {
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
          logVideoSnapshot('shaka-after-load', attachedVideo, {
            currentSrc: attachedVideo.currentSrc || null,
            src: attachedVideo.getAttribute('src')
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
          logVideoSnapshot('shaka-before-play', attachedVideo, {
            currentSrc: attachedVideo.currentSrc || null,
            src: attachedVideo.getAttribute('src')
          });
          await awaitPlayWithTimeout(attachedVideo, NATIVE_PLAY_TIMEOUT_MS);
          logVideoSnapshot('shaka-after-play', attachedVideo, {
            currentSrc: attachedVideo.currentSrc || null,
            src: attachedVideo.getAttribute('src')
          });

          if (attachedVideo.paused) {
            throw new Error('Shaka play() resolved but the video element remained paused');
          }

          await awaitPlaybackStartSignal(attachedVideo, NATIVE_PROGRESS_TIMEOUT_MS);
          logVideoSnapshot('shaka-start-confirmed', attachedVideo, {
            currentSrc: attachedVideo.currentSrc || null,
            src: attachedVideo.getAttribute('src')
          });
        }

          // video.play resolved log removed

        if (cancelled) {
          return;
        }

        setIsPlaying(!attachedVideo.paused);
        setIsReady(true);
        playbackStartedAtRef.current = Date.now();
        lastProgressAtRef.current = playbackStartedAtRef.current;
        startupAttemptInFlightRef.current = false;
        console.warn(`${PLAYER_LOG_PREFIX} player opened`, {
          id: playback.id,
          title: playback.title,
          kind: playback.kind,
          streamUrl: activeStreamUrl,
          resolvedStreamUrl,
          engine: selectedEngine,
          liveStreamId: currentLiveStreamId
        });
        if (playback.kind === 'live' && currentLiveStreamId != null && getLiveSwitchContext().streamId === currentLiveStreamId) {
          setLiveSwitchContext({ fromSwitch: false });
        }
        // Clear the fresh-live-open isolation after a successful live open so
        // subsequent channel switches (including backward switches) can use
        // the normal recovery/fallback logic.
        if (playback.kind === 'live' && isFreshLiveOpenIsolationActive()) {
          setFreshLiveOpenIsolationActive(false);
        }
        if (playback.kind !== 'live') {
          showHUD();
        } else {
          suppressHudRevealRef.current = true;
          scheduleLiveNoProgressWatchdog('Live startup armed');
        }
      } catch (error) {
        if (loadAbortController.signal.aborted) {
          startupAttemptInFlightRef.current = false;
          return;
        }

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
          const isManualSwitchFailure = isCurrentSwitchTarget && switchContext.fromSwitch;
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
          const shouldCooldownLiveFailure = false;
          console.warn(`${PLAYER_LOG_PREFIX} load failed`, {
            message,
            errorCode,
            engine: selectedEngine,
            streamUrl: activeStreamUrl,
            resolvedStreamUrl,
            fallbackIndex: activeStreamIndex,
            hasMoreFallbacks: activeStreamIndex + 1 < playbackSources.length,
            isManualSwitchFailure,
            holdReconnect,
            recentRevisit,
            reconnectFailure,
            shouldCooldownLiveFailure,
            preferShakaForLiveHls
          });

          if (playback.kind === 'live' && isFreshLiveOpenIsolationActive()) {
            console.warn(`${PLAYER_LOG_PREFIX} clearing fresh live open isolation after failed live startup`, {
              streamUrl: activeStreamUrl,
              resolvedStreamUrl,
              message
            });
            setFreshLiveOpenIsolationActive(false);
          }

          if (selectedEngine === 'hlsjs' && liveHlsJsFallbackToShakaUsedRef.current) {
            startupAttemptInFlightRef.current = false;
            return;
          }

          if (
            playback.kind === 'live' &&
            selectedEngine === 'native' &&
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

          if (isManualSwitchFailure && looksForbiddenLikeMessage(message)) {
            console.warn(`${PLAYER_LOG_PREFIX} manual live switch forbidden, skipping reconnect cooldown`, {
              streamId: currentLiveStreamId,
              streamUrl: activeStreamUrl,
              reason: message
            });
            startupAttemptInFlightRef.current = false;
            clearRecoveryTimers();
            setIsReady(false);
            setRecoveryMessage('Channel unavailable');
            setStatusMessage('Channel unavailable');
            return;
          }

          if (!isLive && playbackStartupGuard && !startupGuardRetryUsedRef.current) {
            if (scheduleStartupGuardRetry(message)) {
              return;
            }
          }

          // During fresh live open isolation, skip fallback to prevent duplicate opens
          if (
            playback.kind === 'live' &&
            selectedEngine === 'native' &&
            engineOverride == null &&
            !liveNativeStartupRetryUsedRef.current &&
            !isFreshLiveOpenIsolationActive()
          ) {
            liveNativeStartupRetryUsedRef.current = true;
            console.warn(`${PLAYER_LOG_PREFIX} retrying live hls.js startup once`, {
              from: activeStreamUrl,
              reason: message
            });
            setRecoveryMessage('Buffering...');
            setStatusMessage('Buffering...');
            setIsReady(false);
            setEngineOverride('hlsjs');
            setLoadNonce((value) => value + 1);
            return;
          }

          if (
            selectedEngine === 'native' &&
            engineDecision.allowShakaFallback &&
            engineOverride !== 'shaka' &&
            !preferShakaForLiveHls &&
            !isFreshLiveOpenIsolationActive()
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

          // During fresh live open isolation (manual switch), prevent hls.js to shaka escalation
          // as it would create duplicate playlist opens and trigger 403 errors
          if (
            !chrome38CompatMode &&
            playback.kind === 'live' &&
            selectedEngine === 'hlsjs' &&
            !liveHlsJsFallbackToShakaUsedRef.current &&
            !isFreshLiveOpenIsolationActive()
          ) {
            liveHlsJsFallbackToShakaUsedRef.current = true;
            console.warn(`${PLAYER_LOG_PREFIX} escalating hls.js live startup to shaka fallback`, {
              from: activeStreamUrl,
              reason: message
            });
            setRecoveryMessage('Retrying with fallback engine...');
            setStatusMessage('Retrying with fallback engine');
            setIsReady(false);
            setEngineOverride('shaka');
            setLoadNonce((value) => value + 1);
            return;
          }

          if (
            selectedEngine === 'shaka' &&
            engineOverride == null &&
            !liveShakaStartupRetryUsedRef.current &&
            !isFreshLiveOpenIsolationActive()
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

          if (selectedEngine === 'shaka' && !holdReconnect && !isFreshLiveOpenIsolationActive()) {
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

            console.warn(`${PLAYER_LOG_PREFIX} terminal playback failure`, {
              message,
              streamUrl: activeStreamUrl,
              resolvedStreamUrl,
              selectedEngine,
              isFreshLiveOpenIsolationActive: isFreshLiveOpenIsolationActive(),
              liveSessionEpoch: liveSessionEpochRef.current
            });
            console.error(`${PLAYER_LOG_PREFIX} terminal failure context`, {
              playbackId: playback.id,
              currentLiveStreamId,
              liveSwitchContext: getLiveSwitchContext(),
              revisitDebug: getRevisitDebugInfo(),
              isFreshLiveOpenIsolationActive: isFreshLiveOpenIsolationActive(),
              liveSessionEpoch: liveSessionEpochRef.current,
              ts: Date.now()
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
      loadAbortControllerRef.current?.abort();
      loadAbortControllerRef.current = null;
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
            description: currentPlayback.description,
            playbackId: currentPlayback.id,
            containerExtension: currentPlayback.containerExtension
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
      const curTime = video.currentTime || 0;
      setCurrentTime(curTime);
      setBufferedTime(getBufferedTime(video));
      setDuration((currentDuration) => currentDuration || getFallbackDuration(video));

      const prevTime = lastPlayTimeRef.current || 0;
      lastPlayTimeRef.current = curTime;

      const timeDiff = curTime - prevTime;
      // Normal progression: currentTime is moving forward normally, not seeking, and not a large jump.
      const isNormalProgress = !video.seeking && timeDiff > 0 && timeDiff < 2.0;

      if (isNormalProgress || playback?.kind !== 'live') {
        lastProgressAtRef.current = Date.now();
      }

      if (playback?.kind === 'live') {
        if (isNormalProgress) {
          if (curTime > 0) {
            liveNoProgressRetryUsedRef.current = false;
          }
          clearLiveNoProgressWatchdog();
          scheduleLiveNoProgressWatchdog('Live playback stalled');
        }
      }
      if (!video.paused) {
        playbackStartedAtRef.current = playbackStartedAtRef.current || Date.now();
        // Track watch progress during active playback
        reportPlaybackProgress();
      }
      setIsReady(true);
      clearStallWatchdog();

      const isPlaybackActive = isPlaybackVisiblyActive(video, isLive);
      if (isPlaybackActive) {
        setRecoveryMessage(null);
        setStartupOverlayMessage(null);
      }
    };

    const handleDurationChange = () => {
      setDuration(getFallbackDuration(video));
      setBufferedTime(getBufferedTime(video));
    };

    const handleLoadedMetadata = () => {
      logVideoSnapshot('loadedmetadata', video, {
        metadata: true
      });
      handleDurationChange();
      applyVideoAudioState(video, 'loadedmetadata');
      if (isPlaybackVisiblyActive(video, isLive)) {
        setRecoveryMessage(null);
        setStartupOverlayMessage(null);
      }
      if (activeEngineRef.current === 'native') {
        handleNativeTracks();
      }
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
        scheduleLiveNoProgressWatchdog('Live playback active');
      }
      
      const isPlaybackActive = isPlaybackVisiblyActive(video, isLive);
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
      const isPlaybackActive = isPlaybackVisiblyActive(video, isLive);
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
        if (chrome38CompatMode && (playback.kind === 'movie' || playback.kind === 'series') && mediaError?.code === 4) {
          console.warn(`${PLAYER_LOG_PREFIX} Chrome 38 progressive stream failed with media error code 4 (SRC_NOT_SUPPORTED). Showing clear unsupported codec/container message.`);
          startupAttemptInFlightRef.current = false;
          clearRecoveryTimers();
          setIsReady(false);
          setRecoveryMessage('Unsupported codec/container (likely HEVC/AC3) for Chrome 38 desktop');
          setStatusMessage('Unsupported codec/container');
          return;
        }

        const nextFallbackIndex = activeStreamIndex + 1;
        const nextFallbackUrl = playbackSources[nextFallbackIndex];
        const isMkvFallback = nextFallbackUrl && nextFallbackUrl.split('?')[0].toLowerCase().endsWith('.mkv');
        const allowShakaFallback = !chrome38CompatMode && !(isLive && isM3u8Url(activeStreamUrl));
        const suppressLegacyLiveHlsFallback =
          !chrome38CompatMode &&
          legacyChromiumBrowser &&
          isLive &&
          isM3u8Url(activeStreamUrl);

        const suppressFallback = suppressLegacyLiveHlsFallback || (chrome38CompatMode && isMkvFallback);

        if (suppressLegacyLiveHlsFallback) {
          console.debug(`${PLAYER_LOG_PREFIX} legacy native live HLS fallback suppressed`, {
            url: activeStreamUrl,
            code: mediaError?.code,
            message: mediaError?.message,
            nextFallbackUrl,
            nextFallbackIndex
          });
        }

        if (chrome38CompatMode && isMkvFallback) {
          console.warn(`${PLAYER_LOG_PREFIX} Chrome 38 .mkv fallback suppressed`, {
            url: activeStreamUrl,
            nextFallbackUrl,
            nextFallbackIndex
          });
        }

        if (nextFallbackUrl && !suppressFallback) {
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

        if (!engineOverride && allowShakaFallback && !suppressLegacyLiveHlsFallback) {
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

    const handleTextTrackChange = () => {
      if (activeEngineRef.current === 'native') {
        handleNativeTracks();
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
    if (video.textTracks) {
      video.textTracks.addEventListener('change', handleTextTrackChange);
    }

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
      if (video.textTracks) {
        video.textTracks.removeEventListener('change', handleTextTrackChange);
      }
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

  const handleCardClick = useCallback((targetIndex: number) => {
    if (!playbackRef.current || playbackRef.current.kind !== 'live' || !Array.isArray(playbackRef.current.liveQueue) || playbackRef.current.liveQueue.length === 0) {
      return;
    }
    const currentPlayback = playbackRef.current;
    const currentIndex = currentPlayback.liveQueue.findIndex((entry) => entry.id === currentPlayback.id);
    const fallbackIndex = typeof currentPlayback.liveIndex === 'number' && currentPlayback.liveIndex >= 0 ? currentPlayback.liveIndex : -1;
    const resolvedIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;
    const resolvedNextIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
    const delta = targetIndex - resolvedNextIndex;
    void switchLiveChannel(delta);
  }, [switchLiveChannel]);

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
        if (event.key === 'Escape' || event.key === 'Backspace') {
          event.preventDefault();
          setShowSettings(false);
          setSettingsView('root');
          focusButton('settings');
          return;
        }

        if (settingsFocusSection === 'categories') {
          const categories: SettingsCategory[] = ['subtitles', 'quality', 'speed', 'aspect', 'mute', 'close'];
          const currentIndex = categories.indexOf(activeCategory);

          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            const nextIndex = (currentIndex + step + categories.length) % categories.length;
            const nextCategory = categories[nextIndex]!;
            setActiveCategory(nextCategory);
            categoryRefs.current[nextCategory]?.focus();
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            if (activeCategory !== 'close') {
              const opts = getOptionsForCategory(activeCategory);
              if (opts.length > 0) {
                setSettingsFocusSection('options');
                setFocusedOptionIdx(0);
                setTimeout(() => {
                  optionRefs.current[0]?.focus();
                }, 0);
              }
            }
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (activeCategory === 'close') {
              setShowSettings(false);
              focusButton('settings');
            } else {
              const opts = getOptionsForCategory(activeCategory);
              if (opts.length > 0) {
                setSettingsFocusSection('options');
                setFocusedOptionIdx(0);
                setTimeout(() => {
                  optionRefs.current[0]?.focus();
                }, 0);
              }
            }
          }
        } else {
          const optionsList = getOptionsForCategory(activeCategory);
          const optionsCount = optionsList.length;

          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (optionsCount > 0) {
              const step = event.key === 'ArrowDown' ? 1 : -1;
              const nextIndex = (focusedOptionIdx + step + optionsCount) % optionsCount;
              setFocusedOptionIdx(nextIndex);
              optionRefs.current[nextIndex]?.focus();
            }
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setSettingsFocusSection('categories');
            categoryRefs.current[activeCategory]?.focus();
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (optionsCount > 0 && optionRefs.current[focusedOptionIdx]) {
              optionRefs.current[focusedOptionIdx]?.click();
            }
          }
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

      if (isHudVisible && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        if (isLive) {
          revealLiveHud();
        } else {
          showHUD();
        }

        if (hudFocusSection === 'center') {
          if (event.key === 'ArrowLeft') {
            if (focusedId === 'forward') focusButton('play');
            else if (focusedId === 'play') focusButton('rewind');
          } else if (event.key === 'ArrowRight') {
            if (focusedId === 'rewind') focusButton('play');
            else if (focusedId === 'play') focusButton('forward');
          } else if (event.key === 'ArrowDown') {
            const hasQueue = playback.kind === 'live' && Array.isArray(playback.liveQueue) && playback.liveQueue.length > 0;
            if (hasQueue) {
              setHudFocusSection('rail');
              const targetIdx = focusedChannelIdx < playback.liveQueue.length ? focusedChannelIdx : 0;
              setTimeout(() => {
                channelRefs.current[targetIdx]?.focus();
                channelRefs.current[targetIdx]?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
              }, 0);
            } else {
              setHudFocusSection('bottom');
              focusButton('back');
            }
          }
        } else if (hudFocusSection === 'rail') {
          const queue = playback.liveQueue || [];
          const queueLength = queue.length;
          if (event.key === 'ArrowLeft') {
            if (queueLength > 0) {
              const nextIndex = (focusedChannelIdx - 1 + queueLength) % queueLength;
              setFocusedChannelIdx(nextIndex);
              setTimeout(() => {
                channelRefs.current[nextIndex]?.focus();
                channelRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }, 0);
            }
          } else if (event.key === 'ArrowRight') {
            if (queueLength > 0) {
              const nextIndex = (focusedChannelIdx + 1) % queueLength;
              setFocusedChannelIdx(nextIndex);
              setTimeout(() => {
                channelRefs.current[nextIndex]?.focus();
                channelRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }, 0);
            }
          } else if (event.key === 'ArrowUp') {
            if (!isLive) {
              setHudFocusSection('center');
              focusButton('play');
            }
          } else if (event.key === 'ArrowDown') {
            setHudFocusSection('bottom');
            focusButton('back');
          }
        } else if (hudFocusSection === 'bottom') {
          if (event.key === 'ArrowLeft') {
            if (focusedId === 'settings') focusButton('back');
          } else if (event.key === 'ArrowRight') {
            if (focusedId === 'back') focusButton('settings');
          } else if (event.key === 'ArrowUp') {
            const hasQueue = playback.kind === 'live' && Array.isArray(playback.liveQueue) && playback.liveQueue.length > 0;
            if (hasQueue) {
              setHudFocusSection('rail');
              const targetIdx = focusedChannelIdx < playback.liveQueue.length ? focusedChannelIdx : 0;
              setTimeout(() => {
                channelRefs.current[targetIdx]?.focus();
                channelRefs.current[targetIdx]?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
              }, 0);
            } else if (!isLive) {
              setHudFocusSection('center');
              focusButton('play');
            }
          } else if (event.key === 'ArrowDown') {
            setIsHudVisible(false);
            clearSilentSeekSuppression();
          }
        }
        return;
      }

      if (!isHudVisible && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        event.stopPropagation();
        seekBy(event.key === 'ArrowLeft' ? -SEEK_STEP_SECONDS : SEEK_STEP_SECONDS, false);
        return;
      }

      if (!isHudVisible && event.key === 'ArrowUp') {
        event.preventDefault();
        if (isLive) {
          revealLiveHud();
          const hasQueue = Array.isArray(playback.liveQueue) && playback.liveQueue.length > 0;
          if (hasQueue) {
            setHudFocusSection('rail');
            const targetIdx = focusedChannelIdx < playback.liveQueue.length ? focusedChannelIdx : 0;
            setTimeout(() => {
              channelRefs.current[targetIdx]?.focus();
              channelRefs.current[targetIdx]?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
            }, 0);
          } else {
            setHudFocusSection('bottom');
            focusButton('back');
          }
        } else {
          showHUD();
          focusButton('play');
        }
        return;
      }

      if (!isHudVisible && event.key === 'ArrowDown') {
        event.preventDefault();
        setIsHudVisible(false);
        clearSilentSeekSuppression();
        return;
      }

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (isHudVisible) {
          if (hudFocusSection === 'rail') {
            handleCardClick(focusedChannelIdx);
            return;
          }
          if (focusedId !== 'play') {
            buttonRefs.current[focusedId]?.click();
            return;
          }
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
  }, [
    closePlayer,
    focusedId,
    isHudVisible,
    isLive,
    playback,
    revealLiveHud,
    seekBy,
    showHUD,
    showSettings,
    settingsView,
    switchLiveChannel,
    activeCategory,
    settingsFocusSection,
    focusedOptionIdx,
    subtitles,
    qualities,
    hudFocusSection,
    focusedChannelIdx,
    handleCardClick
  ]);

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

    setFocusedId(playback?.kind === 'live' ? 'back' : 'play');
  }, [isHudVisible, playback?.kind, revealLiveHud, showHUD]);

  useEffect(() => {
    if (!showSettings) {
      return;
    }

    if (settingsFocusSection === 'categories') {
      categoryRefs.current[activeCategory]?.focus();
    } else {
      optionRefs.current[focusedOptionIdx]?.focus();
    }
  }, [showSettings, settingsFocusSection, activeCategory, focusedOptionIdx]);

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
          {(recoveryMessage.toLowerCase().includes('unavailable') || recoveryMessage.toLowerCase().includes('could not recover') || recoveryMessage.toLowerCase().includes('not supported')) ? (
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
            
            {isLive && (currentProgram || nextProgram) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px', maxWidth: '680px' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '15px', fontWeight: 600, lineHeight: 1.35, margin: 0 }}>
                  {currentProgram 
                    ? (currentProgram.description ? truncateLine(currentProgram.description, 120) : 'No description available.')
                    : 'Guide unavailable for this channel'}
                </p>
                {nextProgram && (
                  <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Next: {nextProgram.title} ({formatEpgTime(nextProgram.startTime)})
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={playerHudMeta}>
            <span>{isReady ? 'Ready' : 'Loading'}</span>
            <span>{isMuted ? 'Muted' : 'Audio on'}</span>
          </div>
        </div>

        {isHudVisible && !isLive ? (
          <div style={playerCenterControls}>
            <button
              ref={(node) => {
                buttonRefs.current.rewind = node;
              }}
              type="button"
              className="player-center-button"
              style={mergeStyle(playerCenterButton, focusedId === 'rewind' && playerButtonActive)}
              onFocus={() => {
                setFocusedId('rewind');
                setHudFocusSection('center');
              }}
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
              onFocus={() => {
                setFocusedId('play');
                setHudFocusSection('center');
              }}
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
              className="player-center-button"
              style={mergeStyle(playerCenterButton, focusedId === 'forward' && playerButtonActive)}
              onFocus={() => {
                setFocusedId('forward');
                setHudFocusSection('center');
              }}
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
          </div>
        ) : null}

        {isHudVisible ? (
          <footer style={playerHudDock}>
            <div style={playerProgressWrap}>
              {isLive && (currentProgram || nextProgram) ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', fontSize: '16px' }}>
                  <span style={{ color: '#e50914', fontWeight: 800 }}>
                    {currentProgram ? currentProgram.title : 'Guide unavailable for this channel'}
                  </span>
                  {currentProgram && (
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                      {formatEpgTime(currentProgram.startTime)} - {formatEpgTime(currentProgram.endTime)}
                    </span>
                  )}
                </div>
              ) : null}

              <div style={playerProgress} aria-hidden="true">
                {isLive && currentProgram ? (
                  <div style={{ ...playerProgressPlayed, width: `${currentProgramProgress * 100}%`, background: '#e50914' }} />
                ) : isLive ? (
                  <div style={{ ...playerProgressPlayed, width: '100%', background: '#e50914' }} />
                ) : (
                  <>
                    <div style={{ ...playerProgressBuffered, width: `${bufferPercent * 100}%` }} />
                    <div style={{ ...playerProgressPlayed, width: `${progressPercent * 100}%` }} />
                  </>
                )}
              </div>

              {(!isLive || !currentProgram) && (
                <div style={playerTime}>
                  {isLive ? (
                    <>
                      <span />
                      <span style={{ color: '#e50914', fontWeight: 800 }}>LIVE</span>
                    </>
                  ) : (
                    <>
                      <span>{formatTime(currentTime)}</span>
                      <span>-{formatTime(Math.max(duration - currentTime, 0))}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Row containing Rail on the left and Utilities on the right */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isLive && playback.liveQueue && playback.liveQueue.length > 0 && (
                  <div 
                    style={playerChannelRail} 
                    className="player-channel-rail"
                  >
                    {playback.liveQueue.map((chan: any, idx: number) => {
                      const isActive = chan.id === playback.id;
                      const isFocused = hudFocusSection === 'rail' && focusedChannelIdx === idx;
                      return (
                        <button
                          key={chan.id}
                          ref={(node) => {
                            channelRefs.current[idx] = node;
                          }}
                          type="button"
                          className="player-channel-card"
                          style={mergeStyle(
                            playerChannelCard,
                            isActive && playerChannelCardActive,
                            isFocused && playerChannelCardFocused
                          )}
                          onFocus={() => {
                            setFocusedChannelIdx(idx);
                            setHudFocusSection('rail');
                            revealLiveHud();
                          }}
                          onClick={() => handleCardClick(idx)}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', boxSizing: 'border-box' }}>
                            {(chan.artwork || chan.logo) ? (
                              <img 
                                src={chan.artwork || chan.logo} 
                                alt="" 
                                style={playerChannelCardLogo} 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <span style={playerChannelCardTitle}>{chan.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={mergeStyle(playerControls, { width: 'auto', justifyContent: 'flex-end', gap: '16px', padding: '0 20px', flexShrink: 0 })}>
                <button
                  ref={(node) => {
                    buttonRefs.current.back = node;
                  }}
                  type="button"
                  style={mergeStyle(playerButton, focusedId === 'back' && playerButtonActive)}
                  onFocus={() => {
                    setFocusedId('back');
                    setHudFocusSection('bottom');
                  }}
                  onClick={closePlayer}
                  aria-label="Back"
                  title="Back"
                >
                  <PlayerIcon name="back" />
                </button>

                <button
                  ref={(node) => {
                    buttonRefs.current.settings = node;
                  }}
                  type="button"
                  style={mergeStyle(playerButton, focusedId === 'settings' && playerButtonActive)}
                  onFocus={() => {
                    setFocusedId('settings');
                    setHudFocusSection('bottom');
                  }}
                  onClick={() => {
                    setShowSettings(true);
                    setSettingsView('root');
                    setActiveCategory('subtitles');
                    setSettingsFocusSection('categories');
                    setFocusedOptionIdx(0);
                  }}
                  aria-label="Settings"
                  title="Settings"
                >
                  <PlayerIcon name="settings" />
                </button>
              </div>
            </div>
          </footer>
        ) : null}
      </header>

      {showSettings ? (
        <div className="player-settings" style={playerSettings} role="dialog" aria-modal="true" aria-label="Player settings">
          <div className="player-settings-panel" style={netflixPanelStyle} ref={settingsPanelRef}>
            {/* Left Column: Categories */}
            <div style={netflixLeftColumnStyle}>
              <div style={netflixBrandHeaderStyle}>Settings</div>
              {(['subtitles', 'quality', 'speed', 'aspect', 'mute'] as const).map((category) => {
                const label = category === 'mute' ? 'Audio Mute' : category.charAt(0).toUpperCase() + category.slice(1);
                let valueStr = '';
                if (category === 'subtitles') {
                  valueStr = activeSubtitleId === 'off' ? 'Off' : subtitles.find((s) => s.id === activeSubtitleId)?.label || 'On';
                } else if (category === 'quality') {
                  valueStr = getActiveQualityLabel();
                } else if (category === 'speed') {
                  valueStr = `${playbackRate}x`;
                } else if (category === 'aspect') {
                  valueStr = aspectMode;
                } else if (category === 'mute') {
                  valueStr = isMuted ? 'On' : 'Off';
                }

                const isActive = activeCategory === category;
                const isFocused = settingsFocusSection === 'categories' && isActive;

                return (
                  <button
                    key={category}
                    ref={(node) => {
                      categoryRefs.current[category] = node;
                    }}
                    type="button"
                    className="netflix-category-btn"
                    style={mergeStyle(
                      netflixCategoryButtonStyle,
                      isActive && netflixCategoryButtonActiveStyle,
                      isFocused && netflixCategoryButtonFocusedStyle,
                      isActive && isFocused && { boxShadow: 'inset 4px 0 0 0 #e50914, inset 0 0 0 2px #e50914' }
                    )}
                    onFocus={() => {
                      setActiveCategory(category);
                      setSettingsFocusSection('categories');
                    }}
                    onClick={() => {
                      const opts = getOptionsForCategory(category);
                      if (opts.length > 0) {
                        setSettingsFocusSection('options');
                        setFocusedOptionIdx(0);
                        setTimeout(() => {
                          optionRefs.current[0]?.focus();
                        }, 0);
                      }
                    }}
                  >
                    <span style={netflixCategoryTitleStyle}>{label}</span>
                    <span style={netflixCategoryValueStyle}>{valueStr}</span>
                  </button>
                );
              })}

              <div style={{ marginTop: 'auto', height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '16px 0 8px 0' }} />
              <button
                ref={(node) => {
                  categoryRefs.current['close'] = node;
                }}
                type="button"
                className="netflix-category-btn"
                style={mergeStyle(
                  netflixCategoryButtonStyle,
                  activeCategory === 'close' && netflixCategoryButtonActiveStyle,
                  settingsFocusSection === 'categories' && activeCategory === 'close' && netflixCategoryButtonFocusedStyle
                )}
                onFocus={() => {
                  setActiveCategory('close');
                  setSettingsFocusSection('categories');
                }}
                onClick={() => {
                  setShowSettings(false);
                  focusButton('settings');
                }}
              >
                <span style={{ fontWeight: 800 }}>Close</span>
              </button>
            </div>

            {/* Right Column: Options list */}
            <div style={netflixRightColumnStyle}>
              {activeCategory !== 'close' ? (
                <>
                  <div style={netflixBrandHeaderStyle}>
                    {activeCategory === 'mute' ? 'Audio Mute Options' : `${activeCategory.toUpperCase()} Options`}
                  </div>
                  <div style={netflixOptionsListStyle}>
                    {getOptionsForCategory(activeCategory).map((opt, idx) => {
                      const isActive = isOptionActive(activeCategory, opt.id);
                      const isFocused = settingsFocusSection === 'options' && focusedOptionIdx === idx;

                      return (
                        <button
                          key={opt.id}
                          ref={(node) => {
                            optionRefs.current[idx] = node;
                          }}
                          type="button"
                          className="netflix-option-btn"
                          style={mergeStyle(
                            netflixOptionButtonStyle,
                            isActive && netflixOptionButtonActiveStyle,
                            isFocused && netflixOptionButtonFocusedStyle
                          )}
                          onFocus={() => {
                            setSettingsFocusSection('options');
                            setFocusedOptionIdx(idx);
                          }}
                          onClick={() => {
                            handleOptionSelect(activeCategory, opt.id);
                          }}
                        >
                          <span>{opt.label}</span>
                          {isActive && <span style={netflixCheckmarkStyle}>✓</span>}
                        </button>
                      );
                    })}

                    {activeCategory === 'subtitles' && subtitles.length === 0 && (
                      <div style={netflixNoOptionsStyle}>No subtitle tracks available</div>
                    )}
                  </div>
                </>
              ) : (
                <div style={netflixClosePromptStyle}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
                    Exit Settings
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px' }}>
                    Press Enter or select close to return to playback controls.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PlayerScreen;
