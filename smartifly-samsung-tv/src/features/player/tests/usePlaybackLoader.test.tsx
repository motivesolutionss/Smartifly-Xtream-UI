import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserPlaybackAdapter } from "../../../playback/browserPlaybackAdapter";
import type { PlayerStateSnapshot } from "../../../playback/playerState";
import { playbackMetrics } from "../../../playback/playbackMetrics";
import { services } from "../../../services";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import { usePlaybackLoader } from "../hooks/usePlaybackLoader";

const activePlaybackItem: ActivePlaybackItem = {
  id: "movie-1",
  title: "Movie 1",
  contentType: "vod",
  extension: "mp4",
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const createController = () => {
  const subscribe = vi.fn((listener: (snapshot: PlayerStateSnapshot) => void) => {
    listener({ state: "IDLE" });
    return vi.fn();
  });

  return {
    subscribe,
    release: vi.fn(),
    playStream: vi.fn(),
  };
};

const createArgs = (overrides: Partial<Parameters<typeof usePlaybackLoader>[0]> = {}) => ({
  activePlaybackItem,
  playbackKey: "vod:single:movie-1",
  requiresParentalUnlock: false,
  isBrowserMode: true,
  playerEngineLabel: "browser" as const,
  controller: createController() as never,
  didHandleExitRef: { current: false },
  videoRef: { current: document.createElement("video") },
  setSnapshot: vi.fn(),
  setError: vi.fn(),
  getPlaybackExtensionCandidates: vi.fn(() => ["mp4", "mkv"]),
  getSafeResumeTarget: vi.fn(() => undefined),
  getAvPlayDisplayRect: vi.fn(() => undefined),
  playBrowserStream: vi.fn(),
  clearBrowserBufferingTimer: vi.fn(),
  commitAvplayCurrentSeconds: vi.fn(),
  ...overrides,
});

describe("usePlaybackLoader", () => {
  beforeEach(() => {
    vi.spyOn(playbackMetrics, "requested").mockImplementation(() => {});
    vi.spyOn(playbackMetrics, "extensionCandidatesResolved").mockImplementation(() => {});
    vi.spyOn(playbackMetrics, "urlResolved").mockImplementation(() => {});
    vi.spyOn(playbackMetrics, "engineSelected").mockImplementation(() => {});
    vi.spyOn(playbackMetrics, "extensionAttemptFailed").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to the next extension when the first browser startup attempt fails", async () => {
    const getPlaybackUrl = vi.spyOn(services.playback, "getPlaybackUrl");
    getPlaybackUrl
      .mockResolvedValueOnce("https://example.com/movie.mp4")
      .mockResolvedValueOnce("https://example.com/movie.mkv");

    const playBrowserStream = vi
      .fn()
      .mockRejectedValueOnce(new Error("first startup failed"))
      .mockResolvedValueOnce(undefined);

    const resetSpy = vi.spyOn(browserPlaybackAdapter, "reset").mockImplementation(() => {});

    const args = createArgs({ playBrowserStream });
    renderHook(() => usePlaybackLoader(args));

    await waitFor(() => expect(playBrowserStream).toHaveBeenCalledTimes(2));

    expect(args.getPlaybackExtensionCandidates).toHaveBeenCalledWith("vod", "mp4");
    expect(getPlaybackUrl).toHaveBeenNthCalledWith(1, {
      contentType: "vod",
      streamId: "movie-1",
      extension: "mp4",
    });
    expect(getPlaybackUrl).toHaveBeenNthCalledWith(2, {
      contentType: "vod",
      streamId: "movie-1",
      extension: "mkv",
    });
    expect(playBrowserStream).toHaveBeenNthCalledWith(1, "https://example.com/movie.mp4", "vod");
    expect(playBrowserStream).toHaveBeenNthCalledWith(2, "https://example.com/movie.mkv", "vod");
    expect(resetSpy).toHaveBeenCalledWith(args.videoRef.current);
    expect(args.setError).toHaveBeenLastCalledWith(null);
  });

  it("ignores stale async attempts after the playback item changes", async () => {
    const firstUrl = createDeferred<string>();
    const getPlaybackUrl = vi.spyOn(services.playback, "getPlaybackUrl");
    getPlaybackUrl
      .mockReturnValueOnce(firstUrl.promise)
      .mockResolvedValueOnce("https://example.com/movie-2.mp4");

    const playBrowserStream = vi.fn().mockResolvedValue(undefined);

    const firstArgs = createArgs({ playBrowserStream });
    const { rerender } = renderHook((props: Parameters<typeof usePlaybackLoader>[0]) => usePlaybackLoader(props), {
      initialProps: firstArgs,
    });

    const secondArgs = createArgs({
      playbackKey: "vod:single:movie-2",
      activePlaybackItem: {
        ...activePlaybackItem,
        id: "movie-2",
        title: "Movie 2",
      },
      playBrowserStream,
    });

    rerender(secondArgs);

    act(() => {
      firstUrl.resolve("https://example.com/movie-1.mp4");
    });

    await waitFor(() =>
      expect(playBrowserStream).toHaveBeenCalledWith("https://example.com/movie-2.mp4", "vod")
    );

    expect(playBrowserStream).toHaveBeenCalledTimes(1);
    expect(playBrowserStream).not.toHaveBeenCalledWith("https://example.com/movie-1.mp4", "vod");
  });
});
