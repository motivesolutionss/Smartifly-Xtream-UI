import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerStateSnapshot } from "../../../playback/playerState";
import { services } from "../../../services";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import type { AppChannel } from "../../../types/appModels";
import { usePlaybackControls } from "../hooks/usePlaybackControls";

const liveChannels: AppChannel[] = [
  { id: "live-1", title: "Channel 1", logoUrl: "logo-1", streamType: "live" },
  { id: "live-2", title: "Channel 2", logoUrl: "logo-2", streamType: "live" },
  { id: "live-3", title: "Channel 3", logoUrl: "logo-3", streamType: "live" },
];

const livePlaybackItem: ActivePlaybackItem = {
  id: "live-1",
  title: "Channel 1",
  logoUrl: "logo-1",
  contentType: "live",
};

const seriesPlaybackItem: ActivePlaybackItem = {
  id: "episode-1",
  title: "Episode 1",
  contentType: "series",
  seriesId: "series-1",
};

type ControlsArgs = Parameters<typeof usePlaybackControls>[0];

const createController = () => ({
  getState: vi.fn(() => "PLAYING"),
  pause: vi.fn(),
  resume: vi.fn(),
  release: vi.fn(),
});

const createArgs = (overrides: Partial<ControlsArgs> = {}): ControlsArgs => ({
  activePlaybackItem: livePlaybackItem,
  nextEpisode: null,
  liveChannels,
  isBrowserMode: false,
  controlsVisibleRef: { current: true },
  didHandleExitRef: { current: false },
  didAutoPlayNextRef: { current: false },
  videoRef: { current: document.createElement("video") },
  controller: createController() as never,
  onBack: vi.fn(),
  setSnapshot: vi.fn() as React.Dispatch<React.SetStateAction<PlayerStateSnapshot>>,
  setCurrentSeconds: vi.fn(),
  setSkipIndicator: vi.fn(),
  setZappingChannel: vi.fn(),
  setError: vi.fn(),
  setUpNextDismissed: vi.fn(),
  setActivePlaybackItem: vi.fn(),
  persistPlaybackPosition: vi.fn(),
  readCurrentSeconds: vi.fn(() => 0),
  saveSnapshotBeforeExit: vi.fn(),
  ...overrides,
});

describe("usePlaybackControls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00.000Z"));
    vi.spyOn(services.userData, "saveRecentlyWatched").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("hands off to the next episode and marks auto-play state", () => {
    const setUpNextDismissed = vi.fn();
    const setActivePlaybackItem = vi.fn();
    const didAutoPlayNextRef = { current: false };
    const nextEpisode = {
      id: "episode-2",
      title: "Episode 2",
      seriesId: "series-1",
      logoUrl: "logo-2",
      backdropUrl: "backdrop-2",
      extension: "mp4",
      seasonNumber: 1,
      episodeNumber: 2,
      nextItem: {
        id: "episode-3",
        title: "Episode 3",
      },
    };

    const { result } = renderHook(() =>
      usePlaybackControls(
        createArgs({
          activePlaybackItem: seriesPlaybackItem,
          nextEpisode,
          liveChannels: [],
          setUpNextDismissed,
          setActivePlaybackItem,
          didAutoPlayNextRef,
        })
      )
    );

    act(() => {
      result.current.playNextEpisodeNow();
    });

    expect(setUpNextDismissed).toHaveBeenCalledWith(true);
    expect(didAutoPlayNextRef.current).toBe(true);
    expect(setActivePlaybackItem).toHaveBeenCalledWith({
      id: "episode-2",
      seriesId: "series-1",
      title: "Episode 2",
      logoUrl: "logo-2",
      backdropUrl: "backdrop-2",
      contentType: "series",
      extension: "mp4",
      metadata: {
        seasonNumber: 1,
        episodeNumber: 2,
      },
      nextItem: nextEpisode.nextItem,
    });
  });

  it("switches to the next live channel, shows the zapping overlay, and persists recently watched", () => {
    const setZappingChannel = vi.fn();
    const setError = vi.fn();
    const setActivePlaybackItem = vi.fn();

    const { result } = renderHook(() =>
      usePlaybackControls(
        createArgs({
          activePlaybackItem: livePlaybackItem,
          setZappingChannel,
          setError,
          setActivePlaybackItem,
        })
      )
    );

    act(() => {
      result.current.switchChannel(1);
    });

    expect(setZappingChannel).toHaveBeenNthCalledWith(1, liveChannels[1]);
    expect(setError).toHaveBeenCalledWith(null);
    expect(setActivePlaybackItem).toHaveBeenCalledWith(liveChannels[1]);
    expect(services.userData.saveRecentlyWatched).toHaveBeenCalledWith({
      id: "live-2",
      type: "live",
      title: "Channel 2",
      imageUrl: "logo-2",
      watchedAt: "2026-06-05T12:00:00.000Z",
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(setZappingChannel).toHaveBeenLastCalledWith(null);
  });

  it("wraps around when switching backward from the first live channel", () => {
    const setActivePlaybackItem = vi.fn();

    const { result } = renderHook(() =>
      usePlaybackControls(
        createArgs({
          activePlaybackItem: livePlaybackItem,
          setActivePlaybackItem,
        })
      )
    );

    act(() => {
      result.current.switchChannel(-1);
    });

    expect(setActivePlaybackItem).toHaveBeenCalledWith(liveChannels[2]);
  });

  it("ignores rapid repeat zaps within the cooldown window", () => {
    const setActivePlaybackItem = vi.fn();

    const { result } = renderHook(() =>
      usePlaybackControls(
        createArgs({
          activePlaybackItem: livePlaybackItem,
          setActivePlaybackItem,
        })
      )
    );

    act(() => {
      result.current.switchChannel(1);
    });

    expect(setActivePlaybackItem).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-06-05T12:00:00.200Z"));

    act(() => {
      result.current.switchChannel(1);
    });

    expect(setActivePlaybackItem).toHaveBeenCalledTimes(1);
  });
});
