import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_STALL_RECOVERY_ATTEMPTS,
  STALL_RECOVERY_THRESHOLD_MS,
} from "../../../playback/playbackPolicy";
import { logger } from "../../../utils/logger";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import { usePlaybackRecovery } from "../hooks/usePlaybackRecovery";

const activePlaybackItem: ActivePlaybackItem = {
  id: "movie-1",
  title: "Movie 1",
  contentType: "vod",
};

type RecoveryProps = Parameters<typeof usePlaybackRecovery>[0];

const createProps = (overrides: Partial<RecoveryProps> = {}): RecoveryProps => ({
  activePlaybackItem,
  playbackKey: "vod:single:movie-1",
  playerState: "PLAYING",
  requiresParentalUnlock: false,
  settingsVisible: false,
  isBrowserMode: false,
  currentSeconds: 10,
  durationSeconds: 120,
  durationSecondsRef: { current: 120 },
  readCurrentSeconds: () => 10,
  retryPlayback: vi.fn(),
  ...overrides,
});

describe("usePlaybackRecovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T00:00:00.000Z"));
    vi.spyOn(logger, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries stalled AVPlay playback after the configured threshold", () => {
    let currentSeconds = 10;
    const retryPlayback = vi.fn();

    const { rerender } = renderHook(
      (props: RecoveryProps) => usePlaybackRecovery(props),
      {
        initialProps: createProps({
          currentSeconds,
          readCurrentSeconds: () => currentSeconds,
          retryPlayback,
        }),
      }
    );

    vi.setSystemTime(new Date("2026-06-05T00:00:01.000Z"));
    rerender(
      createProps({
        currentSeconds,
        readCurrentSeconds: () => currentSeconds,
        retryPlayback,
      })
    );

    expect(retryPlayback).not.toHaveBeenCalled();

    vi.setSystemTime(
      new Date(1_780_617_600_000 + 1_000 + STALL_RECOVERY_THRESHOLD_MS + 1)
    );
    rerender(
      createProps({
        currentSeconds,
        readCurrentSeconds: () => currentSeconds,
        retryPlayback,
      })
    );

    expect(retryPlayback).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Playback stall detected, attempting auto-recovery",
      expect.objectContaining({
        key: "vod:single:movie-1",
        state: "PLAYING",
        seconds: 10,
      })
    );
  });

  it("does not retry when playback is already near the end", () => {
    let currentSeconds = 118;
    const retryPlayback = vi.fn();

    const { rerender } = renderHook(
      (props: RecoveryProps) => usePlaybackRecovery(props),
      {
        initialProps: createProps({
          currentSeconds,
          durationSeconds: 120,
          durationSecondsRef: { current: 120 },
          readCurrentSeconds: () => currentSeconds,
          retryPlayback,
        }),
      }
    );

    vi.setSystemTime(new Date("2026-06-05T00:00:01.000Z"));
    rerender(
      createProps({
        currentSeconds,
        durationSeconds: 120,
        durationSecondsRef: { current: 120 },
        readCurrentSeconds: () => currentSeconds,
        retryPlayback,
      })
    );

    vi.setSystemTime(
      new Date(1_780_617_600_000 + 1_000 + STALL_RECOVERY_THRESHOLD_MS + 1)
    );
    rerender(
      createProps({
        currentSeconds,
        durationSeconds: 120,
        durationSecondsRef: { current: 120 },
        readCurrentSeconds: () => currentSeconds,
        retryPlayback,
      })
    );

    expect(retryPlayback).not.toHaveBeenCalled();
  });

  it("does not retry while browser mode or settings overlay is active", () => {
    let currentSeconds = 10;
    const retryPlayback = vi.fn();

    const { rerender } = renderHook(
      (props: RecoveryProps) => usePlaybackRecovery(props),
      {
        initialProps: createProps({
          currentSeconds,
          readCurrentSeconds: () => currentSeconds,
          retryPlayback,
          isBrowserMode: true,
        }),
      }
    );

    vi.setSystemTime(new Date("2026-06-05T00:00:10.000Z"));
    rerender(
      createProps({
        currentSeconds,
        readCurrentSeconds: () => currentSeconds,
        retryPlayback,
        isBrowserMode: true,
      })
    );

    rerender(
      createProps({
        currentSeconds,
        readCurrentSeconds: () => currentSeconds,
        retryPlayback,
        isBrowserMode: false,
        settingsVisible: true,
      })
    );

    expect(retryPlayback).not.toHaveBeenCalled();
  });

  it("stops auto-retrying after the configured maximum for the same playback key", () => {
    let currentSeconds = 10;
    const retryPlayback = vi.fn();
    const baseTimeMs = Date.parse("2026-06-05T00:00:00.000Z");

    const { rerender } = renderHook(
      (props: RecoveryProps) => usePlaybackRecovery(props),
      {
        initialProps: createProps({
          currentSeconds,
          readCurrentSeconds: () => currentSeconds,
          retryPlayback,
        }),
      }
    );

    const triggerStallCycle = (resumePositionSeconds: number, cycleIndex: number) => {
      const itemForCycle = {
        ...activePlaybackItem,
        resumePositionSeconds,
      };

      rerender(
        createProps({
          activePlaybackItem: itemForCycle,
          currentSeconds,
          readCurrentSeconds: () => currentSeconds,
          retryPlayback,
        })
      );

      vi.setSystemTime(new Date(baseTimeMs + cycleIndex * 20_000 + 1_000));
      rerender(
        createProps({
          activePlaybackItem: itemForCycle,
          currentSeconds,
          readCurrentSeconds: () => currentSeconds,
          retryPlayback,
        })
      );

      vi.setSystemTime(
        new Date(
          baseTimeMs +
            cycleIndex * 20_000 +
            1_000 +
            STALL_RECOVERY_THRESHOLD_MS +
            1
        )
      );
      rerender(
        createProps({
          activePlaybackItem: itemForCycle,
          currentSeconds,
          readCurrentSeconds: () => currentSeconds,
          retryPlayback,
        })
      );
    };

    triggerStallCycle(1, 0);
    triggerStallCycle(2, 1);
    triggerStallCycle(3, 2);

    expect(retryPlayback).toHaveBeenCalledTimes(MAX_STALL_RECOVERY_ATTEMPTS);
  });
});
