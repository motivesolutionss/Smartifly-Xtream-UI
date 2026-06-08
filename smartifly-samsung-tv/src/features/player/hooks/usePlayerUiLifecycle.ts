import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { UP_NEXT_AUTOPLAY_FALLBACK_THRESHOLD_SECONDS } from "../../../playback/playbackPolicy";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import { logger } from "../../../utils/logger";

type UsePlayerUiLifecycleArgs = {
  activePlaybackItem: ActivePlaybackItem | null;
  isLive: boolean;
  controlsVisible: boolean;
  settingsVisible: boolean;
  playerState: string;
  lastActivity: number;
  canAutoPlayNext: boolean;
  shouldShowUpNext: boolean;
  isPlaying: boolean;
  remainingSeconds: number;
  nextEpisode: ActivePlaybackItem["nextItem"] | null;
  clearBrowserBufferingTimer: () => void;
  didHandleExitRef: MutableRefObject<boolean>;
  didAutoPlayNextRef: MutableRefObject<boolean>;
  setControlsVisible: Dispatch<SetStateAction<boolean>>;
  setSettingsVisible: Dispatch<SetStateAction<boolean>>;
  setSkipIntroDismissed: Dispatch<SetStateAction<boolean>>;
  setUpNextDismissed: Dispatch<SetStateAction<boolean>>;
  setIsEpgPeekActive: Dispatch<SetStateAction<boolean>>;
  playNextEpisodeNow: () => void;
};

export const usePlayerUiLifecycle = ({
  activePlaybackItem,
  isLive,
  controlsVisible,
  settingsVisible,
  playerState,
  lastActivity,
  canAutoPlayNext,
  shouldShowUpNext,
  isPlaying,
  remainingSeconds,
  nextEpisode,
  clearBrowserBufferingTimer,
  didHandleExitRef,
  didAutoPlayNextRef,
  setControlsVisible,
  setSettingsVisible,
  setSkipIntroDismissed,
  setUpNextDismissed,
  setIsEpgPeekActive,
  playNextEpisodeNow,
}: UsePlayerUiLifecycleArgs) => {
  const [liveClockMs, setLiveClockMs] = useState(() => Date.now());

  const maybeAutoPlayNext = useCallback(
    (reason: "ended" | "near_end_fallback") => {
      if (!canAutoPlayNext || didAutoPlayNextRef.current) {
        return;
      }

      logger.info("Auto-playing next episode", {
        reason,
        remainingSeconds,
        currentState: playerState,
        streamId: activePlaybackItem?.id,
        nextEpisodeId: nextEpisode?.id,
      });
      didAutoPlayNextRef.current = true;
      playNextEpisodeNow();
    },
    [
      activePlaybackItem?.id,
      canAutoPlayNext,
      didAutoPlayNextRef,
      nextEpisode?.id,
      playNextEpisodeNow,
      playerState,
      remainingSeconds,
    ]
  );

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
  }, [activePlaybackItem?.id, activePlaybackItem?.contentType, setIsEpgPeekActive]);

  useEffect(() => {
    if (!isLive) return;
    const intervalId = window.setInterval(() => {
      setLiveClockMs(Date.now());
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [isLive, activePlaybackItem?.id]);

  useEffect(() => {
    didHandleExitRef.current = false;
    didAutoPlayNextRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      setControlsVisible(activePlaybackItem?.contentType !== "live");
      setSettingsVisible(false);
      setSkipIntroDismissed(false);
      setUpNextDismissed(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    activePlaybackItem?.id,
    activePlaybackItem?.contentType,
    activePlaybackItem?.resumePositionSeconds,
    didAutoPlayNextRef,
    didHandleExitRef,
    setControlsVisible,
    setSettingsVisible,
    setSkipIntroDismissed,
    setUpNextDismissed,
  ]);

  useEffect(() => {
    return () => {
      clearBrowserBufferingTimer();
    };
  }, [clearBrowserBufferingTimer]);

  useEffect(() => {
    if (!controlsVisible || settingsVisible || playerState !== "PLAYING") return;

    const timer = window.setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [controlsVisible, playerState, settingsVisible, lastActivity, setControlsVisible]);

  useEffect(() => {
    if (!shouldShowUpNext || settingsVisible || !isPlaying) return;
    if (remainingSeconds <= UP_NEXT_AUTOPLAY_FALLBACK_THRESHOLD_SECONDS) {
      maybeAutoPlayNext("near_end_fallback");
    }
  }, [
    maybeAutoPlayNext,
    isPlaying,
    settingsVisible,
    shouldShowUpNext,
    remainingSeconds,
  ]);

  useEffect(() => {
    if (playerState !== "ENDED") return;
    maybeAutoPlayNext("ended");
  }, [
    maybeAutoPlayNext,
    playerState,
  ]);

  return {
    liveClockMs,
  };
};
