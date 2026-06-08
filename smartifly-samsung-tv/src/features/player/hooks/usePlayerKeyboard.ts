import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { PlayerController } from "../../../playback/playerController";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import { isBackKey, type TizenHwKeyEvent } from "../utils/playerKeys";

type MeasurePlayerWork = <T>(
  metric: string,
  data: Record<string, unknown>,
  fn: () => T
) => T;

type UsePlayerKeyboardArgs = {
  activePlaybackItem: ActivePlaybackItem | null;
  requiresParentalUnlock: boolean;
  isBrowserMode: boolean;
  isLive: boolean;
  controlsVisibleRef: MutableRefObject<boolean>;
  settingsVisibleRef: MutableRefObject<boolean>;
  controller: PlayerController;
  measurePlayerWork: MeasurePlayerWork;
  setControlsVisible: Dispatch<SetStateAction<boolean>>;
  setSettingsVisible: Dispatch<SetStateAction<boolean>>;
  setIsEpgPeekActive: Dispatch<SetStateAction<boolean>>;
  setLastActivity: Dispatch<SetStateAction<number>>;
  saveSnapshotBeforeExit: () => void;
  seekBySeconds: (deltaSeconds: number) => void;
  switchChannel: (direction: 1 | -1) => void;
  togglePlayPause: () => void;
  exitPlayer: () => void;
};

export const usePlayerKeyboard = ({
  activePlaybackItem,
  requiresParentalUnlock,
  isBrowserMode,
  isLive,
  controlsVisibleRef,
  settingsVisibleRef,
  controller,
  measurePlayerWork,
  setControlsVisible,
  setSettingsVisible,
  setIsEpgPeekActive,
  setLastActivity,
  saveSnapshotBeforeExit,
  seekBySeconds,
  switchChannel,
  togglePlayPause,
  exitPlayer,
}: UsePlayerKeyboardArgs) => {
  useEffect(() => {
    if (!activePlaybackItem) return;
    if (requiresParentalUnlock) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      measurePlayerWork(
        "player_keydown_handler_ms",
        {
          key: event.key,
          controlsVisible: controlsVisibleRef.current,
          settingsVisible: settingsVisibleRef.current,
          isLive,
        },
        () => {
          const isBack = isBackKey(event);
          if (isBack) {
            event.preventDefault();
            if (settingsVisibleRef.current) {
              setSettingsVisible(false);
              setControlsVisible(true);
              return;
            }
            exitPlayer();
            return;
          }

          setLastActivity(Date.now());

          if (settingsVisibleRef.current) return;

          if (event.key === "MediaPlayPause" || event.key === " ") {
            event.preventDefault();
            togglePlayPause();
            return;
          }

          if (event.key === "MediaFastForward" && !isLive) {
            event.preventDefault();
            setControlsVisible(true);
            seekBySeconds(10);
            return;
          }

          if (event.key === "MediaRewind" && !isLive) {
            event.preventDefault();
            setControlsVisible(true);
            seekBySeconds(-10);
            return;
          }

          if (isLive && event.key === "ChannelUp") {
            event.preventDefault();
            switchChannel(1);
            return;
          }

          if (isLive && event.key === "ChannelDown") {
            event.preventDefault();
            switchChannel(-1);
            return;
          }

          if (!controlsVisibleRef.current) {
            if (!isLive && event.key === "ArrowUp") {
              event.preventDefault();
              setIsEpgPeekActive(true);
              window.setTimeout(() => {
                setIsEpgPeekActive(false);
              }, 4000);
              return;
            }

            if (!isLive && event.key === "ArrowRight") {
              event.preventDefault();
              seekBySeconds(10);
              return;
            }

            if (!isLive && event.key === "ArrowLeft") {
              event.preventDefault();
              seekBySeconds(-10);
              return;
            }

            if (isLive && event.key === "ArrowUp") {
              event.preventDefault();
              switchChannel(1);
              return;
            }

            if (isLive && event.key === "ArrowDown") {
              event.preventDefault();
              switchChannel(-1);
              return;
            }

            setControlsVisible(true);
            return;
          }

          if (isLive && event.key === "ArrowUp") {
            event.preventDefault();
            switchChannel(1);
            setControlsVisible(false);
            return;
          }

          if (isLive && event.key === "ArrowDown") {
            event.preventDefault();
            switchChannel(-1);
            setControlsVisible(false);
            return;
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
    };
  }, [
    activePlaybackItem,
    controller,
    controlsVisibleRef,
    exitPlayer,
    isBrowserMode,
    isLive,
    measurePlayerWork,
    requiresParentalUnlock,
    saveSnapshotBeforeExit,
    seekBySeconds,
    setControlsVisible,
    setIsEpgPeekActive,
    setLastActivity,
    setSettingsVisible,
    settingsVisibleRef,
    switchChannel,
    togglePlayPause,
  ]);
};
