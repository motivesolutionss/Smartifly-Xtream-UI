import { afterEach, describe, expect, it, vi } from "vitest";
import { services } from "../../services";
import { syncSearchCatalog } from "./searchCatalogService";
import type { PersistedSearchCatalog } from "./searchCatalogTypes";

describe("syncSearchCatalog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves an existing full seed when a sync is paused immediately", async () => {
    const seedCatalog: PersistedSearchCatalog = {
      completeness: "full",
      generatedAt: "2026-06-12T00:00:00.000Z",
      live: [{ id: "live-1", title: "Live 1", titleLower: "live 1", type: "live" }],
      vod: [{ id: "vod-1", title: "Vod 1", titleLower: "vod 1", type: "vod" }],
      series: [{ id: "series-1", title: "Series 1", titleLower: "series 1", type: "series" }],
      categories: { live: [], vod: [], series: [] },
      syncMeta: {},
      fetchedCategoryIds: { live: [], vod: [], series: [] },
    };

    await expect(
      syncSearchCatalog({
        seedCatalog,
        shouldPause: () => true,
        mode: "warm",
      })
    ).resolves.toEqual(seedCatalog);
  });

  it("uses bounded per-category fetch sizes during warm sync", async () => {
    vi.spyOn(services.content, "getLiveCategories").mockResolvedValue([
      { id: "live-a", name: "Live A", type: "live" },
    ]);
    vi.spyOn(services.content, "getVodCategories").mockResolvedValue([
      { id: "vod-a", name: "Vod A", type: "vod" },
    ]);
    vi.spyOn(services.content, "getSeriesCategories").mockResolvedValue([
      { id: "series-a", name: "Series A", type: "series" },
    ]);

    const liveStreamsSpy = vi
      .spyOn(services.content, "getLiveStreams")
      .mockResolvedValue([{ id: "live-1", title: "Live 1", categoryId: "live-a", streamType: "live" }]);
    const vodStreamsSpy = vi
      .spyOn(services.content, "getVodStreams")
      .mockResolvedValue([{ id: "vod-1", title: "Vod 1", categoryId: "vod-a" }]);
    const seriesSpy = vi
      .spyOn(services.content, "getSeries")
      .mockResolvedValue([{ id: "series-1", title: "Series 1", categoryId: "series-a" }]);

    await syncSearchCatalog({ mode: "warm" });

    expect(liveStreamsSpy).toHaveBeenCalledWith("live-a", {
      limit: 12,
      page: 1,
      requestSource: "search_warm",
    });
    expect(vodStreamsSpy).toHaveBeenCalledWith("vod-a", {
      limit: 20,
      page: 1,
      requestSource: "search_warm",
    });
    expect(seriesSpy).toHaveBeenCalledWith("series-a", {
      limit: 20,
      page: 1,
      requestSource: "search_warm",
    });
  });
});
