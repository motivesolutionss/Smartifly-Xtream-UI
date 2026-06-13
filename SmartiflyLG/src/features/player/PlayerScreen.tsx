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
import { legacyChromiumBrowser } from '../../utils/legacyBrowser';

declare global {
  interface Window {
    Hls?: typeof import('hls.js').default;
    shaka?: typeof import('shaka-player').default;
  }
}

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

function rewriteStreamUrlForTesting(url: string): string {
  if (!url) return url;

  const isHosted = typeof window !== 'undefined' && 
    window.location.protocol.indexOf('http') === 0 && 
    window.location.host.indexOf('10.20.30.10:25461') === -1;

  if (isHosted && url.indexOf('http://10.20.30.10:25461') === 0) {
    const relativePath = url.substring('http://10.20.30.10:25461'.length);
    const proxyUrl = '/stream-proxy' + relativePath;
    console.warn(`[Player Proxy] Rewriting URL for hosted testing: ${url} -> ${proxyUrl}`);
    return proxyUrl;
  }

  return url;
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
  const [focusedId, setFocusedId] = useState<PlayerFocusId>('play');
  const [liveEpg, setLiveEpg] = useState<XtreamShortEpgEntry[]>([]);
  const [clockMs, setClockMs] = useState(() => Date.now());
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
  }, [playback?.id, playback?.streamUrl]);

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
    setAspectMode('fill');

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
      let resolvedStreamUrl = rewriteStreamUrlForTesting(activeStreamUrl);

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
          preferShakaForLiveHls
        });

        selectedEngine = engineOverride === 'hlsjs' ? 'hlsjs' : engineDecision.engine;
        activeEngineRef.current = selectedEngine;
        console.debug(`${PLAYER_LOG_PREFIX} engine decision`, { engineDecision, selectedEngine, ts: Date.now() });

        const shouldSkipRedirectResolution =
          isManualLiveSwitchStartup ||
          (playback.kind === 'live' && (selectedEngine === 'hlsjs' || selectedEngine === 'shaka'));
        console.debug(`${PLAYER_LOG_PREFIX} redirect resolution`, { shouldSkipRedirectResolution, activeStreamUrl, selectedEngine, isManualLiveSwitchStartup, ts: Date.now() });

        if (shouldSkipRedirectResolution) {
          console.warn(`${PLAYER_LOG_PREFIX} skipping redirect resolution`, {
            activeStreamUrl,
            selectedEngine,
            isManualLiveSwitchStartup,
            playKind: playback.kind
          });
          resolvedStreamUrl = rewriteStreamUrlForTesting(activeStreamUrl);
        } else {
          console.warn(`${PLAYER_LOG_PREFIX} resolving redirected stream URL`, {
            activeStreamUrl,
            selectedEngine,
            isManualLiveSwitchStartup,
            playKind: playback.kind
          });
          resolvedStreamUrl = (activeStreamUrl.indexOf('http') === 0 || activeStreamUrl.indexOf('/') === 0)
            ? await resolveRedirectedStreamUrl(rewriteStreamUrlForTesting(activeStreamUrl), loadAbortController.signal)
            : rewriteStreamUrlForTesting(activeStreamUrl);

          console.debug(`${PLAYER_LOG_PREFIX} resolved stream url`, { from: activeStreamUrl, to: resolvedStreamUrl, ts: Date.now() });
        }

        if (cancelled || loadGeneration !== loadGenerationRef.current || loadAbortController.signal.aborted) {
          return;
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

          const hlsPlayer = new hlsRuntime({
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
              restoreMediaSourceDebugging();
              // Keep the ERROR listener active so we receive logs and run recovery/escalation during playback.
            };
            const escalateToShaka = (reason: string) => {
              if (liveHlsJsFallbackToShakaUsedRef.current) {
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
              hlsPlayer.startLoad();
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

              // hls.js manifest parsed log removed
              applyVideoAudioState(attachedVideo, 'hlsjs-manifest-parsed');
              // Don't finish() here — wait for FRAG_BUFFERED so the startup
              // promise resolves only after play() has been called with real
              // data in the buffer. Finishing here would call setIsReady(true)
              // before play(), causing the live watchdog to fire immediately.
              //
              // Reset the startup timer from this point so hls.js gets a fresh
              // full window to buffer the first frag and call play(). Without
              // this the original 15s can expire before FRAG_BUFFERED if the
              // pLoader or manifest fetch took several seconds already.
              window.clearTimeout(timeoutId);
              timeoutId = window.setTimeout(() => {
                fail(`hls.js startup timed out after ${hlsStartupTimeoutMs}ms`);
              }, hlsStartupTimeoutMs);
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
            try {
              const tracks = player.getVariantTracks();
              console.warn(`${PLAYER_LOG_PREFIX} shaka tracks changed`, {
                count: tracks.length,
                variants: tracks.map((t) => ({
                  id: t.id,
                  active: t.active,
                  type: t.type,
                  videoCodec: t.videoCodec,
                  audioCodec: t.audioCodec,
                  codecs: t.codecs,
                  bandwidth: t.bandwidth,
                  width: t.width,
                  height: t.height
                }))
              });
            } catch (err) {
              console.warn(`${PLAYER_LOG_PREFIX} shaka failed to read tracks on trackschanged`, {
                error: err instanceof Error ? err.message : String(err)
              });
            }
          });

          player.addEventListener('adaptation', () => {
            console.warn(`${PLAYER_LOG_PREFIX} shaka adaptation event`);
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
            
            {isLive && currentProgram && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px', maxWidth: '680px' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '15px', fontWeight: 600, lineHeight: 1.35, margin: 0 }}>
                  {currentProgram.description ? truncateLine(currentProgram.description, 120) : 'No description available.'}
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

        {isHudVisible ? (
          <footer style={playerHudDock}>
            <div style={playerProgressWrap}>
              {isLive && currentProgram ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', fontSize: '16px' }}>
                  <span style={{ color: '#ff2438', fontWeight: 800 }}>
                    {currentProgram.title}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                    {formatEpgTime(currentProgram.startTime)} - {formatEpgTime(currentProgram.endTime)}
                  </span>
                </div>
              ) : null}

              <div style={playerProgress} aria-hidden="true">
                {isLive && currentProgram ? (
                  <div style={{ ...playerProgressPlayed, width: `${currentProgramProgress * 100}%`, background: '#ff2438' }} />
                ) : isLive ? (
                  <div style={{ ...playerProgressPlayed, width: '100%', background: '#ff2438' }} />
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
                      <span style={{ color: '#ff2438', fontWeight: 800 }}>LIVE</span>
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
