import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useRef, useState } from "react";
import { usePlayerUiLifecycle } from "../hooks/usePlayerUiLifecycle";
import { logger } from "../../../utils/logger";
import {
  UP_NEXT_AUTOPLAY_FALLBACK_THRESHOLD_SECONDS,
} from "../../../playback/playbackPolicy";
import type { ActivePlaybackItem } from "../../../store/playerStore";

const activePlaybackItem: ActivePlaybackItem = {
  id: "episode-1",
  title: "Episode 1",
  contentType: "series",
  seriesId: "series-1",
  nextItem: {
    id: "episode-2",
    title: "Episode 2",
    seriesId: "series-1",
  },
};

const renderPlayerUiLifecycle = (
  overrides: Partial<TestHarnessProps> = {}
) => {
  const playNextEpisodeNow = vi.fn();
  const clearBrowserBufferingTimer = vi.fn();

  const result = render(
    <TestHarness
      playNextEpisodeNow={playNextEpisodeNow}
      clearBrowserBufferingTimer={clearBrowserBufferingTimer}
      {...overrides}
    />
  );

  return {
    ...result,
    playNextEpisodeNow,
    clearBrowserBufferingTimer,
  };
};

type TestHarnessProps = {
  activePlaybackItem?: ActivePlaybackItem | null;
  isLive?: boolean;
  controlsVisible?: boolean;
  settingsVisible?: boolean;
  playerState?: string;
  lastActivity?: number;
  canAutoPlayNext?: boolean;
  shouldShowUpNext?: boolean;
  isPlaying?: boolean;
  remainingSeconds?: number;
  nextEpisode?: ActivePlaybackItem["nextItem"] | null;
  playNextEpisodeNow: () => void;
  clearBrowserBufferingTimer: () => void;
};

function TestHarness({
  activePlaybackItem: item = activePlaybackItem,
  isLive = false,
  controlsVisible = true,
  settingsVisible = false,
  playerState = "PLAYING",
  lastActivity = 0,
  canAutoPlayNext = true,
  shouldShowUpNext = true,
  isPlaying = true,
  remainingSeconds = UP_NEXT_AUTOPLAY_FALLBACK_THRESHOLD_SECONDS,
  nextEpisode = activePlaybackItem.nextItem ?? null,
  playNextEpisodeNow,
  clearBrowserBufferingTimer,
}: TestHarnessProps) {
  const [, setControlsVisible] = useState(controlsVisible);
  const [, setSettingsVisible] = useState(settingsVisible);
  const [, setSkipIntroDismissed] = useState(false);
  const [, setUpNextDismissed] = useState(false);
  const [, setIsEpgPeekActive] = useState(false);

  usePlayerUiLifecycle({
    activePlaybackItem: item,
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
    didHandleExitRef: useRef(false),
    didAutoPlayNextRef: useRef(false),
    setControlsVisible,
    setSettingsVisible,
    setSkipIntroDismissed,
    setUpNextDismissed,
    setIsEpgPeekActive,
    playNextEpisodeNow,
  });

  return null;
}

describe("usePlayerUiLifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("auto-plays the next episode when playback reaches the near-end fallback threshold", () => {
    const { playNextEpisodeNow } = renderPlayerUiLifecycle({
      playerState: "PLAYING",
      isPlaying: true,
      shouldShowUpNext: true,
      canAutoPlayNext: true,
      remainingSeconds: UP_NEXT_AUTOPLAY_FALLBACK_THRESHOLD_SECONDS,
    });

    expect(playNextEpisodeNow).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "Auto-playing next episode",
      expect.objectContaining({ reason: "near_end_fallback" })
    );
  });

  it("auto-plays the next episode when playback ends", () => {
    const { playNextEpisodeNow } = renderPlayerUiLifecycle({
      playerState: "ENDED",
      isPlaying: false,
      shouldShowUpNext: false,
      remainingSeconds: 0,
    });

    expect(playNextEpisodeNow).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "Auto-playing next episode",
      expect.objectContaining({ reason: "ended" })
    );
  });

  it("does not auto-play after the user has canceled up-next", () => {
    const { playNextEpisodeNow } = renderPlayerUiLifecycle({
      playerState: "ENDED",
      isPlaying: false,
      shouldShowUpNext: false,
      canAutoPlayNext: false,
      remainingSeconds: 0,
    });

    expect(playNextEpisodeNow).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("does not double-fire when near-end fallback happens before ENDED", () => {
    const { playNextEpisodeNow, rerender } = renderPlayerUiLifecycle({
      playerState: "PLAYING",
      isPlaying: true,
      shouldShowUpNext: true,
      canAutoPlayNext: true,
      remainingSeconds: UP_NEXT_AUTOPLAY_FALLBACK_THRESHOLD_SECONDS,
    });

    expect(playNextEpisodeNow).toHaveBeenCalledTimes(1);

    rerender(
      <TestHarness
        playNextEpisodeNow={playNextEpisodeNow}
        clearBrowserBufferingTimer={() => {}}
        playerState="ENDED"
        isPlaying={false}
        shouldShowUpNext={false}
        canAutoPlayNext={true}
        remainingSeconds={0}
      />
    );

    expect(playNextEpisodeNow).toHaveBeenCalledTimes(1);
  });
});
