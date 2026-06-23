import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
  type SyntheticEvent,
} from "react";
import { avplayAdapter } from "../../../playback/avplayAdapter";
import {
  AVPLAY_BACKGROUND_PROGRESS_COMMIT_INTERVAL_MS,
  AVPLAY_DURATION_POLL_INTERVAL_MS,
  AVPLAY_VISIBLE_PROGRESS_COMMIT_INTERVAL_MS,
  BROWSER_POSITION_POLL_INTERVAL_MS,
  MIN_RESUME_PERSIST_SECONDS,
  PROGRESS_PERSIST_INTERVAL_MS,
  PROGRESS_PERSIST_MIN_STEP_SECONDS,
} from "../../../playback/playbackPolicy";
import type { PlayerController } from "../../../playback/playerController";
import type { PlayerStateSnapshot } from "../../../playback/playerState";
import { services } from "../../../services";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import { getResumePositionSeconds } from "../../../utils/resumePosition";

type MeasurePlayerWork = <T>(
  metric: string,
  data: Record<string, unknown>,
  fn: () => T
) => T;

type UsePlaybackProgressArgs = {
  activePlaybackItem: ActivePlaybackItem | null;
  playbackKey: string;
  isBrowserMode: boolean;
  isLive: boolean;
  controlsVisible: boolean;
  settingsVisible: boolean;
  controlsVisibleRef: MutableRefObject<boolean>;
  settingsVisibleRef: MutableRefObject<boolean>;
  controller: PlayerController;
  videoRef: RefObject<HTMLVideoElement | null>;
  setSnapshot: Dispatch<SetStateAction<PlayerStateSnapshot>>;
  measurePlayerWork: MeasurePlayerWork;
};

export const usePlaybackProgress = ({
  activePlaybackItem,
  playbackKey,
  isBrowserMode,
  isLive,
  controlsVisible,
  settingsVisible,
  controlsVisibleRef,
  settingsVisibleRef,
  controller,
  videoRef,
  setSnapshot,
  measurePlayerWork,
}: UsePlaybackProgressArgs) => {
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const durationSecondsRef = useRef<number>(0);
  const lastSavedSecondRef = useRef<number>(0);
  const browserResumeAppliedKeyRef = useRef<string | null>(null);
  const avplayCurrentTimeRef = useRef(0);
  const lastAvplayProgressCommitAtRef = useRef(0);
  const lastAvplayProgressCommitSecondsRef = useRef(0);

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
        id: activePlaybackItem.seriesId || activePlaybackItem.id,
        type: activePlaybackItem.contentType,
        title: activePlaybackItem.title,
        imageUrl: activePlaybackItem.logoUrl,
        backdropUrl: activePlaybackItem.backdropUrl,
        watchedAt: new Date().toISOString(),
        positionSeconds: rounded,
        durationSeconds:
          durationSecondsRef.current > 0 ? Math.floor(durationSecondsRef.current) : undefined,
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
  }, [isBrowserMode, videoRef]);

  const readDurationSeconds = useCallback(() => {
    if (isBrowserMode) {
      return videoRef.current?.duration || 0;
    }
    try {
      return avplayAdapter.getDuration() / 1000;
    } catch {
      return 0;
    }
  }, [isBrowserMode, videoRef]);

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

      if (!force && sinceLastCommitMs < commitIntervalMs && deltaSeconds < 1) {
        return;
      }

      lastAvplayProgressCommitAtRef.current = now;
      lastAvplayProgressCommitSecondsRef.current = seconds;
      setCurrentSeconds(seconds);
    },
    [controlsVisibleRef, isLive, settingsVisibleRef]
  );

  const saveSnapshotBeforeExit = useCallback(() => {
    durationSecondsRef.current = readDurationSeconds();
    persistPlaybackPosition(readCurrentSeconds(), { force: true });
  }, [persistPlaybackPosition, readCurrentSeconds, readDurationSeconds]);

  const handleBrowserLoadedMetadata = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
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
    },
    [getSafeResumeTarget, playbackKey, setSnapshot]
  );

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

  useEffect(() => {
    if (!activePlaybackItem) return;

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

    return () => {
      if (positionTimer !== null) window.clearInterval(positionTimer);
      if (persistTimer !== null) window.clearInterval(persistTimer);
    };
  }, [
    activePlaybackItem,
    controlsVisibleRef,
    isBrowserMode,
    isLive,
    measurePlayerWork,
    persistPlaybackPosition,
    readCurrentSeconds,
    readDurationSeconds,
    settingsVisibleRef,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCurrentSeconds(0);
      setDurationSeconds(0);
      durationSecondsRef.current = 0;
      lastSavedSecondRef.current = 0;
      lastAvplayProgressCommitAtRef.current = 0;
      lastAvplayProgressCommitSecondsRef.current = 0;
      browserResumeAppliedKeyRef.current = null;
      avplayCurrentTimeRef.current = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    activePlaybackItem?.id,
    activePlaybackItem?.contentType,
    activePlaybackItem?.resumePositionSeconds,
  ]);

  return {
    currentSeconds,
    durationSeconds,
    durationSecondsRef,
    setCurrentSeconds,
    readCurrentSeconds,
    readDurationSeconds,
    getSafeResumeTarget,
    persistPlaybackPosition,
    saveSnapshotBeforeExit,
    commitAvplayCurrentSeconds,
    handleBrowserLoadedMetadata,
  };
};
