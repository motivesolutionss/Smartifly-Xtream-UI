import { useEffect, useRef, type MutableRefObject } from "react";
import {
  MAX_STALL_RECOVERY_ATTEMPTS,
  STALL_RECOVERY_THRESHOLD_MS,
} from "../../../playback/playbackPolicy";
import type { PlayerStateSnapshot } from "../../../playback/playerState";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import { logger } from "../../../utils/logger";

type UsePlaybackRecoveryArgs = {
  activePlaybackItem: ActivePlaybackItem | null;
  playbackKey: string;
  playerState: PlayerStateSnapshot["state"];
  requiresParentalUnlock: boolean;
  settingsVisible: boolean;
  isBrowserMode: boolean;
  currentSeconds: number;
  durationSeconds: number;
  durationSecondsRef: MutableRefObject<number>;
  readCurrentSeconds: () => number;
  retryPlayback: () => void;
};

export const usePlaybackRecovery = ({
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
}: UsePlaybackRecoveryArgs) => {
  const stallRetryAttemptsRef = useRef<Record<string, number>>({});
  const lastProgressSecondRef = useRef(0);
  const stallSinceMsRef = useRef<number | null>(null);
  const isAutoRecoveringRef = useRef(false);

  useEffect(() => {
    isAutoRecoveringRef.current = false;
    lastProgressSecondRef.current = 0;
    stallSinceMsRef.current = null;
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
    const seconds = readCurrentSeconds();
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
      effectiveDurationSeconds > 0 && effectiveDurationSeconds - Math.max(0, seconds) <= 3;
    if (nearEnd) return;

    if (!stallSinceMsRef.current) {
      stallSinceMsRef.current = now;
      return;
    }

    const stalledForMs = now - stallSinceMsRef.current;
    if (stalledForMs < STALL_RECOVERY_THRESHOLD_MS || isAutoRecoveringRef.current) return;

    const attempts = stallRetryAttemptsRef.current[playbackKey] || 0;
    if (attempts >= MAX_STALL_RECOVERY_ATTEMPTS) return;

    stallRetryAttemptsRef.current[playbackKey] = attempts + 1;
    isAutoRecoveringRef.current = true;
    logger.warn("Playback stall detected, attempting auto-recovery", {
      key: playbackKey,
      stalledForMs,
      state: playerState,
      seconds,
    });
    retryPlayback();
  }, [
    activePlaybackItem,
    currentSeconds,
    durationSeconds,
    durationSecondsRef,
    isBrowserMode,
    playbackKey,
    playerState,
    readCurrentSeconds,
    requiresParentalUnlock,
    retryPlayback,
    settingsVisible,
  ]);
};
