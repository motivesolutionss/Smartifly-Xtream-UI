import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MIN_RESUME_PERSIST_SECONDS,
  PROGRESS_PERSIST_INTERVAL_MS,
} from "../../../playback/playbackPolicy";
import type { PlayerController } from "../../../playback/playerController";
import { services } from "../../../services";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import { usePlaybackProgress } from "../hooks/usePlaybackProgress";

const activePlaybackItem: ActivePlaybackItem = {
  id: "movie-1",
  title: "Movie 1",
  contentType: "vod",
  logoUrl: "https://example.com/poster.jpg",
};

type ProgressHookArgs = Parameters<typeof usePlaybackProgress>[0];

const createController = (): PlayerController =>
  ({
    subscribeCurrentTime: () => () => {},
  } as unknown as PlayerController);

const createArgs = (overrides: Partial<ProgressHookArgs> = {}): ProgressHookArgs => ({
  activePlaybackItem,
  playbackKey: "vod:single:movie-1",
  isBrowserMode: true,
  isLive: false,
  controlsVisible: false,
  settingsVisible: false,
  controlsVisibleRef: { current: false },
  settingsVisibleRef: { current: false },
  controller: createController(),
  videoRef: { current: null },
  setSnapshot: vi.fn(),
  measurePlayerWork: (_metric, _data, fn) => fn(),
  ...overrides,
});

describe("usePlaybackProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
    vi.spyOn(services.userData, "saveRecentlyWatched").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("persists VOD progress every 15 seconds when playback advanced by at least 10 seconds", () => {
    let currentTime = MIN_RESUME_PERSIST_SECONDS + 1;
    let duration = 120;
    const video = {
      currentTime,
      duration,
    } as HTMLVideoElement;

    renderHook(() =>
      usePlaybackProgress(
        createArgs({
          videoRef: { current: video },
        })
      )
    );

    act(() => {
      vi.advanceTimersByTime(PROGRESS_PERSIST_INTERVAL_MS);
    });

    expect(services.userData.saveRecentlyWatched).toHaveBeenCalledTimes(1);
    expect(services.userData.saveRecentlyWatched).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "movie-1",
        type: "vod",
        positionSeconds: Math.floor(currentTime),
        durationSeconds: duration,
      })
    );

    currentTime += 9;
    video.currentTime = currentTime;
    act(() => {
      vi.advanceTimersByTime(PROGRESS_PERSIST_INTERVAL_MS);
    });

    expect(services.userData.saveRecentlyWatched).toHaveBeenCalledTimes(1);

    currentTime += 2;
    video.currentTime = currentTime;
    act(() => {
      vi.advanceTimersByTime(PROGRESS_PERSIST_INTERVAL_MS);
    });

    expect(services.userData.saveRecentlyWatched).toHaveBeenCalledTimes(2);
    expect(services.userData.saveRecentlyWatched).toHaveBeenLastCalledWith(
      expect.objectContaining({
        positionSeconds: Math.floor(currentTime),
      })
    );
  });

  it("never persists progress for live playback", () => {
    const liveItem: ActivePlaybackItem = {
      id: "live-1",
      title: "Live Channel",
      contentType: "live",
    };
    const video = {
      currentTime: 120,
      duration: Infinity,
    } as HTMLVideoElement;

    renderHook(() =>
      usePlaybackProgress(
        createArgs({
          activePlaybackItem: liveItem,
          isLive: true,
          videoRef: { current: video },
        })
      )
    );

    act(() => {
      vi.advanceTimersByTime(PROGRESS_PERSIST_INTERVAL_MS * 2);
    });

    expect(services.userData.saveRecentlyWatched).not.toHaveBeenCalled();
  });

  it("force-saves the latest position on exit even before the next interval", () => {
    const video = {
      currentTime: MIN_RESUME_PERSIST_SECONDS + 4,
      duration: 95,
    } as HTMLVideoElement;

    const { result } = renderHook(() =>
      usePlaybackProgress(
        createArgs({
          videoRef: { current: video },
        })
      )
    );

    act(() => {
      result.current.saveSnapshotBeforeExit();
    });

    expect(services.userData.saveRecentlyWatched).toHaveBeenCalledTimes(1);
    expect(services.userData.saveRecentlyWatched).toHaveBeenLastCalledWith(
      expect.objectContaining({
        positionSeconds: Math.floor(video.currentTime),
        durationSeconds: Math.floor(video.duration),
      })
    );
  });
});
