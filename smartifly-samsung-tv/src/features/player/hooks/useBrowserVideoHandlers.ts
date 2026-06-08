import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  type SyntheticEvent,
} from "react";
import { browserPlaybackAdapter } from "../../../playback/browserPlaybackAdapter";
import { getBrowserBufferingDelayMs } from "../../../playback/playbackPolicy";
import type { PlayerStateSnapshot } from "../../../playback/playerState";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import { logger } from "../../../utils/logger";
import { getBrowserMediaErrorMessage } from "../utils/playerErrors";

type UseBrowserVideoHandlersArgs = {
  activePlaybackItem: ActivePlaybackItem | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  setSnapshot: Dispatch<SetStateAction<PlayerStateSnapshot>>;
  setError: Dispatch<SetStateAction<string | null>>;
};

export const useBrowserVideoHandlers = ({
  activePlaybackItem,
  videoRef,
  setSnapshot,
  setError,
}: UseBrowserVideoHandlersArgs) => {
  const browserBufferingTimerRef = useRef<number | null>(null);
  const isBrowserPlaybackAttemptingRef = useRef(false);

  const clearBrowserBufferingTimer = useCallback(() => {
    if (browserBufferingTimerRef.current !== null) {
      window.clearTimeout(browserBufferingTimerRef.current);
      browserBufferingTimerRef.current = null;
    }
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
    [videoRef]
  );

  useEffect(() => {
    return () => {
      clearBrowserBufferingTimer();
    };
  }, [clearBrowserBufferingTimer]);

  const markBrowserPlaying = useCallback(() => {
    clearBrowserBufferingTimer();
    setSnapshot((prev) => (prev.state !== "PLAYING" ? { state: "PLAYING" } : prev));
  }, [clearBrowserBufferingTimer, setSnapshot]);

  const scheduleBrowserBufferingState = useCallback(() => {
    clearBrowserBufferingTimer();
    browserBufferingTimerRef.current = window.setTimeout(() => {
      setSnapshot((prev) => {
        if (prev.state === "PLAYING" || prev.state === "READY" || prev.state === "LOADING") {
          return { state: "BUFFERING" };
        }
        return prev;
      });
    }, getBrowserBufferingDelayMs(activePlaybackItem?.contentType ?? "vod"));
  }, [activePlaybackItem?.contentType, browserBufferingTimerRef, clearBrowserBufferingTimer, setSnapshot]);

  const handleBrowserPause = useCallback(() => {
    setSnapshot((prev) => (prev.state !== "PAUSED" ? { state: "PAUSED" } : prev));
  }, [setSnapshot]);

  const handleBrowserTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      const video = event.currentTarget;
      if (video.currentTime > 0) {
        clearBrowserBufferingTimer();
        setSnapshot((prev) => {
          if (prev.state === "LOADING" || prev.state === "BUFFERING") {
            return { state: "PLAYING" };
          }
          return prev;
        });
      }
    },
    [clearBrowserBufferingTimer, setSnapshot]
  );

  const handleBrowserError = useCallback(() => {
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
  }, [isBrowserPlaybackAttemptingRef, setError, setSnapshot, videoRef]);

  return {
    clearBrowserBufferingTimer,
    playBrowserStream,
    markBrowserPlaying,
    scheduleBrowserBufferingState,
    handleBrowserPause,
    handleBrowserTimeUpdate,
    handleBrowserError,
  };
};
