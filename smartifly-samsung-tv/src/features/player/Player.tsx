import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { PlayerController } from "../../playback/playerController";
import { avplayAdapter } from "../../playback/avplayAdapter";
import { browserPlaybackAdapter } from "../../playback/browserPlaybackAdapter";
import type { PlayerStateSnapshot } from "../../playback/playerState";
import { services } from "../../services";
import { useSettingsStore } from "../../store/settingsStore";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import { useEpg } from "../live-tv/hooks/useEpg";
import { Loader } from "../../components/ui/Loader";
import { contentTypeLabels } from "./playerLabels";
import { PlayerControls } from "./components/PlayerControls";
import { PlayerSettingsOverlay } from "./components/PlayerSettingsOverlay";
import { SkipIntroOverlay } from "./components/SkipIntroOverlay";
import { UpNextOverlay } from "./components/UpNextOverlay";
import { TrackSelectionManager } from "../../playback/trackSelectionManager";
import { Focusable } from "../../components/tv/Focusable";
import { useFocus } from "../../providers/useFocus";
import type { AppChannel } from "../../types/appModels";
import { getResumePositionSeconds } from "../../utils/resumePosition";
import { logger } from "../../utils/logger";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import styles from "./Player.module.css";

interface PlayerProps {
  onBack: () => void;
}

type TizenHwKeyEvent = Event & {
  keyName?: string;
};

const BACK_KEYS = new Set(["Backspace", "Escape", "BrowserBack", "GoBack"]);

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

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
};

const cleanTitle = (title: string): string => {
  if (!title) return "";
  const delimiters = ["||", "|", " - ", " : "];
  for (const delimiter of delimiters) {
    if (title.includes(delimiter)) {
      const parts = title.split(delimiter);
      if (parts.length > 1 && parts[1].trim()) {
        return parts[1].trim();
      }
    }
  }
  const colonIndex = title.indexOf(":");
  if (colonIndex > 0 && colonIndex < 8) {
    const afterColon = title.substring(colonIndex + 1).trim();
    if (afterColon) return afterColon;
  }
  return title;
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
  const { setFocus, setFocusScope } = useFocus();
  const [snapshot, setSnapshot] = useState<PlayerStateSnapshot>({ state: "IDLE" });
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parentalError, setParentalError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isEpgPeekActive, setIsEpgPeekActive] = useState(false);
  const [lastActivity, setLastActivity] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [skipIntroDismissed, setSkipIntroDismissed] = useState(false);
  const [upNextDismissed, setUpNextDismissed] = useState(false);
  const [zappingChannel, setZappingChannel] = useState<AppChannel | null>(null);
  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});
  const [liveClockMs, setLiveClockMs] = useState(() => Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedSecondRef = useRef<number>(0);
  const durationSecondsRef = useRef<number>(0);
  const browserResumeAppliedKeyRef = useRef<string | null>(null);
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
  const isBrowserMode = useMemo(() => !avplayAdapter.isAvailable(), []);
  const controller = useMemo(() => PlayerController.getInstance(), []);
  const trackSelectionManager = useMemo(() => new TrackSelectionManager(), []);

  const isProtectedContent = Boolean(
    activePlaybackItem && activePlaybackItem.contentType !== "live"
  );
  const requiresParentalUnlock = Boolean(
    isProtectedContent && enableParentalLock && !isParentalUnlocked
  );
  const isLive = activePlaybackItem?.contentType === "live";
  const playerState = snapshot.state;
  const isPlaying = playerState === "PLAYING";

  const { currentProgram, nextPrograms } = useEpg(
    activePlaybackItem?.contentType === "live" ? activePlaybackItem.id : ""
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

  const displayTitle = useMemo(() => cleanTitle(activePlaybackItem?.title || ""), [activePlaybackItem?.title]);
  const liveClockLabel = useMemo(() => formatClockTime(liveClockMs), [liveClockMs]);
  const liveChannelIndex = useMemo(() => {
    if (!isLive || !activePlaybackItem) return -1;
    return liveChannels.findIndex((channel) => channel.id === activePlaybackItem.id);
  }, [activePlaybackItem, isLive, liveChannels]);
  const liveChannelLabel = useMemo(() => {
    if (!isLive || liveChannelIndex < 0) return undefined;
    return `CH ${String(liveChannelIndex + 1).padStart(3, "0")} / ${String(liveChannels.length).padStart(3, "0")}`;
  }, [isLive, liveChannelIndex, liveChannels.length]);
  const previousChannelTitle = useMemo(() => {
    if (!isLive || liveChannels.length < 2 || liveChannelIndex < 0) return undefined;
    return liveChannels[(liveChannelIndex - 1 + liveChannels.length) % liveChannels.length]?.title;
  }, [isLive, liveChannelIndex, liveChannels]);
  const nextChannelTitle = useMemo(() => {
    if (!isLive || liveChannels.length < 2 || liveChannelIndex < 0) return undefined;
    return liveChannels[(liveChannelIndex + 1) % liveChannels.length]?.title;
  }, [isLive, liveChannelIndex, liveChannels]);
  const liveProgramTimeLabel = useMemo(() => {
    if (!currentProgram) return undefined;
    return `${formatClockTime(currentProgram.startMs)} - ${formatClockTime(currentProgram.endMs)}`;
  }, [currentProgram]);
  const nextProgram = nextPrograms[0];
  const nextProgramTimeLabel = useMemo(() => {
    if (!nextProgram) return undefined;
    return `${formatClockTime(nextProgram.startMs)} - ${formatClockTime(nextProgram.endMs)}`;
  }, [nextProgram]);

  const showLogo = useMemo(() => {
    if (!activePlaybackItem?.logoUrl) return false;
    if (imageFailureMemory.hasFailed(activePlaybackItem.logoUrl)) return false;
    return !failedUrls[activePlaybackItem.logoUrl];
  }, [activePlaybackItem?.logoUrl, failedUrls]);

  const placeholderStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg,
        hsl(${Math.abs(hashString(displayTitle)) % 360}, 50%, 25%),
        hsl(${(Math.abs(hashString(displayTitle)) + 60) % 360}, 35%, 15%))`,
    }),
    [displayTitle]
  );

  const placeholderInitials = useMemo(() => {
    const cleanLetters = displayTitle.replace(/[^a-zA-Z0-9]/g, "").trim();
    return cleanLetters.substring(0, 2).toUpperCase() || "TV";
  }, [displayTitle]);

  const getSafeResumeTarget = useCallback(
    (knownDurationSeconds?: number) =>
      getResumePositionSeconds(
        activePlaybackItem?.resumePositionSeconds,
        knownDurationSeconds || activePlaybackItem?.resumeDurationSeconds
      ),
    [activePlaybackItem?.resumeDurationSeconds, activePlaybackItem?.resumePositionSeconds]
  );

  const persistPlaybackPosition = useCallback(
    (seconds: number) => {
      if (!activePlaybackItem || activePlaybackItem.contentType === "live") return;
      if (!Number.isFinite(seconds) || seconds < 10) return;

      const rounded = Math.floor(seconds);
      if (rounded <= lastSavedSecondRef.current + 5) return;
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
      return avplayAdapter.getCurrentTime() / 1000;
    } catch {
      return 0;
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
    persistPlaybackPosition(readCurrentSeconds());
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

  const retryPlayback = useCallback(() => {
    if (!activePlaybackItem) return;
    didHandleExitRef.current = false;
    setError(null);
    setActivePlaybackItem({ ...activePlaybackItem });
  }, [activePlaybackItem, setActivePlaybackItem]);

  // EPG Peek timer on channel switch / zapping
  useEffect(() => {
    if (!activePlaybackItem) return;
    setIsEpgPeekActive(true);
    const timer = window.setTimeout(() => {
      setIsEpgPeekActive(false);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [activePlaybackItem?.id, activePlaybackItem?.contentType]);

  const getLiveExtensionCandidates = useCallback((): Array<"ts" | "m3u8"> => {
    if (isBrowserMode) {
      return liveExtension === "m3u8" ? ["m3u8", "ts"] : ["ts", "m3u8"];
    }

    const preferred: "ts" | "m3u8" = liveExtension === "m3u8" ? "m3u8" : "ts";
    const fallback: "ts" | "m3u8" = preferred === "ts" ? "m3u8" : "ts";
    return [preferred, fallback];
  }, [isBrowserMode, liveExtension]);

  const playBrowserStream = useCallback(async (url: string) => {
    const video = videoRef.current;
    if (!video) {
      throw new Error("Browser video surface is not ready");
    }

    isBrowserPlaybackAttemptingRef.current = true;
    try {
      await browserPlaybackAdapter.play(url, video);
    } finally {
      isBrowserPlaybackAttemptingRef.current = false;
    }
  }, []);

  const clearBrowserBufferingTimer = useCallback(() => {
    if (browserBufferingTimerRef.current !== null) {
      window.clearTimeout(browserBufferingTimerRef.current);
      browserBufferingTimerRef.current = null;
    }
  }, []);

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
    if (!isLive) return;
    const intervalId = window.setInterval(() => {
      setLiveClockMs(Date.now());
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [isLive, activePlaybackItem?.id]);

  // 1. Stream Loader Effect
  useEffect(() => {
    if (!activePlaybackItem) return;
    if (requiresParentalUnlock) return;

    let isDisposed = false;

    const loadStream = async () => {
      try {
        setError(null);
        setStreamUrl(null);
        if (isBrowserMode) {
          setSnapshot({ state: "LOADING" });
        }

        const request = {
          contentType: activePlaybackItem.contentType,
          streamId: activePlaybackItem.id,
          extension: activePlaybackItem.extension,
        };

        const liveExtensions =
          activePlaybackItem.contentType === "live"
            ? getLiveExtensionCandidates()
            : [activePlaybackItem.extension];
        const startPositionSeconds = getSafeResumeTarget();
        let lastError: unknown = null;
        let hasStartedPlayback = false;

        for (const liveExt of liveExtensions) {
          const attemptRequest = {
            ...request,
            extension: activePlaybackItem.contentType === "live" ? liveExt : request.extension,
          };
          let url: string;
          try {
            try {
              url = await services.playback.getPlaybackUrl(attemptRequest);
            } catch {
              if (isDisposed) return;
              await new Promise((resolve) => window.setTimeout(resolve, 300));
              if (isDisposed) return;
              url = await services.playback.getPlaybackUrl(attemptRequest);
            }
            if (isDisposed) return;
            setStreamUrl(url);

            if (isBrowserMode) {
              await playBrowserStream(url);
            } else {
              try {
                await controller.playStream(url, {
                  startPositionSeconds,
                  contentType: activePlaybackItem.contentType,
                });
              } catch {
                if (isDisposed) return;
                await new Promise((resolve) => window.setTimeout(resolve, 450));
                if (isDisposed) return;
                await controller.playStream(url, {
                  startPositionSeconds,
                  contentType: activePlaybackItem.contentType,
                });
              }
            }

            hasStartedPlayback = true;
            if (activePlaybackItem.contentType === "live") {
              logger.info("Live extension selected for playback", {
                streamId: activePlaybackItem.id,
                extension: liveExt,
              });
            }
            break;
          } catch (attemptError) {
            lastError = attemptError;
            if (activePlaybackItem.contentType === "live") {
              logger.warn("Live extension attempt failed", {
                streamId: activePlaybackItem.id,
                extension: liveExt,
                error: attemptError,
              });
            } else {
              break;
            }
          }
        }

        if (!hasStartedPlayback) {
          throw lastError || new Error("Unable to start playback");
        }

        if (isDisposed) return;
        if (!isBrowserMode && startPositionSeconds) {
          setCurrentSeconds(startPositionSeconds);
        }
      } catch (err: unknown) {
        if (isDisposed) return;
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
      }
    });
    const browserVideoElement = videoRef.current;

    loadStream();

    return () => {
      isDisposed = true;
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
    requiresParentalUnlock,
    isBrowserMode,
    controller,
    getLiveExtensionCandidates,
    getSafeResumeTarget,
    clearBrowserBufferingTimer,
  ]);

  // 2. Playback timers, remote controls key handlers, and browser page/visibility event listeners
  useEffect(() => {
    if (!activePlaybackItem) return;
    if (requiresParentalUnlock) return;

    let positionTimer: number | null = null;
    let persistTimer: number | null = null;

    positionTimer = window.setInterval(() => {
      const nextPosition = readCurrentSeconds();
      const nextDuration = readDurationSeconds();
      durationSecondsRef.current = nextDuration;

      if (!isLive) {
        setCurrentSeconds(nextPosition);
        setDurationSeconds(nextDuration);
      }
    }, 1000);

    if (!isBrowserMode && activePlaybackItem.contentType !== "live") {
      persistTimer = window.setInterval(() => {
        persistPlaybackPosition(readCurrentSeconds());
      }, 15000);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
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
        // Controls are HIDDEN: D-pad keys perform their immediate quick actions

        // ArrowUp on VOD/Series triggers 4-second rich EPG peek overlay
        if (!isLive && e.key === "ArrowUp") {
          e.preventDefault();
          setIsEpgPeekActive(true);
          window.setTimeout(() => {
            setIsEpgPeekActive(false);
          }, 4000);
          return;
        }

        // ArrowRight/ArrowLeft triggers seek and shows controls on VOD/Series
        if (!isLive && e.key === "ArrowRight") {
          e.preventDefault();
          setControlsVisible(true);
          seekBySeconds(10);
          return;
        }

        if (!isLive && e.key === "ArrowLeft") {
          e.preventDefault();
          setControlsVisible(true);
          seekBySeconds(-10);
          return;
        }

        // ArrowUp/ArrowDown triggers channel switching (zapping) on Live TV
        if (isLive && e.key === "ArrowUp") {
          e.preventDefault();
          switchChannel(1);
          return;
        }

        // Any other key (e.g. Enter, ArrowDown on VOD) just shows the controls
        setControlsVisible(true);
      } else {
        // Controls are VISIBLE:
        // Do NOT intercept Arrow keys (ArrowLeft, ArrowRight, ArrowUp, ArrowDown) globally.
        // Let React synthetic focus events handle them to move focus between the buttons.
      }
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
    };
  }, [
    playbackKey,
    requiresParentalUnlock,
    isBrowserMode,
    isLive,
    exitPlayer,
    playBrowserStream,
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
      setControlsVisible(true);
      setSettingsVisible(false);
      setCurrentSeconds(0);
      setDurationSeconds(0);
      setSkipIntroDismissed(false);
      setUpNextDismissed(false);
      lastSavedSecondRef.current = 0;
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
    if (isBrowserMode && isLive) return;
    if (settingsVisible) return;
    if (!["PLAYING", "BUFFERING"].includes(playerState)) return;

    const now = Date.now();
    const seconds = currentSeconds;
    const lastSeconds = lastProgressSecondRef.current;
    const progressed = seconds > lastSeconds + 0.35;

    if (progressed) {
      lastProgressSecondRef.current = seconds;
      stallSinceMsRef.current = null;
      isAutoRecoveringRef.current = false;
      return;
    }

    const nearEnd =
      durationSeconds > 0 && durationSeconds - Math.max(0, seconds) <= 3;
    if (nearEnd) return;

    if (!stallSinceMsRef.current) {
      stallSinceMsRef.current = now;
      return;
    }

    const stalledForMs = now - stallSinceMsRef.current;
    if (stalledForMs < 12000 || isAutoRecoveringRef.current) return;

    const key = playbackKey;
    const attempts = stallRetryAttemptsRef.current[key] || 0;
    if (attempts >= 1) return;

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
    if (!activePlaybackItem || activePlaybackItem.contentType === "live") return;
    if (!isBrowserMode) return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentSeconds(videoElement.currentTime || 0);
      setDurationSeconds(videoElement.duration || 0);
      persistPlaybackPosition(videoElement.currentTime);
    };

    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [activePlaybackItem, isBrowserMode, persistPlaybackPosition, streamUrl]);

  useEffect(() => {
    if (!controlsVisible || settingsVisible || playerState !== "PLAYING") return;

    const timer = window.setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [controlsVisible, playerState, settingsVisible, lastActivity]);

  useEffect(() => {
    if (!shouldShowUpNext || settingsVisible || !isPlaying) return;
    if (remainingSeconds <= 0 && !didAutoPlayNextRef.current) {
      playNextEpisodeNow();
      didAutoPlayNextRef.current = true;
    }
  }, [isPlaying, playNextEpisodeNow, remainingSeconds, settingsVisible, shouldShowUpNext]);

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

  const showEpgPanel = isEpgPeekActive || controlsVisible;

  const infoOverlayClass = `${styles.infoOverlay} ${
    showEpgPanel ? styles.infoOverlayVisible : styles.infoOverlayHidden
  } ${controlsVisible ? styles.infoOverlayShifted : ""}`;

  const progress =
    durationSeconds > 0 ? Math.min(100, Math.max(0, (currentSeconds / durationSeconds) * 100)) : 0;

  return (
    <div className={styles.container}>
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
            const message = "Stream not supported in this browser.";
            setError(message);
            setSnapshot({ state: "ERROR", errorMessage: message });
          }}
        />
      ) : (
        <div id="av-player" className={styles.videoSurface} />
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
          <SkipIntroOverlay
            isVisible={shouldShowSkipIntro}
            onSkip={() => {
              seekBySeconds(85);
              setSkipIntroDismissed(true);
            }}
          />

          <UpNextOverlay
            isVisible={shouldShowUpNext}
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

          <PlayerControls
            isVisible={controlsVisible}
            title={activePlaybackItem.title}
            isPlaying={isPlaying}
            isLive={isLive}
            progress={progress}
            currentTimeLabel={formatSeconds(currentSeconds)}
            durationLabel={isLive ? "" : formatSeconds(durationSeconds)}
            onPlayPause={togglePlayPause}
            onSeekBackward={isLive ? undefined : () => seekBySeconds(-10)}
            onSeekForward={isLive ? undefined : () => seekBySeconds(10)}
            onPreviousChannel={isLive ? () => switchChannel(-1) : undefined}
            onNextChannel={isLive ? () => switchChannel(1) : undefined}
            onBack={() => {
              exitPlayer();
            }}
            onSettingsClick={() => {
              setSettingsVisible(true);
              setControlsVisible(true);
            }}
            liveChannelLabel={liveChannelLabel}
            liveProgramLabel={currentProgram?.title || activePlaybackItem.title}
            liveProgramTimeLabel={liveProgramTimeLabel}
            nextProgramLabel={nextProgram?.title}
            nextProgramTimeLabel={nextProgramTimeLabel}
            previousChannelTitle={previousChannelTitle}
            nextChannelTitle={nextChannelTitle}
            liveClockLabel={isLive ? liveClockLabel : undefined}
          />

          <PlayerSettingsOverlay
            isVisible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
            trackSelectionManager={isBrowserMode ? null : trackSelectionManager}
          />

          <div className={infoOverlayClass}>
            <div className={styles.channelInfo}>
              {showLogo ? (
                <img
                  src={activePlaybackItem.logoUrl}
                  alt=""
                  className={styles.logo}
                  onError={() => {
                    if (!activePlaybackItem.logoUrl) return;
                    imageFailureMemory.markFailed(activePlaybackItem.logoUrl);
                    setFailedUrls((prev) => ({ ...prev, [activePlaybackItem.logoUrl!]: true }));
                  }}
                />
              ) : (
                <div className={styles.placeholder} style={placeholderStyle}>
                  {placeholderInitials}
                </div>
              )}
              <div className={styles.channelMeta}>
                <div className={styles.badgeRow}>
                  <span className={styles.contentTypeBadge}>
                    {contentTypeLabels[activePlaybackItem.contentType]}
                  </span>
                  {activePlaybackItem.metadata?.seasonNumber !== undefined && (
                    <span className={styles.episodeBadge}>
                      Season {activePlaybackItem.metadata.seasonNumber} • Episode {activePlaybackItem.metadata.episodeNumber}
                    </span>
                  )}
                  <span className={styles.qualityBadge}>4K Ultra HD</span>
                  <span className={styles.qualityBadge}>HDR10+</span>
                  <span className={styles.audioBadge}>Dolby Atmos</span>
                </div>
                <h1 className={styles.channelTitle}>{activePlaybackItem.title}</h1>
                {currentProgram?.title ? (
                  <p className={styles.channelSubtitle}>
                    {currentProgram.title}
                  </p>
                ) : (
                  activePlaybackItem.contentType !== "live" && (
                    <p className={styles.channelSubtitle}>
                      {contentTypeLabels[activePlaybackItem.contentType]}
                    </p>
                  )
                )}
                {currentProgram && (
                  <>
                    <div className={styles.programMetaRow}>
                      {liveChannelLabel ? <span className={styles.programInfoChip}>{liveChannelLabel}</span> : null}
                      {liveProgramTimeLabel ? <span className={styles.programInfoText}>{liveProgramTimeLabel}</span> : null}
                    </div>
                    <div className={styles.epgProgressBar} aria-hidden="true">
                      <div
                        className={styles.epgProgressFill}
                        style={{ width: `${Math.min(100, Math.max(0, currentProgram.progress))}%` }}
                      />
                    </div>
                    {nextProgram ? (
                      <div className={styles.nextProgramRow}>
                        <span className={styles.nextProgramLabel}>Next</span>
                        <span className={styles.nextProgramTitle}>{nextProgram.title}</span>
                        {nextProgramTimeLabel ? (
                          <span className={styles.nextProgramTime}>{nextProgramTimeLabel}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className={styles.quickHintRow}>
                      <span className={styles.quickHint}>Up previous channel</span>
                      <span className={styles.quickHint}>Down next channel</span>
                      <span className={styles.quickHint}>Enter controls</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {zappingChannel && (
            <div className={styles.zappingOverlay} aria-live="polite">
              <div className={styles.zappingLogoWrap}>
                {zappingChannel.logoUrl && !failedUrls[zappingChannel.logoUrl] && !imageFailureMemory.hasFailed(zappingChannel.logoUrl) ? (
                  <img
                    src={zappingChannel.logoUrl}
                    alt=""
                    className={styles.zappingLogo}
                    onError={() => {
                      if (!zappingChannel.logoUrl) return;
                      imageFailureMemory.markFailed(zappingChannel.logoUrl);
                      setFailedUrls((prev) => ({ ...prev, [zappingChannel.logoUrl!]: true }));
                    }}
                  />
                ) : (
                  <div
                    className={styles.zappingPlaceholder}
                    style={{
                      background: `linear-gradient(135deg,
                        hsl(${Math.abs(hashString(cleanTitle(zappingChannel.title))) % 360}, 50%, 25%),
                        hsl(${(Math.abs(hashString(cleanTitle(zappingChannel.title))) + 60) % 360}, 35%, 15%))`
                    }}
                  >
                    {cleanTitle(zappingChannel.title).replace(/[^a-zA-Z0-9]/g, "").substring(0, 2).toUpperCase() || "TV"}
                  </div>
                )}
              </div>
              <div className={styles.zappingMeta}>
                <span className={styles.zappingLabel}>Switching to</span>
                <span className={styles.zappingTitle}>{zappingChannel.title}</span>
                {isLive && liveChannels.length > 0 ? (
                  <span className={styles.zappingChannelNumber}>
                    CH {String(Math.max(1, liveChannels.findIndex((channel) => channel.id === zappingChannel.id) + 1)).padStart(3, "0")}
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
