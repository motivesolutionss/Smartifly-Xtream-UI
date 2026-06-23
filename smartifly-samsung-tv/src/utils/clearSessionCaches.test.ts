import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchCatalogSession } from "../features/search/searchCatalogSession";
import {
  isImageMarkedPreloaded,
  markImagePreloadedForTest,
} from "../hooks/useBudgetedImagePreload";
import { searchCatalogStorage } from "../features/search/searchCatalogStorage";
import { homeSnapshotStorage } from "../storage/homeSnapshotStorage";
import { recentlyWatchedStorage } from "../storage/recentlyWatchedStorage";
import { imageFailureMemory } from "./imageFailureMemory";
import { imageWarmMemory } from "./imageWarmMemory";
import { clearSessionCaches } from "./clearSessionCaches";

describe("clearSessionCaches", () => {
  beforeEach(() => {
    localStorage.clear();
    imageFailureMemory.clear();
    imageWarmMemory.clear();
    searchCatalogSession.clearAll();
    vi.restoreAllMocks();
  });

  it("clears session-bound caches and persisted search storage on sign-out without clearing watch history", async () => {
    const queryClient = new QueryClient();
    const clearHistorySpy = vi.spyOn(recentlyWatchedStorage, "clearHistory").mockImplementation(() => {});
    const clearPersistedCatalogsSpy = vi
      .spyOn(searchCatalogStorage, "clearAll")
      .mockResolvedValue(undefined);

    homeSnapshotStorage.saveSnapshot("playlist-1", "profile-1", {
      completeness: "full",
      generatedAt: "2026-06-09T00:00:00.000Z",
      movies: [],
      series: [],
      liveStreams: [],
      vodCategories: [],
      seriesCategories: [],
    });
    searchCatalogSession.saveCatalog("playlist-1", "profile-1", {
      completeness: "partial",
      generatedAt: "2026-06-09T00:00:00.000Z",
      live: [],
      vod: [],
      series: [],
      categories: {
        live: [],
        vod: [],
        series: [],
      },
      fetchedCategoryIds: {
        live: [],
        vod: [],
        series: [],
      },
    });
    imageFailureMemory.markFailed("https://example.com/bad.jpg");
    imageWarmMemory.markWarm("https://example.com/warm.jpg");
    markImagePreloadedForTest("https://example.com/preloaded.jpg");
    queryClient.setQueryData(["movie-details", 123], { title: "Cached movie" });

    await clearSessionCaches({ reason: "sign-out", queryClient });

    expect(homeSnapshotStorage.getSnapshot("playlist-1", "profile-1")).toBeNull();
    expect(searchCatalogSession.getCatalog("playlist-1", "profile-1")).toBeNull();
    expect(imageFailureMemory.hasFailed("https://example.com/bad.jpg")).toBe(false);
    expect(imageWarmMemory.hasWarm("https://example.com/warm.jpg")).toBe(false);
    expect(isImageMarkedPreloaded("https://example.com/preloaded.jpg")).toBe(false);
    expect(queryClient.getQueryData(["movie-details", 123])).toBeUndefined();
    expect(clearPersistedCatalogsSpy).toHaveBeenCalledTimes(1);
    expect(clearHistorySpy).not.toHaveBeenCalled();
  });

  it("also clears watch history and persisted search storage during a full local data clear", async () => {
    const clearHistorySpy = vi.spyOn(recentlyWatchedStorage, "clearHistory").mockImplementation(() => {});
    const clearPersistedCatalogsSpy = vi
      .spyOn(searchCatalogStorage, "clearAll")
      .mockResolvedValue(undefined);

    await clearSessionCaches({ reason: "full-local-data-clear" });

    expect(clearHistorySpy).toHaveBeenCalledTimes(1);
    expect(clearPersistedCatalogsSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps persisted per-profile search catalogs intact during a profile switch reset", async () => {
    const clearPersistedCatalogsSpy = vi
      .spyOn(searchCatalogStorage, "clearAll")
      .mockResolvedValue(undefined);

    await clearSessionCaches({ reason: "profile-switch" });

    expect(clearPersistedCatalogsSpy).not.toHaveBeenCalled();
  });
});
