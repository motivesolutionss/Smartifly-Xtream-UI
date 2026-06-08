import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserPlaybackAdapter } from "../../../playback/browserPlaybackAdapter";
import { getBrowserBufferingDelayMs } from "../../../playback/playbackPolicy";
import type { PlayerStateSnapshot } from "../../../playback/playerState";
import { logger } from "../../../utils/logger";
import { useBrowserVideoHandlers } from "../hooks/useBrowserVideoHandlers";

const makeVideoElement = () => document.createElement("video");

const defineReadonly = <T,>(target: object, key: string, value: T) => {
  Object.defineProperty(target, key, {
    value,
    configurable: true,
  });
};

const createSnapshotHarness = (initialState: PlayerStateSnapshot = { state: "LOADING" }) => {
  let snapshot = initialState;
  let error: string | null = null;

  const setSnapshot = (update: React.SetStateAction<PlayerStateSnapshot>) => {
    snapshot = typeof update === "function" ? update(snapshot) : update;
  };

  const setError = (update: React.SetStateAction<string | null>) => {
    error = typeof update === "function" ? update(error) : update;
  };

  return {
    getSnapshot: () => snapshot,
    getError: () => error,
    setSnapshot,
    setError,
  };
};

describe("useBrowserVideoHandlers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("enters BUFFERING after the browser buffering delay", () => {
    const state = createSnapshotHarness({ state: "PLAYING" });
    const videoRef = { current: makeVideoElement() };

    const { result } = renderHook(() =>
      useBrowserVideoHandlers({
        activePlaybackItem: { id: "vod-1", title: "Movie", contentType: "vod" },
        videoRef,
        setSnapshot: state.setSnapshot,
        setError: state.setError,
      })
    );

    act(() => {
      result.current.scheduleBrowserBufferingState();
    });

    expect(state.getSnapshot().state).toBe("PLAYING");

    act(() => {
      vi.advanceTimersByTime(getBrowserBufferingDelayMs("vod"));
    });

    expect(state.getSnapshot()).toEqual({ state: "BUFFERING" });
  });

  it("promotes LOADING or BUFFERING to PLAYING when time starts advancing", () => {
    const state = createSnapshotHarness({ state: "BUFFERING" });

    const { result } = renderHook(() =>
      useBrowserVideoHandlers({
        activePlaybackItem: { id: "vod-1", title: "Movie", contentType: "vod" },
        videoRef: { current: makeVideoElement() },
        setSnapshot: state.setSnapshot,
        setError: state.setError,
      })
    );

    act(() => {
      result.current.handleBrowserTimeUpdate({
        currentTarget: { currentTime: 12 } as HTMLVideoElement,
      } as React.SyntheticEvent<HTMLVideoElement>);
    });

    expect(state.getSnapshot()).toEqual({ state: "PLAYING" });
  });

  it("ignores non-fatal browser errors during active playback", () => {
    vi.spyOn(logger, "warn").mockImplementation(() => {});
    const resetSpy = vi.spyOn(browserPlaybackAdapter, "reset").mockImplementation(() => {});
    const state = createSnapshotHarness({ state: "PLAYING" });
    const video = makeVideoElement();
    defineReadonly(video, "paused", false);
    defineReadonly(video, "ended", false);
    defineReadonly(video, "readyState", 2);
    defineReadonly(video, "error", { code: MediaError.MEDIA_ERR_NETWORK });

    const { result } = renderHook(() =>
      useBrowserVideoHandlers({
        activePlaybackItem: { id: "vod-1", title: "Movie", contentType: "vod" },
        videoRef: { current: video },
        setSnapshot: state.setSnapshot,
        setError: state.setError,
      })
    );

    act(() => {
      result.current.handleBrowserError();
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "Ignoring non-fatal browser video error during active playback",
      expect.objectContaining({ code: MediaError.MEDIA_ERR_NETWORK })
    );
    expect(resetSpy).not.toHaveBeenCalled();
    expect(state.getError()).toBeNull();
    expect(state.getSnapshot()).toEqual({ state: "PLAYING" });
  });

  it("maps fatal browser errors into player error state", () => {
    const resetSpy = vi.spyOn(browserPlaybackAdapter, "reset").mockImplementation(() => {});
    const state = createSnapshotHarness({ state: "PLAYING" });
    const video = makeVideoElement();
    defineReadonly(video, "paused", true);
    defineReadonly(video, "ended", false);
    defineReadonly(video, "readyState", 0);
    defineReadonly(video, "error", { code: MediaError.MEDIA_ERR_NETWORK });

    const { result } = renderHook(() =>
      useBrowserVideoHandlers({
        activePlaybackItem: { id: "vod-1", title: "Movie", contentType: "vod" },
        videoRef: { current: video },
        setSnapshot: state.setSnapshot,
        setError: state.setError,
      })
    );

    act(() => {
      result.current.handleBrowserError();
    });

    expect(resetSpy).toHaveBeenCalledWith(video);
    expect(state.getError()).toBe("Unable to reach the stream server. Please try another stream.");
    expect(state.getSnapshot()).toEqual({
      state: "ERROR",
      errorMessage: "Unable to reach the stream server. Please try another stream.",
    });
  });
});
