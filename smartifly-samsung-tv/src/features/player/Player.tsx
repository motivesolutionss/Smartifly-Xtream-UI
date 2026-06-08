import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { PlayerController } from "../../playback/playerController";
import { avplayAdapter } from "../../playback/avplayAdapter";
import {
  getPlaybackExtensionCandidates as resolvePlaybackExtensionCandidates,
} from "../../playback/playbackPolicy";
import type { PlayerStateSnapshot } from "../../playback/playerState";
import { useSettingsStore } from "../../store/settingsStore";
import { perfMetrics } from "../../utils/perfMetrics";
import { useEpg } from "../live-tv/hooks/useEpg";
import { PlayerLiveOverlayLayer } from "./components/PlayerLiveOverlayLayer";
import { PlayerSurface } from "./components/PlayerSurface";
import { PlayerLoadingOverlay } from "./components/PlayerLoadingOverlay";
import { PlayerErrorOverlay } from "./components/PlayerErrorOverlay";
import { PlayerParentalOverlay } from "./components/PlayerParentalOverlay";
import { PlayerSkipIndicator } from "./components/PlayerSkipIndicator";
import { PlayerSettingsOverlay } from "./components/PlayerSettingsOverlay";
import { PlayerVodOverlayLayer } from "./components/PlayerVodOverlayLayer";
import { TrackSelectionManager } from "../../playback/trackSelectionManager";
import { useFocus } from "../../providers/useFocus";
import type { AppChannel } from "../../types/appModels";
import { logger } from "../../utils/logger";
import styles from "./Player.module.css";
import { usePlaybackLoader } from "./hooks/usePlaybackLoader";
import { usePlaybackProgress } from "./hooks/usePlaybackProgress";
import { usePlaybackRecovery } from "./hooks/usePlaybackRecovery";
import { usePlayerKeyboard } from "./hooks/usePlayerKeyboard";
import { usePlayerDiagnostics } from "./hooks/usePlayerDiagnostics";
import { usePlaybackControls } from "./hooks/usePlaybackControls";
import { usePlayerUiLifecycle } from "./hooks/usePlayerUiLifecycle";
import { useBrowserVideoHandlers } from "./hooks/useBrowserVideoHandlers";
import { usePlayerFocusScope } from "./hooks/usePlayerFocusScope";
import { usePlayerRootClasses } from "./hooks/usePlayerRootClasses";
import { formatClockTime, formatSeconds } from "./utils/playerFormatters";

interface PlayerProps {
  onBack: () => void;
}

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
  const [snapshot, setSnapshot] = useState<PlayerStateSnapshot>({ state: "IDLE" });
  const [error, setError] = useState<string | null>(null);
  const [parentalError, setParentalError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isEpgPeekActive, setIsEpgPeekActive] = useState(false);
  const [lastActivity, setLastActivity] = useState(0);
  const [skipIntroDismissed, setSkipIntroDismissed] = useState(false);
  const [upNextDismissed, setUpNextDismissed] = useState(false);
  const [zappingChannel, setZappingChannel] = useState<AppChannel | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const avPlayerSurfaceRef = useRef<HTMLDivElement>(null);
  const didAutoPlayNextRef = useRef(false);
  const settingsVisibleRef = useRef(false);
  const controlsVisibleRef = useRef(true);
  const didHandleExitRef = useRef(false);
  const isBrowserMode = useMemo(() => !avplayAdapter.isAvailable(), []);
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

  const playbackKey = activePlaybackItem
    ? `${activePlaybackItem.contentType}:${activePlaybackItem.seriesId || "single"}:${activePlaybackItem.id}`
    : "none";
  const {
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
  } = usePlaybackProgress({
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
  });

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
  const canAutoPlayNext = Boolean(nextEpisode && !upNextDismissed);

  const {
    seekBySeconds,
    togglePlayPause,
    switchChannel,
    exitPlayer,
    playNextEpisodeNow,
  } = usePlaybackControls({
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
  });

  const getPlaybackExtensionCandidates = useCallback(
    (contentType: "live" | "vod" | "series", extension?: string): string[] => {
      return resolvePlaybackExtensionCandidates({
        contentType,
        extension,
        liveExtension,
        engine: playerEngineLabel,
      });
    },
    [liveExtension, playerEngineLabel]
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

  const {
    clearBrowserBufferingTimer,
    playBrowserStream,
    markBrowserPlaying,
    scheduleBrowserBufferingState,
    handleBrowserPause,
    handleBrowserTimeUpdate,
    handleBrowserError,
  } = useBrowserVideoHandlers({
    activePlaybackItem,
    videoRef,
    setSnapshot,
    setError,
  });

  const { retryPlayback } = usePlaybackLoader({
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
  });

  const { liveClockMs } = usePlayerUiLifecycle({
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
  });

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

  usePlaybackRecovery({
    activePlaybackItem,
    playbackKey,
    playerState,
    requiresParentalUnlock,
    settingsVisible,
    isBrowserMode,
    currentSeconds,
    durationSeconds,
    durationSecondsRef,
    readCurrentSeconds,
    retryPlayback,
  });

  usePlayerKeyboard({
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
  });

  usePlayerDiagnostics({
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
  });

  usePlayerFocusScope({
    playerState,
    error,
    setFocus,
    setFocusScope,
  });

  usePlayerRootClasses({ isBrowserMode });

  useEffect(() => {
    settingsVisibleRef.current = settingsVisible;
  }, [settingsVisible]);

  useEffect(() => {
    controlsVisibleRef.current = controlsVisible;
  }, [controlsVisible]);

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

  const handleParentalSubmit = (value: string) => {
    if (value !== parentalPin) {
      setParentalError("Incorrect PIN. Please try again.");
      return;
    }

    setParentalError(null);
    unlockParentalSession();
  };

  if (!activePlaybackItem) return null;



  const progress =
    durationSeconds > 0 ? Math.min(100, Math.max(0, (currentSeconds / durationSeconds) * 100)) : 0;

  return (
    <div className={`${styles.container} ${!isBrowserMode ? styles.avplayContainer : ""}`.trim()}>
      <PlayerSurface
        isBrowserMode={isBrowserMode}
        videoRef={videoRef}
        avPlayerSurfaceRef={avPlayerSurfaceRef}
        onLoadedMetadata={handleBrowserLoadedMetadata}
        onPlay={markBrowserPlaying}
        onPlaying={markBrowserPlaying}
        onCanPlay={markBrowserPlaying}
        onWaiting={scheduleBrowserBufferingState}
        onPause={handleBrowserPause}
        onTimeUpdate={handleBrowserTimeUpdate}
        onError={handleBrowserError}
      />

      {(playerState === "LOADING" || playerState === "BUFFERING") && !requiresParentalUnlock && (
        <PlayerLoadingOverlay playerState={playerState} />
      )}

      {(playerState === "ERROR" || error) && !requiresParentalUnlock && (
        <PlayerErrorOverlay
          message={
            error ||
            snapshot.errorMessage ||
            "This stream is currently unavailable. Please try another channel."
          }
          onRetry={retryPlayback}
          onBack={onBack}
        />
      )}

      {requiresParentalUnlock && (
        <PlayerParentalOverlay
          activePlaybackItem={activePlaybackItem}
          parentalError={parentalError}
          onChange={() => {
            if (parentalError) setParentalError(null);
          }}
          onSubmit={handleParentalSubmit}
          onClose={onBack}
        />
      )}

      {!requiresParentalUnlock && (
        <>
          {isLive ? (
            <PlayerLiveOverlayLayer
              isVisible={controlsVisible || isEpgPeekActive || Boolean(zappingChannel)}
              controlsVisible={controlsVisible}
              channel={activePlaybackItem}
              isPlaying={isPlaying}
              playerState={playerState}
              currentProgram={currentProgram}
              nextProgram={nextProgram}
              liveClockLabel={liveClockLabel}
              liveChannelLabel={liveChannelLabel}
              zappingChannel={zappingChannel}
              onPlayPause={togglePlayPause}
              onBack={exitPlayer}
              onSettingsClick={() => setSettingsVisible(true)}
            />
          ) : (
            <PlayerVodOverlayLayer
              shouldShowSkipIntro={shouldShowSkipIntro}
              shouldShowUpNext={shouldShowUpNext}
              controlsVisible={controlsVisible}
              title={activePlaybackItem.title}
              isPlaying={isPlaying}
              progress={progress}
              currentTimeLabel={formatSeconds(currentSeconds)}
              durationLabel={formatSeconds(durationSeconds)}
              seasonNumber={activePlaybackItem.metadata?.seasonNumber}
              episodeNumber={activePlaybackItem.metadata?.episodeNumber}
              nextEpisode={nextEpisode}
              upNextCountdown={upNextCountdown}
              isBrowserMode={isBrowserMode}
              trackSelectionManager={trackSelectionManager}
              onSkipIntro={() => {
                seekBySeconds(85);
                setSkipIntroDismissed(true);
              }}
              onPlayNow={playNextEpisodeNow}
              onCancelUpNext={() => setUpNextDismissed(true)}
              onPlayPause={togglePlayPause}
              onBack={exitPlayer}
              onSettingsClick={() => {
                setSettingsVisible(true);
                setControlsVisible(true);
              }}
              onSeekBackward={() => seekBySeconds(-10)}
              onSeekForward={() => seekBySeconds(10)}
            />
          )}

          {settingsVisible ? (
            <PlayerSettingsOverlay
              isVisible
              onClose={() => setSettingsVisible(false)}
              trackSelectionManager={isBrowserMode ? null : trackSelectionManager}
            />
          ) : null}

          {skipIndicator && <PlayerSkipIndicator skipIndicator={skipIndicator} />}
        </>
      )}
    </div>
  );
};
