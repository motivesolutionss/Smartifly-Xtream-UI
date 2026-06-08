import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import { avplayAdapter } from "../../../playback/avplayAdapter";
import type { PlayerController } from "../../../playback/playerController";
import { services } from "../../../services";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import type { AppChannel } from "../../../types/appModels";
import { logger } from "../../../utils/logger";
import type { PlayerStateSnapshot } from "../../../playback/playerState";

type SkipIndicator = {
  direction: "left" | "right";
  amount: number;
} | null;

type UsePlaybackControlsArgs = {
  activePlaybackItem: ActivePlaybackItem | null;
  nextEpisode: ActivePlaybackItem["nextItem"] | null;
  liveChannels: AppChannel[];
  isBrowserMode: boolean;
  controlsVisibleRef: MutableRefObject<boolean>;
  didHandleExitRef: MutableRefObject<boolean>;
  didAutoPlayNextRef: MutableRefObject<boolean>;
  videoRef: RefObject<HTMLVideoElement | null>;
  controller: PlayerController;
  onBack: () => void;
  setSnapshot: Dispatch<SetStateAction<PlayerStateSnapshot>>;
  setCurrentSeconds: Dispatch<SetStateAction<number>>;
  setSkipIndicator: Dispatch<SetStateAction<SkipIndicator>>;
  setZappingChannel: Dispatch<SetStateAction<AppChannel | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setUpNextDismissed: Dispatch<SetStateAction<boolean>>;
  setActivePlaybackItem: (item: ActivePlaybackItem | AppChannel | null) => void;
  persistPlaybackPosition: (seconds: number, options?: { force?: boolean }) => void;
  readCurrentSeconds: () => number;
  saveSnapshotBeforeExit: () => void;
};

export const usePlaybackControls = ({
  activePlaybackItem,
  nextEpisode,
  liveChannels,
  isBrowserMode,
  controlsVisibleRef,
  didHandleExitRef,
  didAutoPlayNextRef,
  videoRef,
  controller,
  onBack,
  setSnapshot,
  setCurrentSeconds,
  setSkipIndicator,
  setZappingChannel,
  setError,
  setUpNextDismissed,
  setActivePlaybackItem,
  persistPlaybackPosition,
  readCurrentSeconds,
  saveSnapshotBeforeExit,
}: UsePlaybackControlsArgs) => {
  const skipIndicatorTimerRef = useRef<number | null>(null);
  const zappingOverlayTimerRef = useRef<number | null>(null);
  const lastZapAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (skipIndicatorTimerRef.current !== null) {
        window.clearTimeout(skipIndicatorTimerRef.current);
      }
      if (zappingOverlayTimerRef.current !== null) {
        window.clearTimeout(zappingOverlayTimerRef.current);
      }
      setSkipIndicator(null);
      setZappingChannel(null);
    };
  }, [setSkipIndicator, setZappingChannel]);

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

      if (!controlsVisibleRef.current) {
        setSkipIndicator((prev) => {
          const direction = deltaSeconds > 0 ? "right" : "left";
          if (prev && prev.direction === direction) {
            return {
              direction,
              amount: prev.amount + Math.abs(deltaSeconds),
            };
          }
          return {
            direction,
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
    [
      activePlaybackItem,
      controlsVisibleRef,
      isBrowserMode,
      persistPlaybackPosition,
      readCurrentSeconds,
      setCurrentSeconds,
      setSkipIndicator,
      videoRef,
      skipIndicatorTimerRef,
    ]
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
      return;
    }

    const state = controller.getState();
    if (state === "PLAYING") {
      controller.pause();
    } else if (state === "PAUSED") {
      controller.resume();
    }
  }, [controller, isBrowserMode, setSnapshot, videoRef]);

  const switchChannel = useCallback(
    (direction: 1 | -1) => {
      if (!activePlaybackItem || activePlaybackItem.contentType !== "live") return;
      if (liveChannels.length === 0) return;

      const now = Date.now();
      if (now - lastZapAtRef.current < 280) return;
      lastZapAtRef.current = now;

      const currentIndex = liveChannels.findIndex((channel) => channel.id === activePlaybackItem.id);
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
    [
      activePlaybackItem,
      lastZapAtRef,
      liveChannels,
      setActivePlaybackItem,
      setError,
      setZappingChannel,
      zappingOverlayTimerRef,
    ]
  );

  const exitPlayer = useCallback(() => {
    if (didHandleExitRef.current) return;
    didHandleExitRef.current = true;
    saveSnapshotBeforeExit();
    controller.release();
    onBack();
  }, [controller, didHandleExitRef, onBack, saveSnapshotBeforeExit]);

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
      backdropUrl: next.backdropUrl,
      contentType: "series",
      extension: next.extension,
      metadata: {
        seasonNumber: next.seasonNumber,
        episodeNumber: next.episodeNumber,
      },
      nextItem: next.nextItem,
    });
  }, [activePlaybackItem?.seriesId, didAutoPlayNextRef, nextEpisode, setActivePlaybackItem, setUpNextDismissed]);

  return {
    seekBySeconds,
    togglePlayPause,
    switchChannel,
    exitPlayer,
    playNextEpisodeNow,
  };
};
