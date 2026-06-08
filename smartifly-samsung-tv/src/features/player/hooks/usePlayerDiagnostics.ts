import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import {
  AVPLAY_HEARTBEAT_INTERVAL_MS,
  PLAYER_JANK_SAMPLE_INTERVAL_MS,
  PLAYER_JANK_SEVERE_FRAME_MS,
  PLAYER_JANK_SLOW_FRAME_MS,
  PLAYER_LONG_TASK_LOG_COOLDOWN_MS,
  PLAYER_LONG_TASK_LOG_THRESHOLD_MS,
  type PlaybackEngineKind,
} from "../../../playback/playbackPolicy";
import type { PlayerStateSnapshot } from "../../../playback/playerState";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import {
  isDebugLoggingEnabled,
  logger,
  subscribeToDebugLoggingChanges,
} from "../../../utils/logger";

type PlayerJankSample = {
  windowMs: number;
  totalFrames: number;
  slowFrames: number;
  severeFrames: number;
  worstFrameMs: number;
  avgFrameMs: number | null;
  approxFps: number | null;
};

type UsePlayerDiagnosticsArgs = {
  activePlaybackItem: ActivePlaybackItem | null;
  playerEngineLabel: PlaybackEngineKind;
  playerState: PlayerStateSnapshot["state"];
  isBrowserMode: boolean;
  readCurrentSeconds: () => number;
  readDurationSeconds: () => number;
  controlsVisibleRef: MutableRefObject<boolean>;
  settingsVisibleRef: MutableRefObject<boolean>;
  focusedIdRef: MutableRefObject<string | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export const usePlayerDiagnostics = ({
  activePlaybackItem,
  playerEngineLabel,
  playerState,
  isBrowserMode,
  readCurrentSeconds,
  readDurationSeconds,
  controlsVisibleRef,
  settingsVisibleRef,
  focusedIdRef,
  videoRef,
}: UsePlayerDiagnosticsArgs) => {
  const latestJankSampleRef = useRef<PlayerJankSample | null>(null);
  const lastLongTaskLogAtRef = useRef(0);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(() =>
    isDebugLoggingEnabled()
  );

  useEffect(() => {
    setDiagnosticsEnabled(isDebugLoggingEnabled());
    return subscribeToDebugLoggingChanges(() => {
      setDiagnosticsEnabled(isDebugLoggingEnabled());
    });
  }, []);

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
  }, [
    activePlaybackItem,
    controlsVisibleRef,
    diagnosticsEnabled,
    playerEngineLabel,
    playerState,
    settingsVisibleRef,
  ]);

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
  }, [
    activePlaybackItem,
    controlsVisibleRef,
    diagnosticsEnabled,
    focusedIdRef,
    playerEngineLabel,
    settingsVisibleRef,
  ]);

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

      if (playerState === "PLAYING" && mediaClockRate !== null && mediaClockRate < 0.7) {
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
    controlsVisibleRef,
    diagnosticsEnabled,
    focusedIdRef,
    isBrowserMode,
    playerState,
    readCurrentSeconds,
    readDurationSeconds,
    settingsVisibleRef,
  ]);

  useEffect(() => {
    if (!isBrowserMode) return;
    if (!diagnosticsEnabled) return;

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
  }, [activePlaybackItem, diagnosticsEnabled, isBrowserMode, videoRef]);
};
