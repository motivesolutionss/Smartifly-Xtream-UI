import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import { browserPlaybackAdapter } from "../../../playback/browserPlaybackAdapter";
import { playbackMetrics } from "../../../playback/playbackMetrics";
import {
  AVPLAY_START_RETRY_DELAY_MS,
  PLAYBACK_URL_RETRY_DELAY_MS,
  type PlaybackEngineKind,
} from "../../../playback/playbackPolicy";
import type { PlayerController } from "../../../playback/playerController";
import type { PlayerStateSnapshot } from "../../../playback/playerState";
import { services } from "../../../services";
import type { ActivePlaybackItem } from "../../../store/playerStore";

type UsePlaybackLoaderArgs = {
  activePlaybackItem: ActivePlaybackItem | null;
  playbackKey: string;
  requiresParentalUnlock: boolean;
  isBrowserMode: boolean;
  playerEngineLabel: PlaybackEngineKind;
  controller: PlayerController;
  didHandleExitRef: MutableRefObject<boolean>;
  videoRef: RefObject<HTMLVideoElement | null>;
  setSnapshot: Dispatch<SetStateAction<PlayerStateSnapshot>>;
  setError: Dispatch<SetStateAction<string | null>>;
  getPlaybackExtensionCandidates: (
    contentType: ActivePlaybackItem["contentType"],
    extension?: string
  ) => string[];
  getSafeResumeTarget: () => number | undefined;
  getAvPlayDisplayRect: () =>
    | {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | undefined;
  playBrowserStream: (url: string, contentType: ActivePlaybackItem["contentType"]) => Promise<void>;
  clearBrowserBufferingTimer: () => void;
  commitAvplayCurrentSeconds: (seconds: number, options?: { force?: boolean }) => void;
};

export const usePlaybackLoader = ({
  activePlaybackItem,
  playbackKey,
  requiresParentalUnlock,
  isBrowserMode,
  playerEngineLabel,
  controller,
  didHandleExitRef,
  videoRef,
  setSnapshot,
  setError,
  getPlaybackExtensionCandidates,
  getSafeResumeTarget,
  getAvPlayDisplayRect,
  playBrowserStream,
  clearBrowserBufferingTimer,
  commitAvplayCurrentSeconds,
}: UsePlaybackLoaderArgs) => {
  const loadAttemptIdRef = useRef(0);
  const [retryNonce, setRetryNonce] = useState(0);

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
  }, [
    activePlaybackItem,
    clearBrowserBufferingTimer,
    controller,
    didHandleExitRef,
    isBrowserMode,
    setError,
    setSnapshot,
    videoRef,
  ]);

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

        playbackMetrics.requested({
          streamId: activePlaybackItem.id,
          contentType: activePlaybackItem.contentType,
          engine: playerEngineLabel,
        });
        playbackMetrics.extensionCandidatesResolved({
          streamId: activePlaybackItem.id,
          contentType: activePlaybackItem.contentType,
          engine: playerEngineLabel,
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
            const urlResolveStartedAt = performance.now();
            try {
              url = await services.playback.getPlaybackUrl(attemptRequest);
            } catch {
              if (isStaleAttempt()) return;
              await new Promise((resolve) =>
                window.setTimeout(resolve, PLAYBACK_URL_RETRY_DELAY_MS)
              );
              if (isStaleAttempt()) return;
              url = await services.playback.getPlaybackUrl(attemptRequest);
            }
            if (isStaleAttempt()) return;

            playbackMetrics.urlResolved({
              streamId: activePlaybackItem.id,
              contentType: activePlaybackItem.contentType,
              engine: playerEngineLabel,
              extension: attemptExtension,
              attempt: attemptIndex + 1,
              totalAttempts: playbackExtensions.length,
              resolveMs: Math.round(performance.now() - urlResolveStartedAt),
            });

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
                await new Promise((resolve) =>
                  window.setTimeout(resolve, AVPLAY_START_RETRY_DELAY_MS)
                );
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
            playbackMetrics.engineSelected({
              streamId: activePlaybackItem.id,
              contentType: activePlaybackItem.contentType,
              engine: playerEngineLabel,
              extension: attemptExtension,
              attempt: attemptIndex + 1,
              totalAttempts: playbackExtensions.length,
              startupMs: Math.round(performance.now() - attemptStartedAt),
            });
            break;
          } catch (attemptError) {
            lastError = attemptError;
            playbackMetrics.extensionAttemptFailed({
              streamId: activePlaybackItem.id,
              contentType: activePlaybackItem.contentType,
              engine: playerEngineLabel,
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
    activePlaybackItem,
    clearBrowserBufferingTimer,
    commitAvplayCurrentSeconds,
    controller,
    getAvPlayDisplayRect,
    getPlaybackExtensionCandidates,
    getSafeResumeTarget,
    isBrowserMode,
    playbackKey,
    playBrowserStream,
    playerEngineLabel,
    requiresParentalUnlock,
    retryNonce,
    setError,
    setSnapshot,
    videoRef,
    loadAttemptIdRef,
  ]);

  return {
    retryPlayback,
  };
};
