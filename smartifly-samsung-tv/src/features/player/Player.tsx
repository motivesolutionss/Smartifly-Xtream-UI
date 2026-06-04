import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { PlayerController } from "../../playback/playerController";
import { avplayAdapter } from "../../playback/avplayAdapter";
import { browserPlaybackAdapter } from "../../playback/browserPlaybackAdapter";
import type { PlayerStateSnapshot } from "../../playback/playerState";
import { services } from "../../services";
import { useSettingsStore } from "../../store/settingsStore";
import { perfMetrics } from "../../utils/perfMetrics";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import { useEpg } from "../live-tv/hooks/useEpg";
import { Loader } from "../../components/ui/Loader";
import { PlayerControls } from "./components/PlayerControls";
import { LivePlayerOverlay } from "./components/LivePlayerOverlay";
import { PlayerSettingsOverlay } from "./components/PlayerSettingsOverlay";
import { SkipIntroOverlay } from "./components/SkipIntroOverlay";
import { UpNextOverlay } from "./components/UpNextOverlay";
import { TrackSelectionManager } from "../../playback/trackSelectionManager";
import { Focusable } from "../../components/tv/Focusable";
import { useFocus } from "../../providers/useFocus";
import type { AppChannel } from "../../types/appModels";
import { getResumePositionSeconds } from "../../utils/resumePosition";
import {
  isDebugLoggingEnabled,
  logger,
  subscribeToDebugLoggingChanges,
} from "../../utils/logger";
import { Rewind, FastForward } from "lucide-react";
import styles from "./Player.module.css";

interface PlayerProps {
  onBack: () => void;
}

type TizenHwKeyEvent = Event & {
  keyName?: string;
};

const BACK_KEYS = new Set(["Backspace", "Escape", "BrowserBack", "GoBack"]);
const BROWSER_POSITION_POLL_INTERVAL_MS = 1000;
const AVPLAY_DURATION_POLL_INTERVAL_MS = 4000;
const AVPLAY_VISIBLE_PROGRESS_COMMIT_INTERVAL_MS = 250;
const AVPLAY_BACKGROUND_PROGRESS_COMMIT_INTERVAL_MS = 5000;
const PROGRESS_PERSIST_INTERVAL_MS = 30000;
const PROGRESS_PERSIST_MIN_STEP_SECONDS = 20;
const MIN_RESUME_PERSIST_SECONDS = 10;
const AVPLAY_HEARTBEAT_INTERVAL_MS = 2500;
const PLAYER_JANK_SAMPLE_INTERVAL_MS = 5000;
const PLAYER_JANK_SLOW_FRAME_MS = 34;
const PLAYER_JANK_SEVERE_FRAME_MS = 67;
const PLAYER_LONG_TASK_LOG_THRESHOLD_MS = 100;
const PLAYER_LONG_TASK_LOG_COOLDOWN_MS = 3000;
const VOD_SERIES_EXTENSION_FALLBACKS = ["mp4", "mkv", "m3u8", "ts"] as const;

const formatSeconds = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "00:00";
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const formatClockTime = (timestampMs: number) =>
  new Date(timestampMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });



const getBrowserMediaErrorMessage = (video: HTMLVideoElement) => {
  const code = video.error?.code;
  if (code === MediaError.MEDIA_ERR_NETWORK) {
    return "Unable to reach the stream server. Please try another stream.";
  }
  if (code === MediaError.MEDIA_ERR_DECODE) {
    return "This stream could not be decoded on this device.";
  }
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return "This stream format is not supported on this device.";
  }
  return "This stream is currently unavailable. Please try again.";
};

const normalizeExtension = (value?: string) =>
  value?.replace(/^\./, "").trim().toLowerCase() || "";

const buildExtensionCandidates = (extensions: Array<string | undefined>) => {
  const unique = new Set<string>();
  for (const value of extensions) {
    const normalized = normalizeExtension(value);
    if (!normalized) continue;
    unique.add(normalized);
  }
  return Array.from(unique);
};

type PlayerJankSample = {
  windowMs: number;
  totalFrames: number;
  slowFrames: number;
  severeFrames: number;
  worstFrameMs: number;
  avgFrameMs: number | null;
  approxFps: number | null;
};

export const Player: React.FC<PlayerProps> = ({ onBack }) => {
  const { activePlaybackItem, liveChannels, setActivePlaybackItem } = usePlayerStore();
  const {
    liveExtension,
    enableParentalLock,
    parentalPin,
    isParentalUnlocked,
    unlockParentalSession,
  } = useSettingsStore();
  const { focusedId, setFocus, setFocusScope } = useFocus();
  const focusedIdRef = useRef<string | null>(null);
  useEffect(() => {
    focusedIdRef.current = focusedId;
  }, [focusedId]);
  const [skipIndicator, setSkipIndicator] = useState<{ direction: "left" | "right"; amount: number } | null>(null);
  const skipIndicatorTimerRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState<PlayerStateSnapshot>({ state: "IDLE" });
  const [error, setError] = useState<string | null>(null);
  const [parentalError, setParentalError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isEpgPeekActive, setIsEpgPeekActive] = useState(false);
  const [lastActivity, setLastActivity] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [skipIntroDismissed, setSkipIntroDismissed] = useState(false);
  const [upNextDismissed, setUpNextDismissed] = useState(false);
  const [zappingChannel, setZappingChannel] = useState<AppChannel | null>(null);
  const [liveClockMs, setLiveClockMs] = useState(() => Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const avPlayerSurfaceRef = useRef<HTMLDivElement>(null);
  const lastSavedSecondRef = useRef<number>(0);
  const durationSecondsRef = useRef<number>(0);
  const browserResumeAppliedKeyRef = useRef<string | null>(null);
  const avplayCurrentTimeRef = useRef(0);
  const lastAvplayProgressCommitAtRef = useRef(0);
  const lastAvplayProgressCommitSecondsRef = useRef(0);
  const didAutoPlayNextRef = useRef(false);
  const zappingOverlayTimerRef = useRef<number | null>(null);
  const browserBufferingTimerRef = useRef<number | null>(null);
  const lastZapAtRef = useRef<number>(0);
  const settingsVisibleRef = useRef(false);
  const controlsVisibleRef = useRef(true);
  const didHandleExitRef = useRef(false);
  const stallRetryAttemptsRef = useRef<Record<string, number>>({});
  const lastProgressSecondRef = useRef(0);
  const stallSinceMsRef = useRef<number | null>(null);
  const isAutoRecoveringRef = useRef(false);
  const isBrowserPlaybackAttemptingRef = useRef(false);
  const loadAttemptIdRef = useRef(0);
  const latestJankSampleRef = useRef<PlayerJankSample | null>(null);
  const lastLongTaskLogAtRef = useRef(0);
  const isBrowserMode = useMemo(() => !avplayAdapter.isAvailable(), []);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(() =>
    isDebugLoggingEnabled()
  );
  const controller = useMemo(() => PlayerController.getInstance(), []);
  const trackSelectionManager = useMemo(() => new TrackSelectionManager(), []);
  const playerEngineLabel = isBrowserMode ? "browser" : "avplay";

  const measurePlayerWork = useCallback(
    <T,>(metric: string, data: Record<string, unknown>, fn: () => T): T => {
      if (!perfMetrics.enabled) {
        return fn();
      }

      const startedAt = performance.now();
      try {
        return fn();
      } finally {
        perfMetrics.recordDuration(metric, performance.now() - startedAt, {
          slowAboveMs: 34,
          data: {
            streamId: activePlaybackItem?.id,
            contentType: activePlaybackItem?.contentType,
            engine: playerEngineLabel,
            ...data,
          },
        });
      }
    },
    [activePlaybackItem?.contentType, activePlaybackItem?.id, playerEngineLabel]
  );

  const isProtectedContent = Boolean(
    activePlaybackItem && activePlaybackItem.contentType !== "live"
  );
  const requiresParentalUnlock = Boolean(
    isProtectedContent && enableParentalLock && !isParentalUnlocked
  );
  const isLive = activePlaybackItem?.contentType === "live";
  const playerState = snapshot.state;
  const isPlaying = playerState === "PLAYING";

  const shouldLoadLiveEpg = Boolean(
    isLive && (controlsVisible || isEpgPeekActive || zappingChannel)
  );
  const { currentProgram, nextPrograms } = useEpg(
    activePlaybackItem?.id || "",
    {
      enabled: shouldLoadLiveEpg,
      refetchInterval: false,
      refreshClock: shouldLoadLiveEpg,
    }
  );

  const nextEpisode = activePlaybackItem?.nextItem ?? null;
  const remainingSeconds = durationSeconds - currentSeconds;
  const upNextCountdown = Math.max(1, Math.ceil(remainingSeconds));
  const shouldShowSkipIntro = Boolean(
    activePlaybackItem?.contentType === "series" &&
      !skipIntroDismissed &&
      currentSeconds >= 15 &&
      currentSeconds <= 95
  );
  const shouldShowUpNext = Boolean(
    nextEpisode &&
      !upNextDismissed &&
      durationSeconds > 0 &&
      remainingSeconds <= 22 &&
      remainingSeconds > 0
  );

  const playbackKey = activePlaybackItem
    ? `${activePlaybackItem.contentType}:${activePlaybackItem.seriesId || "single"}:${activePlaybackItem.id}`
    : "none";
  const liveClockLabel = useMemo(() => formatClockTime(liveClockMs), [liveClockMs]);
  const liveChannelIndex = useMemo(() => {
    if (!isLive || !activePlaybackItem) return -1;
    return liveChannels.findIndex((channel) => channel.id === activePlaybackItem.id);
  }, [activePlaybackItem, isLive, liveChannels]);
  const liveChannelLabel = useMemo(() => {
    if (!isLive || liveChannelIndex < 0) return undefined;
    return `CH ${String(liveChannelIndex + 1).padStart(3, "0")} / ${String(liveChannels.length).padStart(3, "0")}`;
  }, [isLive, liveChannelIndex, liveChannels.length]);
  const nextProgram = nextPrograms[0];

  useEffect(() => {
    setDiagnosticsEnabled(isDebugLoggingEnabled());
    return subscribeToDebugLoggingChanges(() => {
      setDiagnosticsEnabled(isDebugLoggingEnabled());
    });
  }, []);

  const getSafeResumeTarget = useCallback(
    (knownDurationSeconds?: number) =>
      getResumePositionSeconds(
        activePlaybackItem?.resumePositionSeconds,
        knownDurationSeconds || activePlaybackItem?.resumeDurationSeconds
      ),
    [activePlaybackItem?.resumeDurationSeconds, activePlaybackItem?.resumePositionSeconds]
  );

  const persistPlaybackPosition = useCallback(
    (seconds: number, options?: { force?: boolean }) => {
      if (!activePlaybackItem || activePlaybackItem.contentType === "live") return;
      if (!Number.isFinite(seconds) || seconds < MIN_RESUME_PERSIST_SECONDS) return;

      const rounded = Math.floor(seconds);
      const force = options?.force ?? false;
      if (force) {
        if (rounded <= lastSavedSecondRef.current) return;
      } else if (rounded <= lastSavedSecondRef.current + PROGRESS_PERSIST_MIN_STEP_SECONDS) {
        return;
      }

      lastSavedSecondRef.current = rounded;

      void services.userData.saveRecentlyWatched({
        id: activePlaybackItem.seriesId || activePlaybackItem.id, // Save under seriesId if series
        type: activePlaybackItem.contentType,
        title: activePlaybackItem.title,
        imageUrl: activePlaybackItem.logoUrl,
        backdropUrl: activePlaybackItem.backdropUrl,
        watchedAt: new Date().toISOString(),
        positionSeconds: rounded,
        durationSeconds: durationSecondsRef.current > 0 ? Math.floor(durationSecondsRef.current) : undefined,
        seriesId: activePlaybackItem.seriesId,
        metadata: {
          ...activePlaybackItem.metadata,
          episodeId: activePlaybackItem.seriesId ? activePlaybackItem.id : undefined,
        },
      });
    },
    [activePlaybackItem]
  );

  const readCurrentSeconds = useCallback(() => {
    if (isBrowserMode) {
      return videoRef.current?.currentTime || 0;
    }
    try {
      return Math.max(avplayCurrentTimeRef.current, avplayAdapter.getCurrentTime() / 1000);
    } catch {
      return avplayCurrentTimeRef.current;
    }
  }, [isBrowserMode]);

  const readDurationSeconds = useCallback(() => {
    if (isBrowserMode) {
      return videoRef.current?.duration || 0;
    }
    try {
      return avplayAdapter.getDuration() / 1000;
    } catch {
      return 0;
    }
  }, [isBrowserMode]);

  const commitAvplayCurrentSeconds = useCallback(
    (seconds: number, options?: { force?: boolean }) => {
      if (isLive) return;

      const force = options?.force ?? false;
      const now = performance.now();
      const commitIntervalMs =
        controlsVisibleRef.current || settingsVisibleRef.current
          ? AVPLAY_VISIBLE_PROGRESS_COMMIT_INTERVAL_MS
          : AVPLAY_BACKGROUND_PROGRESS_COMMIT_INTERVAL_MS;
      const sinceLastCommitMs = now - lastAvplayProgressCommitAtRef.current;
      const deltaSeconds = Math.abs(seconds - lastAvplayProgressCommitSecondsRef.current);

      if (
        !force &&
        sinceLastCommitMs < commitIntervalMs &&
        deltaSeconds < 1
      ) {
        return;
      }

      lastAvplayProgressCommitAtRef.current = now;
      lastAvplayProgressCommitSecondsRef.current = seconds;
      setCurrentSeconds(seconds);
    },
    [isLive]
  );

  const seekBySeconds = useCallback(
    (deltaSeconds: number) => {
      if (!activePlaybackItem || activePlaybackItem.contentType === "live") return;
      const base = readCurrentSeconds();
      const target = Math.max(0, base + deltaSeconds);

      if (isBrowserMode) {
        if (!videoRef.current) return;
        videoRef.current.currentTime = target;
      } else {
        try {
          avplayAdapter.seekTo(target * 1000);
        } catch {
          // Ignore unsupported firmwares.
        }
      }

      setCurrentSeconds(target);
      persistPlaybackPosition(target);

      // Trigger Netflix-style skip indicator overlay if the control overlay is hidden
      if (!controlsVisibleRef.current) {
        setSkipIndicator((prev) => {
          const dir = deltaSeconds > 0 ? "right" : "left";
          if (prev && prev.direction === dir) {
            return {
              direction: dir,
              amount: prev.amount + Math.abs(deltaSeconds),
            };
          }
          return {
            direction: dir,
            amount: Math.abs(deltaSeconds),
          };
        });

        if (skipIndicatorTimerRef.current !== null) {
          window.clearTimeout(skipIndicatorTimerRef.current);
        }
        skipIndicatorTimerRef.current = window.setTimeout(() => {
          setSkipIndicator(null);
        }, 1000);
      }
    },
    [activePlaybackItem, isBrowserMode, persistPlaybackPosition, readCurrentSeconds]
  );

  const togglePlayPause = useCallback(() => {
    if (isBrowserMode) {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        void video.play();
        setSnapshot({ state: "PLAYING" });
      } else {
        video.pause();
        setSnapshot({ state: "PAUSED" });
      }
    } else {
      const state = controller.getState();
      if (state === "PLAYING") {
        controller.pause();
      } else if (state === "PAUSED") {
        controller.resume();
      }
    }
  }, [isBrowserMode, controller]);

  const switchChannel = useCallback(
    (direction: 1 | -1) => {
      if (!activePlaybackItem || activePlaybackItem.contentType !== "live") return;
      if (liveChannels.length === 0) return;

      const now = Date.now();
      if (now - lastZapAtRef.current < 280) return;
      lastZapAtRef.current = now;

      const currentIndex = liveChannels.findIndex(
        (channel) => channel.id === activePlaybackItem.id
      );
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (safeIndex + direction + liveChannels.length) % liveChannels.length;
      const nextChannel = liveChannels[nextIndex];
      logger.debug("Live channel zapping", {
        direction,
        from: activePlaybackItem.id,
        to: nextChannel.id,
      });

      setZappingChannel(nextChannel);
      setError(null);
      if (zappingOverlayTimerRef.current !== null) {
        window.clearTimeout(zappingOverlayTimerRef.current);
      }
      zappingOverlayTimerRef.current = window.setTimeout(() => {
        setZappingChannel(null);
      }, 1500);

      void services.userData.saveRecentlyWatched({
        id: nextChannel.id,
        type: "live",
        title: nextChannel.title,
        imageUrl: nextChannel.logoUrl,
        watchedAt: new Date().toISOString(),
      });

      setActivePlaybackItem(nextChannel);
    },
    [activePlaybackItem, liveChannels, setActivePlaybackItem]
  );

  const saveSnapshotBeforeExit = useCallback(() => {
    persistPlaybackPosition(readCurrentSeconds(), { force: true });
  }, [persistPlaybackPosition, readCurrentSeconds]);

  const exitPlayer = useCallback(() => {
    if (didHandleExitRef.current) return;
    didHandleExitRef.current = true;
    saveSnapshotBeforeExit();
    controller.release();
    onBack();
  }, [controller, onBack, saveSnapshotBeforeExit]);

  const playNextEpisodeNow = useCallback(() => {
    if (!nextEpisode) return;
    const next = nextEpisode;
    setUpNextDismissed(true);
    didAutoPlayNextRef.current = true;
    setActivePlaybackItem({
      id: next.id,
      seriesId: next.seriesId || activePlaybackItem?.seriesId,
      title: next.title,
      logoUrl: next.logoUrl,
      contentType: "series",
      extension: next.extension,
      metadata: {
        seasonNumber: next.seasonNumber,
        episodeNumber: next.episodeNumber,
      },
      nextItem: next.nextItem,
    });
  }, [activePlaybackItem?.seriesId, nextEpisode, setActivePlaybackItem]);

  // EPG Peek timer on channel switch / zapping
  useEffect(() => {
    if (!activePlaybackItem) return;
    const showTimer = window.setTimeout(() => {
      setIsEpgPeekActive(true);
    }, 0);
    const hideTimer = window.setTimeout(() => {
      setIsEpgPeekActive(false);
    }, 2500);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [activePlaybackItem?.id, activePlaybackItem?.contentType]);

  const getPlaybackExtensionCandidates = useCallback(
    (contentType: "live" | "vod" | "series", extension?: string): string[] => {
      if (contentType === "live") {
        const preferred = normalizeExtension(
          extension || liveExtension || (isBrowserMode ? "m3u8" : "ts")
        );
        if (isBrowserMode) {
          if (preferred === "ts") {
            return buildExtensionCandidates(["m3u8", "ts"]);
          }
          if (preferred === "m3u8") {
            return buildExtensionCandidates(["m3u8", "ts"]);
          }
          return buildExtensionCandidates([preferred, "m3u8", "ts"]);
        }
        if (preferred === "m3u8") {
          return buildExtensionCandidates(["m3u8", "ts"]);
        }
        if (preferred === "ts") {
          return buildExtensionCandidates(["ts", "m3u8"]);
        }
        return buildExtensionCandidates([preferred, "ts", "m3u8"]);
      }

      return buildExtensionCandidates([extension, ...VOD_SERIES_EXTENSION_FALLBACKS]);
    },
    [isBrowserMode, liveExtension]
  );

  const getAvPlayDisplayRect = useCallback(() => {
    const surface = avPlayerSurfaceRef.current;
    if (!surface) return undefined;

    const rect = surface.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) {
      return undefined;
    }

    return {
      x: Math.max(0, Math.round(rect.left)),
      y: Math.max(0, Math.round(rect.top)),
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    };
  }, []);

  const playBrowserStream = useCallback(
    async (url: string, contentType: "live" | "vod" | "series") => {
    const video = videoRef.current;
    if (!video) {
      throw new Error("Browser video surface is not ready");
    }

    isBrowserPlaybackAttemptingRef.current = true;
    try {
      await browserPlaybackAdapter.play(url, video, { contentType });
    } finally {
      isBrowserPlaybackAttemptingRef.current = false;
    }
    },
    []
  );

  const clearBrowserBufferingTimer = useCallback(() => {
    if (browserBufferingTimerRef.current !== null) {
      window.clearTimeout(browserBufferingTimerRef.current);
      browserBufferingTimerRef.current = null;
    }
  }, []);

  const retryPlayback = useCallback(() => {
    if (!activePlaybackItem) return;
    didHandleExitRef.current = false;
    setError(null);
    clearBrowserBufferingTimer();
    if (isBrowserMode) {
      browserPlaybackAdapter.reset(videoRef.current);
    } else {
      controller.release({ silent: true });
    }
    setSnapshot({ state: "LOADING" });
    setRetryNonce((current) => current + 1);
  }, [activePlaybackItem, clearBrowserBufferingTimer, controller, isBrowserMode]);

  const markBrowserPlaying = useCallback(() => {
    clearBrowserBufferingTimer();
    setSnapshot((prev) => (prev.state !== "PLAYING" ? { state: "PLAYING" } : prev));
  }, [clearBrowserBufferingTimer]);

  const scheduleBrowserBufferingState = useCallback(() => {
    clearBrowserBufferingTimer();
    browserBufferingTimerRef.current = window.setTimeout(() => {
      setSnapshot((prev) => {
        if (prev.state === "PLAYING" || prev.state === "READY" || prev.state === "LOADING") {
          return { state: "BUFFERING" };
        }
        return prev;
      });
    }, isLive ? 1250 : 350);
  }, [clearBrowserBufferingTimer, isLive]);

  // Trap focus inside the player while it's mounted
  useEffect(() => {
    setFocusScope(["player-"], "player-playpause");
    return () => setFocusScope(null);
  }, [setFocusScope]);

  // Focus retry button when error state appears
  useEffect(() => {
    if (playerState === "ERROR" || error) {
      const frame = window.requestAnimationFrame(() => setFocus("player-retry"));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [playerState, error, setFocus]);

  useEffect(() => {
    settingsVisibleRef.current = settingsVisible;
  }, [settingsVisible]);

  useEffect(() => {
    controlsVisibleRef.current = controlsVisible;
  }, [controlsVisible]);

  useEffect(() => {
    const classNames = ["smartifly-player-active"];
    if (!isBrowserMode) {
      classNames.push("smartifly-avplay-active");
    }
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    classNames.forEach((className) => {
      html.classList.add(className);
      body.classList.add(className);
      root?.classList.add(className);
    });

    return () => {
      classNames.forEach((className) => {
        html.classList.remove(className);
        body.classList.remove(className);
        root?.classList.remove(className);
      });
    };
  }, [isBrowserMode]);

  useEffect(() => {
    if (!activePlaybackItem) return;
    logger.info("Player status snapshot", {
      streamId: activePlaybackItem.id,
      contentType: activePlaybackItem.contentType,
      engine: playerEngineLabel,
      playerState,
      controlsVisible,
      settingsVisible,
      error,
    });
  }, [
    activePlaybackItem,
    controlsVisible,
    error,
    playerEngineLabel,
    playerState,
    settingsVisible,
  ]);

  useEffect(() => {
    if (!activePlaybackItem) return;
    if (!diagnosticsEnabled) return;
    if (typeof PerformanceObserver === "undefined") return;

    let observer: PerformanceObserver | null = null;

    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration < PLAYER_LONG_TASK_LOG_THRESHOLD_MS) continue;

          const now = performance.now();
          if (now - lastLongTaskLogAtRef.current < PLAYER_LONG_TASK_LOG_COOLDOWN_MS) {
            continue;
          }
          lastLongTaskLogAtRef.current = now;

          const attribution = (
            (entry as PerformanceEntry & {
              attribution?: Array<{
                name?: string;
                entryType?: string;
                scriptUrl?: string;
                functionName?: string;
                containerType?: string;
                containerName?: string;
              }>;
            }).attribution ?? []
          ).map((item) => ({
            name: item.name,
            entryType: item.entryType,
            scriptUrl: item.scriptUrl,
            functionName: item.functionName,
            containerType: item.containerType,
            containerName: item.containerName,
          }));

          logger.warn("Player long task observed", {
            streamId: activePlaybackItem.id,
            contentType: activePlaybackItem.contentType,
            engine: playerEngineLabel,
            state: playerState,
            durationMs: Math.round(entry.duration),
            controlsVisible: controlsVisibleRef.current,
            settingsVisible: settingsVisibleRef.current,
            jankSample: latestJankSampleRef.current,
            attribution: attribution.length > 0 ? attribution : undefined,
          });
        }
      });

      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      return;
    }

    return () => {
      observer?.disconnect();
    };
  }, [activePlaybackItem, diagnosticsEnabled, playerEngineLabel, playerState]);

  useEffect(() => {
    if (!activePlaybackItem) return;
    if (!diagnosticsEnabled) return;

    let rafId = 0;
    let reportTimer: number | null = null;
    let lastFrameAt = performance.now();
    let sampleStartedAt = lastFrameAt;
    let totalFrames = 0;
    let slowFrames = 0;
    let severeFrames = 0;
    let worstFrameMs = 0;
    let totalFrameMs = 0;

    const flushSample = () => {
      const now = performance.now();
      const windowMs = Math.max(1, now - sampleStartedAt);
      const avgFrameMs = totalFrames > 0 ? totalFrameMs / totalFrames : null;
      const approxFps = avgFrameMs && avgFrameMs > 0 ? 1000 / avgFrameMs : null;
      const sample: PlayerJankSample = {
        windowMs: Math.round(windowMs),
        totalFrames,
        slowFrames,
        severeFrames,
        worstFrameMs: Number(worstFrameMs.toFixed(1)),
        avgFrameMs: avgFrameMs ? Number(avgFrameMs.toFixed(2)) : null,
        approxFps: approxFps ? Number(approxFps.toFixed(1)) : null,
      };
      latestJankSampleRef.current = sample;
      logger.debug("Player render performance sample", {
        streamId: activePlaybackItem.id,
        contentType: activePlaybackItem.contentType,
        engine: playerEngineLabel,
        ...sample,
        controlsVisible: controlsVisibleRef.current,
        settingsVisible: settingsVisibleRef.current,
        focusedId: focusedIdRef.current,
      });
      if (sample.severeFrames > 0 || (sample.approxFps !== null && sample.approxFps < 24)) {
        logger.warn("Player render jank detected", {
          streamId: activePlaybackItem.id,
          contentType: activePlaybackItem.contentType,
          engine: playerEngineLabel,
          ...sample,
        });
      }
      sampleStartedAt = now;
      totalFrames = 0;
      slowFrames = 0;
      severeFrames = 0;
      worstFrameMs = 0;
      totalFrameMs = 0;
    };

    const loop = (timestamp: number) => {
      const frameMs = timestamp - lastFrameAt;
      lastFrameAt = timestamp;
      if (frameMs > 0) {
        totalFrames += 1;
        totalFrameMs += frameMs;
        worstFrameMs = Math.max(worstFrameMs, frameMs);
        if (frameMs >= PLAYER_JANK_SLOW_FRAME_MS) {
          slowFrames += 1;
        }
        if (frameMs >= PLAYER_JANK_SEVERE_FRAME_MS) {
          severeFrames += 1;
        }
      }
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    reportTimer = window.setInterval(flushSample, PLAYER_JANK_SAMPLE_INTERVAL_MS);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (reportTimer !== null) {
        window.clearInterval(reportTimer);
      }
      latestJankSampleRef.current = null;
    };
  }, [activePlaybackItem, diagnosticsEnabled, playerEngineLabel]);

  useEffect(() => {
    if (!isLive) return;
    const intervalId = window.setInterval(() => {
      setLiveClockMs(Date.now());
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [isLive, activePlaybackItem?.id]);

  useEffect(() => {
    if (!activePlaybackItem) return;
    if (isBrowserMode) return;
    if (!diagnosticsEnabled) return;

    let lastSample:
      | {
          at: number;
          currentSeconds: number;
        }
      | null = null;

    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const current = readCurrentSeconds();
      const duration = readDurationSeconds();
      const deltaWallSeconds = lastSample ? (now - lastSample.at) / 1000 : null;
      const deltaMediaSeconds = lastSample ? current - lastSample.currentSeconds : null;
      const mediaClockRate =
        deltaWallSeconds && deltaWallSeconds > 0 && deltaMediaSeconds !== null
          ? Number((deltaMediaSeconds / deltaWallSeconds).toFixed(2))
          : null;

      const diagnostics = {
        streamId: activePlaybackItem.id,
        contentType: activePlaybackItem.contentType,
        state: playerState,
        currentSeconds: Number(current.toFixed(2)),
        durationSeconds: Number(duration.toFixed(2)),
        deltaWallSeconds: deltaWallSeconds ? Number(deltaWallSeconds.toFixed(2)) : null,
        deltaMediaSeconds:
          deltaMediaSeconds !== null ? Number(deltaMediaSeconds.toFixed(2)) : null,
        mediaClockRate,
        controlsVisible: controlsVisibleRef.current,
        settingsVisible: settingsVisibleRef.current,
        focusedId: focusedIdRef.current,
        jankSample: latestJankSampleRef.current,
      };

      logger.debug("AVPlay playback heartbeat", diagnostics);

      if (
        playerState === "PLAYING" &&
        mediaClockRate !== null &&
        mediaClockRate < 0.7
      ) {
        logger.warn("AVPlay media clock lag detected", diagnostics);
      }

      lastSample = {
        at: now,
        currentSeconds: current,
      };
    }, AVPLAY_HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    activePlaybackItem,
    diagnosticsEnabled,
    isBrowserMode,
    playerState,
    readCurrentSeconds,
    readDurationSeconds,
  ]);

  useEffect(() => {
    if (isBrowserMode) {
      avplayCurrentTimeRef.current = 0;
      return;
    }

    const unsubscribeCurrentTime = controller.subscribeCurrentTime((seconds) => {
      avplayCurrentTimeRef.current = seconds;
      commitAvplayCurrentSeconds(seconds);
    });

    return () => {
      unsubscribeCurrentTime();
      avplayCurrentTimeRef.current = 0;
    };
  }, [commitAvplayCurrentSeconds, controller, isBrowserMode, playbackKey]);

  useEffect(() => {
    if (isBrowserMode || isLive) return;
    if (!controlsVisible && !settingsVisible) return;
    commitAvplayCurrentSeconds(readCurrentSeconds(), { force: true });
  }, [
    commitAvplayCurrentSeconds,
    controlsVisible,
    isBrowserMode,
    isLive,
    playbackKey,
    readCurrentSeconds,
    settingsVisible,
  ]);

  // 1. Stream Loader Effect
  useEffect(() => {
    if (!activePlaybackItem) return;
    if (requiresParentalUnlock) return;

    let isDisposed = false;

    const loadStream = async () => {
      const loadAttemptId = ++loadAttemptIdRef.current;
      const isStaleAttempt = () => isDisposed || loadAttemptId !== loadAttemptIdRef.current;
      try {
        setError(null);
        if (isBrowserMode) {
          setSnapshot({ state: "LOADING" });
        }

        const request = {
          contentType: activePlaybackItem.contentType,
          streamId: activePlaybackItem.id,
          extension: activePlaybackItem.extension,
        };

        const playbackExtensions = getPlaybackExtensionCandidates(
          activePlaybackItem.contentType,
          activePlaybackItem.extension
        );
        const startPositionSeconds = getSafeResumeTarget();
        let lastError: unknown = null;
        let hasStartedPlayback = false;

        logger.info("Playback extension candidates resolved", {
          streamId: activePlaybackItem.id,
          contentType: activePlaybackItem.contentType,
          playerEngine: playerEngineLabel,
          candidates: playbackExtensions,
        });

        for (let attemptIndex = 0; attemptIndex < playbackExtensions.length; attemptIndex += 1) {
          const attemptExtension = playbackExtensions[attemptIndex];
          const attemptStartedAt = performance.now();
          const attemptRequest = {
            ...request,
            extension: attemptExtension,
          };
          let url: string;
          try {
            try {
              url = await services.playback.getPlaybackUrl(attemptRequest);
            } catch {
              if (isStaleAttempt()) return;
              await new Promise((resolve) => window.setTimeout(resolve, 300));
              if (isStaleAttempt()) return;
              url = await services.playback.getPlaybackUrl(attemptRequest);
            }
            if (isStaleAttempt()) return;

            if (isBrowserMode) {
              await playBrowserStream(url, activePlaybackItem.contentType);
            } else {
              try {
                await controller.playStream(url, {
                  startPositionSeconds,
                  contentType: activePlaybackItem.contentType,
                  displayRect: getAvPlayDisplayRect(),
                });
              } catch {
                if (isStaleAttempt()) return;
                await new Promise((resolve) => window.setTimeout(resolve, 450));
                if (isStaleAttempt()) return;
                await controller.playStream(url, {
                  startPositionSeconds,
                  contentType: activePlaybackItem.contentType,
                  displayRect: getAvPlayDisplayRect(),
                });
              }
            }

            if (isStaleAttempt()) return;
            hasStartedPlayback = true;
            logger.info("Playback extension selected for stream", {
              streamId: activePlaybackItem.id,
              contentType: activePlaybackItem.contentType,
              playerEngine: playerEngineLabel,
              extension: attemptExtension,
              attempt: attemptIndex + 1,
              totalAttempts: playbackExtensions.length,
              startupMs: Math.round(performance.now() - attemptStartedAt),
            });
            break;
          } catch (attemptError) {
            lastError = attemptError;
            logger.warn("Playback extension attempt failed", {
              streamId: activePlaybackItem.id,
              contentType: activePlaybackItem.contentType,
              playerEngine: playerEngineLabel,
              extension: attemptExtension,
              attempt: attemptIndex + 1,
              totalAttempts: playbackExtensions.length,
              startupMs: Math.round(performance.now() - attemptStartedAt),
              error: attemptError,
            });
            if (isBrowserMode) {
              clearBrowserBufferingTimer();
              browserPlaybackAdapter.reset(videoRef.current);
            }
          }
        }

        if (!hasStartedPlayback) {
          throw lastError || new Error("Unable to start playback");
        }

      if (isStaleAttempt()) return;
      if (!isBrowserMode && startPositionSeconds) {
          commitAvplayCurrentSeconds(startPositionSeconds, { force: true });
      }
      } catch (err: unknown) {
        if (isStaleAttempt()) return;
        if (isBrowserMode) {
          clearBrowserBufferingTimer();
          browserPlaybackAdapter.reset(videoRef.current);
        }
        setError(err instanceof Error ? err.message : "Unable to start playback");
        if (isBrowserMode) {
          setSnapshot({
            state: "ERROR",
            errorMessage: err instanceof Error ? err.message : "Unable to start playback",
          });
        }
      }
    };

    const unsubscribe = controller.subscribe((snap) => {
      setSnapshot(snap);
      if (snap.state === "ERROR") {
        setError(snap.errorMessage || "Playback failed");
        return;
      }
      setError(null);
    });
    const browserVideoElement = videoRef.current;

    loadStream();

    return () => {
      isDisposed = true;
      loadAttemptIdRef.current += 1;
      unsubscribe();
      clearBrowserBufferingTimer();
      if (isBrowserMode) {
        browserPlaybackAdapter.reset(browserVideoElement);
      } else {
        controller.release();
      }
    };
  }, [
    playbackKey,
    retryNonce,
    requiresParentalUnlock,
    isBrowserMode,
    controller,
    getPlaybackExtensionCandidates,
    getAvPlayDisplayRect,
    getSafeResumeTarget,
    clearBrowserBufferingTimer,
    playerEngineLabel,
  ]);

  useEffect(() => {
    if (!isBrowserMode) return;
    const video = videoRef.current;
    if (!video || !activePlaybackItem) return;

    let lastLoggedSecond = -1;

    const logBrowserEvent = (eventName: string) => {
      logger.debug(`Browser video event: ${eventName}`, {
        streamId: activePlaybackItem.id,
        contentType: activePlaybackItem.contentType,
        readyState: video.readyState,
        networkState: video.networkState,
        currentTime: Number(video.currentTime.toFixed(2)),
        duration: Number.isFinite(video.duration) ? Number(video.duration.toFixed(2)) : null,
      });
    };

    const handleTimeUpdate = () => {
      const second = Math.floor(video.currentTime || 0);
      if (second < 0 || second === lastLoggedSecond || second % 5 !== 0) return;
      lastLoggedSecond = second;
      logger.debug("Browser playback heartbeat", {
        streamId: activePlaybackItem.id,
        contentType: activePlaybackItem.contentType,
        second,
        readyState: video.readyState,
        buffered: video.buffered.length
          ? {
              start: Number(video.buffered.start(0).toFixed(2)),
              end: Number(video.buffered.end(video.buffered.length - 1).toFixed(2)),
            }
          : null,
      });
    };

    const listeners: Array<[keyof HTMLMediaElementEventMap, EventListener]> = [
      ["loadedmetadata", () => logBrowserEvent("loadedmetadata")],
      ["canplay", () => logBrowserEvent("canplay")],
      ["playing", () => logBrowserEvent("playing")],
      ["waiting", () => logBrowserEvent("waiting")],
      ["stalled", () => logBrowserEvent("stalled")],
      ["suspend", () => logBrowserEvent("suspend")],
      ["progress", () => logBrowserEvent("progress")],
      ["timeupdate", handleTimeUpdate as EventListener],
      ["error", () => logBrowserEvent("error")],
    ];

    listeners.forEach(([eventName, listener]) => {
      video.addEventListener(eventName, listener);
    });

    return () => {
      listeners.forEach(([eventName, listener]) => {
        video.removeEventListener(eventName, listener);
      });
    };
  }, [activePlaybackItem, isBrowserMode]);

  // 2. Playback timers, remote controls key handlers, and browser page/visibility event listeners
  useEffect(() => {
    if (!activePlaybackItem) return;
    if (requiresParentalUnlock) return;

    let positionTimer: number | null = null;
    let persistTimer: number | null = null;

    positionTimer = window.setInterval(() => {
      measurePlayerWork(
        "player_position_tick_ms",
        {
          controlsVisible: controlsVisibleRef.current,
          settingsVisible: settingsVisibleRef.current,
          isLive,
          isBrowserMode,
        },
        () => {
          const previousDuration = durationSecondsRef.current;
          const shouldSkipHiddenAvplayVodTick =
            !isLive &&
            !isBrowserMode &&
            !controlsVisibleRef.current &&
            !settingsVisibleRef.current &&
            previousDuration > 0;

          if (shouldSkipHiddenAvplayVodTick) {
            return;
          }

          const nextDuration = readDurationSeconds();
          durationSecondsRef.current = nextDuration;

          if (!isLive) {
            if (
              previousDuration <= 0 ||
              Math.abs(nextDuration - previousDuration) >= 1 ||
              controlsVisibleRef.current ||
              settingsVisibleRef.current ||
              isBrowserMode
            ) {
              setDurationSeconds(nextDuration);
            }
            if (isBrowserMode) {
              setCurrentSeconds(readCurrentSeconds());
            }
          }
        }
      );
    }, isBrowserMode ? BROWSER_POSITION_POLL_INTERVAL_MS : AVPLAY_DURATION_POLL_INTERVAL_MS);

    if (activePlaybackItem.contentType !== "live") {
      persistTimer = window.setInterval(() => {
        persistPlaybackPosition(readCurrentSeconds());
      }, PROGRESS_PERSIST_INTERVAL_MS);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      measurePlayerWork(
        "player_keydown_handler_ms",
        {
          key: e.key,
          controlsVisible: controlsVisibleRef.current,
          settingsVisible: settingsVisibleRef.current,
          isLive,
        },
        () => {
          const isBack = BACK_KEYS.has(e.key) || e.keyCode === 10009;
          if (isBack) {
            e.preventDefault();
            if (settingsVisibleRef.current) {
              setSettingsVisible(false);
              setControlsVisible(true);
              return;
            }
            exitPlayer();
            return;
          }

          setLastActivity(Date.now());

          // 1. If settings overlay is visible, let it handle keys (except back/tizen back which was handled above)
          if (settingsVisibleRef.current) return;

          // 2. Hardware/Dedicated play/pause button (MediaPlayPause or Spacebar)
          if (e.key === "MediaPlayPause" || e.key === " ") {
            e.preventDefault();
            togglePlayPause();
            return;
          }

          // 3. Dedicated hardware keys (should always work, regardless of controls visibility)
          if (e.key === "MediaFastForward" && !isLive) {
            e.preventDefault();
            setControlsVisible(true);
            seekBySeconds(10);
            return;
          }

          if (e.key === "MediaRewind" && !isLive) {
            e.preventDefault();
            setControlsVisible(true);
            seekBySeconds(-10);
            return;
          }

          if (isLive && e.key === "ChannelUp") {
            e.preventDefault();
            switchChannel(1);
            return;
          }

          if (isLive && e.key === "ChannelDown") {
            e.preventDefault();
            switchChannel(-1);
            return;
          }

          // 4. D-pad navigation keys (ArrowLeft, ArrowRight, ArrowUp, ArrowDown)
          if (!controlsVisibleRef.current) {
            if (!isLive && e.key === "ArrowUp") {
              e.preventDefault();
              setIsEpgPeekActive(true);
              window.setTimeout(() => {
                setIsEpgPeekActive(false);
              }, 4000);
              return;
            }

            if (!isLive && e.key === "ArrowRight") {
              e.preventDefault();
              seekBySeconds(10);
              return;
            }

            if (!isLive && e.key === "ArrowLeft") {
              e.preventDefault();
              seekBySeconds(-10);
              return;
            }

            if (isLive && e.key === "ArrowUp") {
              e.preventDefault();
              switchChannel(1);
              return;
            }

            if (isLive && e.key === "ArrowDown") {
              e.preventDefault();
              switchChannel(-1);
              return;
            }

            setControlsVisible(true);
          } else {
            if (isLive && e.key === "ArrowUp") {
              e.preventDefault();
              switchChannel(1);
              setControlsVisible(false);
              return;
            }
            if (isLive && e.key === "ArrowDown") {
              e.preventDefault();
              switchChannel(-1);
              setControlsVisible(false);
              return;
            }
          }
        }
      );
    };

    const handleTizenBack = (event: TizenHwKeyEvent) => {
      if (event.keyName !== "back") return;
      event.preventDefault();
      if (settingsVisibleRef.current) {
        setSettingsVisible(false);
        setControlsVisible(true);
        return;
      }
      exitPlayer();
    };

    const handlePageHide = () => {
      saveSnapshotBeforeExit();
      controller.release({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      saveSnapshotBeforeExit();
      controller.release({ silent: true });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("tizenhwkey", handleTizenBack as EventListener);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("tizenhwkey", handleTizenBack as EventListener);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (positionTimer !== null) window.clearInterval(positionTimer);
      if (persistTimer !== null) window.clearInterval(persistTimer);
      if (skipIndicatorTimerRef.current !== null) {
        window.clearTimeout(skipIndicatorTimerRef.current);
      }
    };
  }, [
    playbackKey,
    requiresParentalUnlock,
    isBrowserMode,
    isLive,
    exitPlayer,
    persistPlaybackPosition,
    readCurrentSeconds,
    readDurationSeconds,
    saveSnapshotBeforeExit,
    seekBySeconds,
    switchChannel,
    togglePlayPause,
    controller,
  ]);

  useEffect(() => {
    didHandleExitRef.current = false;
    didAutoPlayNextRef.current = false;
    isAutoRecoveringRef.current = false;
    lastProgressSecondRef.current = 0;
    stallSinceMsRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      setControlsVisible(activePlaybackItem?.contentType !== "live");
      setSettingsVisible(false);
      setCurrentSeconds(0);
      setDurationSeconds(0);
      setSkipIntroDismissed(false);
      setUpNextDismissed(false);
      lastSavedSecondRef.current = 0;
      lastAvplayProgressCommitAtRef.current = 0;
      lastAvplayProgressCommitSecondsRef.current = 0;
      browserResumeAppliedKeyRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    activePlaybackItem?.id,
    activePlaybackItem?.contentType,
    activePlaybackItem?.resumePositionSeconds,
  ]);

  useEffect(() => {
    if (!activePlaybackItem) return;
    if (requiresParentalUnlock) return;
    if (isBrowserMode) return;
    if (settingsVisible) return;
    if (!["PLAYING", "BUFFERING"].includes(playerState)) return;

    const now = Date.now();
    const seconds = isBrowserMode ? currentSeconds : readCurrentSeconds();
    const lastSeconds = lastProgressSecondRef.current;

    if (seconds <= 0 && lastSeconds <= 0) {
      return;
    }

    const progressed = seconds > lastSeconds + 0.35;

    if (progressed) {
      lastProgressSecondRef.current = seconds;
      stallSinceMsRef.current = null;
      isAutoRecoveringRef.current = false;
      return;
    }

    const effectiveDurationSeconds = Math.max(durationSecondsRef.current, durationSeconds);
    const nearEnd =
      effectiveDurationSeconds > 0 &&
      effectiveDurationSeconds - Math.max(0, seconds) <= 3;
    if (nearEnd) return;

    if (!stallSinceMsRef.current) {
      stallSinceMsRef.current = now;
      return;
    }

    const stalledForMs = now - stallSinceMsRef.current;
    if (stalledForMs < 8000 || isAutoRecoveringRef.current) return;

    const key = playbackKey;
    const attempts = stallRetryAttemptsRef.current[key] || 0;
    if (attempts >= 2) return;

    stallRetryAttemptsRef.current[key] = attempts + 1;
    isAutoRecoveringRef.current = true;
    logger.warn("Playback stall detected, attempting auto-recovery", {
      key,
      stalledForMs,
      state: playerState,
      seconds,
    });
    retryPlayback();
  }, [
    activePlaybackItem,
    currentSeconds,
    durationSeconds,
    readCurrentSeconds,
    playbackKey,
    playerState,
    requiresParentalUnlock,
    retryPlayback,
    settingsVisible,
    isBrowserMode,
    isLive,
  ]);

  useEffect(() => {
    return () => {
      clearBrowserBufferingTimer();
      if (zappingOverlayTimerRef.current !== null) {
        window.clearTimeout(zappingOverlayTimerRef.current);
      }
    };
  }, [clearBrowserBufferingTimer]);

  useEffect(() => {
    if (!controlsVisible || settingsVisible || playerState !== "PLAYING") return;

    const timer = window.setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [controlsVisible, playerState, settingsVisible, lastActivity]);

  useEffect(() => {
    if (!shouldShowUpNext || settingsVisible || !isPlaying) return;
    if (remainingSeconds <= 0 && !didAutoPlayNextRef.current) {
      playNextEpisodeNow();
      didAutoPlayNextRef.current = true;
    }
  }, [isPlaying, playNextEpisodeNow, remainingSeconds, settingsVisible, shouldShowUpNext]);

  useEffect(() => {
    if (playerState !== "ENDED" || !nextEpisode || didAutoPlayNextRef.current) return;
    playNextEpisodeNow();
    didAutoPlayNextRef.current = true;
  }, [nextEpisode, playNextEpisodeNow, playerState]);

  const handleParentalSubmit = (value: string) => {
    if (value !== parentalPin) {
      setParentalError("Incorrect PIN. Please try again.");
      return;
    }

    setParentalError(null);
    unlockParentalSession();
  };

  const handleBrowserLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = event.currentTarget;
    const startPositionSeconds = getSafeResumeTarget(videoElement.duration || undefined);
    if (!startPositionSeconds || browserResumeAppliedKeyRef.current === playbackKey) return;

    try {
      videoElement.currentTime = startPositionSeconds;
      browserResumeAppliedKeyRef.current = playbackKey;
      setCurrentSeconds(startPositionSeconds);
      setSnapshot({ state: "PLAYING" });
    } catch {
      // Some browser codecs reject seeking before enough data is buffered.
    }
  };

  if (!activePlaybackItem) return null;



  const progress =
    durationSeconds > 0 ? Math.min(100, Math.max(0, (currentSeconds / durationSeconds) * 100)) : 0;

  return (
    <div className={`${styles.container} ${!isBrowserMode ? styles.avplayContainer : ""}`.trim()}>
      {isBrowserMode ? (
        <video
          ref={videoRef}
          className={styles.videoSurface}
          autoPlay
          controls={false}
          playsInline
          onLoadedMetadata={handleBrowserLoadedMetadata}
          onPlay={markBrowserPlaying}
          onPlaying={markBrowserPlaying}
          onCanPlay={markBrowserPlaying}
          onWaiting={scheduleBrowserBufferingState}
          onPause={() => setSnapshot((prev) => (prev.state !== "PAUSED" ? { state: "PAUSED" } : prev))}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            if (video.currentTime > 0) {
              clearBrowserBufferingTimer();
              setSnapshot((prev) => {
                if (prev.state === "LOADING" || prev.state === "BUFFERING") {
                  return { state: "PLAYING" };
                }
                return prev;
              });
            }
          }}
          onError={() => {
            if (isBrowserPlaybackAttemptingRef.current) return;
            const video = videoRef.current;
            if (!video?.error) return;
            if (!video.paused && !video.ended && video.readyState >= 2) {
              logger.warn("Ignoring non-fatal browser video error during active playback", {
                code: video.error.code,
              });
              return;
            }
            browserPlaybackAdapter.reset(video);
            const message = getBrowserMediaErrorMessage(video);
            setError(message);
            setSnapshot({ state: "ERROR", errorMessage: message });
          }}
        />
      ) : (
        <div
          id="av-player"
          ref={avPlayerSurfaceRef}
          className={`${styles.videoSurface} ${styles.avplaySurface}`.trim()}
        />
      )}

      {(playerState === "LOADING" || playerState === "BUFFERING") && !requiresParentalUnlock && (
        <div className={styles.loadingOverlay}>
          <Loader size={80} />
          <p className={styles.loadingLabel}>
            {playerState === "LOADING" ? "Loading stream…" : "Buffering…"}
          </p>
        </div>
      )}

      {(playerState === "ERROR" || error) && !requiresParentalUnlock && (
        <div className={styles.errorOverlay}>
          <h2 className={styles.errorTitle}>Playback Error</h2>
          <p className={styles.errorMessage}>
            {error ||
              snapshot.errorMessage ||
              "This stream is currently unavailable. Please try another channel."}
          </p>
          <div className={styles.errorActions}>
            <Focusable
              id="player-retry"
              onEnter={retryPlayback}
              disableFocusEffects
              className={styles.retryBtn}
            >
              <span>Retry Stream</span>
            </Focusable>
            <Focusable
              id="player-error-back"
              onEnter={onBack}
              disableFocusEffects
              className={styles.backBtn}
            >
              <span>Back to List</span>
            </Focusable>
          </div>
        </div>
      )}

      {requiresParentalUnlock && (
        <div className={styles.parentalOverlay}>
          <TvKeyboard
            key={`parental-${activePlaybackItem.id}-${activePlaybackItem.contentType}`}
            title="Parental Lock"
            value=""
            mode="password"
            variant="modal"
            placeholder="Enter your parental PIN"
            maskValue
            maxLength={6}
            onChange={() => {
              if (parentalError) setParentalError(null);
            }}
            onSubmit={handleParentalSubmit}
            onClose={onBack}
          />
          {parentalError && <p className={styles.parentalError}>{parentalError}</p>}
        </div>
      )}

      {!requiresParentalUnlock && (
        <>
          {isLive ? (
            controlsVisible || isEpgPeekActive || Boolean(zappingChannel) ? (
              <LivePlayerOverlay
                isVisible
                controlsVisible={controlsVisible}
                channel={activePlaybackItem}
                isPlaying={isPlaying}
                currentProgram={currentProgram}
                nextProgram={nextProgram}
                liveClockLabel={liveClockLabel}
                liveChannelLabel={liveChannelLabel}
                zappingChannel={zappingChannel}
                onPlayPause={togglePlayPause}
                onBack={exitPlayer}
                onSettingsClick={() => setSettingsVisible(true)}
              />
            ) : null
          ) : (
            <>
              {shouldShowSkipIntro ? (
                <SkipIntroOverlay
                  isVisible
                  onSkip={() => {
                    seekBySeconds(85);
                    setSkipIntroDismissed(true);
                  }}
                />
              ) : null}

              {shouldShowUpNext ? (
                <UpNextOverlay
                  isVisible
                  nextEpisode={
                    nextEpisode
                      ? {
                          title: nextEpisode.title,
                          seasonNumber: nextEpisode.seasonNumber,
                          episodeNumber: nextEpisode.episodeNumber,
                          thumbnailUrl: nextEpisode.logoUrl,
                        }
                      : null
                  }
                  countdownSeconds={upNextCountdown}
                  onPlayNow={playNextEpisodeNow}
                  onCancel={() => setUpNextDismissed(true)}
                />
              ) : null}

              {controlsVisible ? (
                <PlayerControls
                  isVisible
                  title={activePlaybackItem.title}
                  isPlaying={isPlaying}
                  isLive={isLive}
                  progress={progress}
                  currentTimeLabel={formatSeconds(currentSeconds)}
                  durationLabel={formatSeconds(durationSeconds)}
                  onPlayPause={togglePlayPause}
                  onBack={() => {
                    exitPlayer();
                  }}
                  onSettingsClick={() => {
                    setSettingsVisible(true);
                    setControlsVisible(true);
                  }}
                  seasonNumber={activePlaybackItem.metadata?.seasonNumber}
                  episodeNumber={activePlaybackItem.metadata?.episodeNumber}
                  onSeekBackward={() => seekBySeconds(-10)}
                  onSeekForward={() => seekBySeconds(10)}
                />
              ) : null}
            </>
          )}

          {settingsVisible ? (
            <PlayerSettingsOverlay
              isVisible
              onClose={() => setSettingsVisible(false)}
              trackSelectionManager={isBrowserMode ? null : trackSelectionManager}
            />
          ) : null}

          {skipIndicator && (
            <div
              key={`${skipIndicator.direction}-${skipIndicator.amount}`}
              className={`${styles.skipIndicator} ${
                skipIndicator.direction === "left"
                  ? styles.skipIndicatorLeft
                  : styles.skipIndicatorRight
              }`}
            >
              {skipIndicator.direction === "left" ? (
                <Rewind size={28} fill="currentColor" />
              ) : (
                <FastForward size={28} fill="currentColor" />
              )}
              <span className={styles.skipIndicatorValue}>
                {skipIndicator.direction === "left" ? "-" : "+"}{skipIndicator.amount}s
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
