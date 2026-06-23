import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { services } from "../../services";
import { homeSnapshotStorage } from "../../storage/homeSnapshotStorage";
import { localStorageService } from "../../storage/localStorageService";
import { playlistStorage } from "../../storage/playlistStorage";
import { useProfileStore } from "../../store/profileStore";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import {
  getDeferredFullHomeSnapshotRefreshDelayMs,
  hasFreshHomeSnapshotAvailable,
  hasFreshPersistedHomeSnapshot,
  getInitialHomeSnapshotData,
  getHomeBootstrapSnapshotQueryKey,
  getHomeSnapshotQueryKey,
  hasFreshHomeSnapshotInCache,
  preloadHomeSnapshot,
  resetHomeSnapshotRuntimeState,
  shouldDeferFullHomeSnapshotRefresh,
  useHomeSnapshot,
} from "./useHomeSnapshot";

describe("preloadHomeSnapshot", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    localStorageService.clear();
    document.documentElement.classList.remove("perf-reduced");
    playlistStorage.setActivePlaylistId("playlist-1");
    imageFailureMemory.clear();
    resetHomeSnapshotRuntimeState();
    useProfileStore.setState({
      activeProfile: {
        id: "profile-1",
        name: "Primary",
        avatarColor: "#E50914",
        avatarIcon: "smile",
        isKids: false,
      },
    });
    vi.spyOn(services.analytics, "getTrendingIds").mockResolvedValue([]);
    vi.spyOn(services.analytics, "getSmartRows").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    queryClient.clear();
    localStorageService.clear();
    document.documentElement.classList.remove("perf-reduced");
    imageFailureMemory.clear();
    resetHomeSnapshotRuntimeState();
    useProfileStore.setState({ activeProfile: null });
    vi.restoreAllMocks();
  });

  it("stores bootstrap data separately so the full home query can still refresh immediately", async () => {
    vi.spyOn(services.content, "getVodCategories").mockResolvedValue([
      { id: "vod-1", name: "Action", type: "vod" },
    ]);
    vi.spyOn(services.content, "getSeriesCategories").mockResolvedValue([
      { id: "series-1", name: "Drama", type: "series" },
    ]);
    vi.spyOn(services.content, "getLiveCategories").mockResolvedValue([
      { id: "live-1", name: "News", type: "live" },
    ]);
    const getVodStreamsSpy = vi.spyOn(services.content, "getVodStreams").mockResolvedValue([
      { id: "movie-1", title: "Movie 1", categoryId: "vod-1" },
    ]);
    const getSeriesSpy = vi.spyOn(services.content, "getSeries").mockResolvedValue([
      { id: "series-item-1", title: "Series 1", categoryId: "series-1" },
    ]);
    const getLiveStreamsSpy = vi.spyOn(services.content, "getLiveStreams").mockResolvedValue([
      { id: "channel-1", title: "Channel 1", categoryId: "live-1", streamType: "live" },
    ]);

    const snapshot = await preloadHomeSnapshot(queryClient, "playlist-1", "profile-1");
    localStorageService.flushPending();

    expect(snapshot?.completeness).toBe("bootstrap");
    expect(
      queryClient.getQueryData(getHomeBootstrapSnapshotQueryKey("playlist-1", "profile-1"))
    ).toEqual(snapshot);
    expect(
      queryClient.getQueryData(getHomeSnapshotQueryKey("playlist-1", "profile-1"))
    ).toBeUndefined();
    expect(
      hasFreshHomeSnapshotInCache(queryClient, "playlist-1", "profile-1")
    ).toBe(false);
    expect(
      homeSnapshotStorage.getSnapshot("playlist-1", "profile-1")?.completeness
    ).toBe("bootstrap");
    expect(getVodStreamsSpy).toHaveBeenCalledWith("vod-1", {
      limit: 14,
      page: 1,
      requestSource: "home_bootstrap_content",
    });
    expect(getSeriesSpy).toHaveBeenCalledWith("series-1", {
      limit: 14,
      page: 1,
      requestSource: "home_bootstrap_content",
    });
    expect(getLiveStreamsSpy).toHaveBeenCalledWith("live-1", {
      limit: 14,
      page: 1,
      requestSource: "home_bootstrap_content",
    });
  });

  it("defers analytics-backed home inputs during bootstrap fetches", async () => {
    vi.mocked(services.analytics.getTrendingIds).mockResolvedValue(["movie-1"]);
    vi.mocked(services.analytics.getSmartRows).mockResolvedValue([
      {
        title: "Recommended For You",
        items: [{ id: "smart-1", title: "Smart 1", posterUrl: "https://cdn.example.com/smart-1.jpg" }],
      },
    ]);
    vi.spyOn(services.content, "getVodCategories").mockResolvedValue([
      { id: "vod-1", name: "Action", type: "vod" },
    ]);
    vi.spyOn(services.content, "getSeriesCategories").mockResolvedValue([]);
    vi.spyOn(services.content, "getLiveCategories").mockResolvedValue([]);
    vi.spyOn(services.content, "getVodStreams").mockResolvedValue([
      { id: "movie-1", title: "Movie 1", categoryId: "vod-1", posterUrl: "https://cdn.example.com/movie-1.jpg" },
    ]);

    const snapshot = await preloadHomeSnapshot(queryClient, "playlist-1", "profile-1");

    expect(snapshot?.trendingIds).toEqual([]);
    expect(snapshot?.smartRows).toEqual([]);
    expect(services.analytics.getTrendingIds).not.toHaveBeenCalled();
  });

  it("uses a low-tier bootstrap fetch policy when the adaptive reduced profile is active", async () => {
    document.documentElement.classList.add("perf-reduced");

    vi.spyOn(services.content, "getVodCategories").mockResolvedValue([
      { id: "vod-1", name: "Action", type: "vod" },
      { id: "vod-2", name: "Drama", type: "vod" },
    ]);
    vi.spyOn(services.content, "getSeriesCategories").mockResolvedValue([
      { id: "series-1", name: "Drama", type: "series" },
      { id: "series-2", name: "Comedy", type: "series" },
    ]);
    vi.spyOn(services.content, "getLiveCategories").mockResolvedValue([
      { id: "live-1", name: "News", type: "live" },
      { id: "live-2", name: "Sports", type: "live" },
    ]);
    const getVodStreamsSpy = vi.spyOn(services.content, "getVodStreams").mockResolvedValue([
      { id: "movie-1", title: "Movie 1", categoryId: "vod-1" },
    ]);
    const getSeriesSpy = vi.spyOn(services.content, "getSeries").mockResolvedValue([
      { id: "series-item-1", title: "Series 1", categoryId: "series-1" },
    ]);
    const getLiveStreamsSpy = vi.spyOn(services.content, "getLiveStreams").mockResolvedValue([
      { id: "channel-1", title: "Channel 1", categoryId: "live-1", streamType: "live" },
    ]);

    await preloadHomeSnapshot(queryClient, "playlist-1", "profile-1");

    expect(getVodStreamsSpy).toHaveBeenCalledTimes(1);
    expect(getSeriesSpy).toHaveBeenCalledTimes(1);
    expect(getLiveStreamsSpy).toHaveBeenCalledTimes(1);
    expect(getVodStreamsSpy).toHaveBeenCalledWith("vod-1", {
      limit: 12,
      page: 1,
      requestSource: "home_bootstrap_content",
    });
    expect(getSeriesSpy).toHaveBeenCalledWith("series-1", {
      limit: 12,
      page: 1,
      requestSource: "home_bootstrap_content",
    });
    expect(getLiveStreamsSpy).toHaveBeenCalledWith("live-1", {
      limit: 12,
      page: 1,
      requestSource: "home_bootstrap_content",
    });
  });

  it("prefers the prepared bootstrap snapshot when no full snapshot is cached yet", () => {
    const bootstrapSnapshot = {
      version: 2,
      completeness: "bootstrap" as const,
      generatedAt: "2026-06-12T00:00:00.000Z",
      movies: [{ id: "movie-1", title: "Movie 1", categoryId: "vod-1" }],
      series: [],
      liveStreams: [],
      vodCategories: [{ id: "vod-1", name: "Action", type: "vod" as const }],
      seriesCategories: [],
    };

    queryClient.setQueryData(
      getHomeBootstrapSnapshotQueryKey("playlist-1", "profile-1"),
      bootstrapSnapshot
    );

    expect(
      getInitialHomeSnapshotData({
        queryClient,
        playlistId: "playlist-1",
        profileId: "profile-1",
        persistedSnapshot: null,
      })
    ).toEqual(bootstrapSnapshot);
    expect(shouldDeferFullHomeSnapshotRefresh(bootstrapSnapshot)).toBe(true);
  });

  it("treats a fresh persisted full snapshot as available cache even when query memory is empty", () => {
    const movies = Array.from({ length: 18 }, (_, index) => ({
      id: `movie-${index + 1}`,
      title: `Movie ${index + 1}`,
      categoryId: "vod-1",
    }));

    homeSnapshotStorage.saveSnapshot("playlist-1", "profile-1", {
      completeness: "full",
      generatedAt: new Date().toISOString(),
      movies,
      series: [],
      liveStreams: [],
      vodCategories: [{ id: "vod-1", name: "Action", type: "vod" as const }],
      seriesCategories: [],
    });
    localStorageService.flushPending();

    expect(hasFreshPersistedHomeSnapshot("playlist-1", "profile-1")).toBe(true);
    expect(
      hasFreshHomeSnapshotAvailable(queryClient, "playlist-1", "profile-1")
    ).toBe(true);
  });

  it("defers the first full home refresh when bootstrap data already exists", async () => {
    const bootstrapSnapshot = {
      version: 2,
      completeness: "bootstrap" as const,
      generatedAt: "2026-06-12T00:00:00.000Z",
      movies: [
        {
          id: "movie-1",
          title: "Movie 1",
          categoryId: "vod-1",
          posterUrl: "https://cdn.example.com/movie-1.jpg",
        },
      ],
      series: [],
      liveStreams: [],
      vodCategories: [{ id: "vod-1", name: "Action", type: "vod" as const }],
      seriesCategories: [],
    };

    queryClient.setQueryData(
      getHomeBootstrapSnapshotQueryKey("playlist-1", "profile-1"),
      bootstrapSnapshot
    );

    const getVodCategoriesSpy = vi
      .spyOn(services.content, "getVodCategories")
      .mockResolvedValue([{ id: "vod-1", name: "Action", type: "vod" }]);
    vi.spyOn(services.content, "getSeriesCategories").mockResolvedValue([]);
    vi.spyOn(services.content, "getLiveCategories").mockResolvedValue([]);
    vi.spyOn(services.content, "getLiveStreams").mockResolvedValue([]);
    vi.spyOn(services.content, "getVodStreams").mockResolvedValue([
      {
        id: "movie-1",
        title: "Movie 1",
        categoryId: "vod-1",
        posterUrl: "https://cdn.example.com/movie-1.jpg",
      },
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useHomeSnapshot([]), { wrapper });

    expect(result.current.snapshot?.heroItems.length).toBeGreaterThan(0);
    expect(getVodCategoriesSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(getDeferredFullHomeSnapshotRefreshDelayMs("medium"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getVodCategoriesSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(getDeferredFullHomeSnapshotRefreshDelayMs("medium"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getVodCategoriesSpy).toHaveBeenCalledTimes(1);
  });

  it("does not re-arm the deferred full refresh when Home remounts immediately", async () => {
    const bootstrapSnapshot = {
      version: 2,
      completeness: "bootstrap" as const,
      generatedAt: "2026-06-12T00:00:00.000Z",
      movies: [
        {
          id: "movie-1",
          title: "Movie 1",
          categoryId: "vod-1",
          posterUrl: "https://cdn.example.com/movie-1.jpg",
        },
      ],
      series: [],
      liveStreams: [],
      vodCategories: [{ id: "vod-1", name: "Action", type: "vod" as const }],
      seriesCategories: [],
    };

    queryClient.setQueryData(
      getHomeBootstrapSnapshotQueryKey("playlist-1", "profile-1"),
      bootstrapSnapshot
    );

    const getVodCategoriesSpy = vi
      .spyOn(services.content, "getVodCategories")
      .mockResolvedValue([{ id: "vod-1", name: "Action", type: "vod" }]);
    vi.spyOn(services.content, "getSeriesCategories").mockResolvedValue([]);
    vi.spyOn(services.content, "getLiveCategories").mockResolvedValue([]);
    vi.spyOn(services.content, "getLiveStreams").mockResolvedValue([]);
    vi.spyOn(services.content, "getVodStreams").mockResolvedValue([
      {
        id: "movie-1",
        title: "Movie 1",
        categoryId: "vod-1",
        posterUrl: "https://cdn.example.com/movie-1.jpg",
      },
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const firstRender = renderHook(() => useHomeSnapshot([]), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(getDeferredFullHomeSnapshotRefreshDelayMs("medium"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getVodCategoriesSpy).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    renderHook(() => useHomeSnapshot([]), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(getDeferredFullHomeSnapshotRefreshDelayMs("medium"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getVodCategoriesSpy).toHaveBeenCalledTimes(1);
  });

  it("uses a more conservative deferred refresh delay on reduced-performance devices", () => {
    expect(getDeferredFullHomeSnapshotRefreshDelayMs("low")).toBe(12000);
    expect(getDeferredFullHomeSnapshotRefreshDelayMs("medium")).toBe(9000);
    expect(getDeferredFullHomeSnapshotRefreshDelayMs("high")).toBe(7000);
  });

  it("does not rebuild the home snapshot when image failure memory changes", async () => {
    const fullSnapshot = {
      version: 2,
      completeness: "full" as const,
      generatedAt: "2026-06-12T00:00:00.000Z",
      movies: [
        {
          id: "movie-1",
          title: "Movie 1",
          categoryId: "vod-1",
          posterUrl: "https://cdn.example.com/movie-1.jpg",
          backdropUrl: "https://cdn.example.com/movie-1-backdrop.jpg",
        },
      ],
      series: [],
      liveStreams: [],
      vodCategories: [{ id: "vod-1", name: "Action", type: "vod" as const }],
      seriesCategories: [],
    };

    queryClient.setQueryData(
      getHomeSnapshotQueryKey("playlist-1", "profile-1"),
      fullSnapshot
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useHomeSnapshot([]), { wrapper });
    const initialSnapshot = result.current.snapshot;

    act(() => {
      imageFailureMemory.markFailed("https://cdn.example.com/movie-1.jpg");
    });

    expect(result.current.snapshot).toBe(initialSnapshot);
  });
});
