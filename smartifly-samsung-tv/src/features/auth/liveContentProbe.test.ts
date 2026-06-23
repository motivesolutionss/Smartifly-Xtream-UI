import { describe, expect, it, vi } from "vitest";
import type { ContentService } from "../../services/interfaces/contentService";
import { ensureLiveContentAvailable } from "./liveContentProbe";

const createContentService = () => {
  return {
    getLiveCategories: vi.fn(),
    getLiveStreams: vi.fn(),
  } as unknown as Pick<ContentService, "getLiveCategories" | "getLiveStreams">;
};

describe("ensureLiveContentAvailable", () => {
  it("validates live content from the first populated sampled category", async () => {
    const contentService = createContentService();
    vi.mocked(contentService.getLiveCategories).mockResolvedValue([
      { id: "sports", name: "Sports", type: "live" },
      { id: "news", name: "News", type: "live" },
    ]);
    vi.mocked(contentService.getLiveStreams)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "channel-1", title: "Channel 1", streamType: "live" },
      ]);

    await expect(ensureLiveContentAvailable(contentService)).resolves.toEqual({
      liveCategoryCount: 2,
      validatedLiveStreamCount: 1,
      usedCatalogFallback: false,
    });

    expect(contentService.getLiveStreams).toHaveBeenNthCalledWith(1, "sports", {
      limit: 1,
      page: 1,
      requestSource: "auth_live_probe",
    });
    expect(contentService.getLiveStreams).toHaveBeenNthCalledWith(2, "news", {
      limit: 1,
      page: 1,
      requestSource: "auth_live_probe",
    });
  });

  it("falls back to the full live catalog only after sampled categories are empty", async () => {
    const contentService = createContentService();
    vi.mocked(contentService.getLiveCategories).mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: `cat-${index + 1}`,
        name: `Category ${index + 1}`,
        type: "live" as const,
      }))
    );
    vi.mocked(contentService.getLiveStreams)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "channel-99", title: "Channel 99", streamType: "live" },
      ]);

    await expect(ensureLiveContentAvailable(contentService)).resolves.toEqual({
      liveCategoryCount: 6,
      validatedLiveStreamCount: 1,
      usedCatalogFallback: true,
    });

    expect(contentService.getLiveStreams).toHaveBeenCalledTimes(6);
    expect(contentService.getLiveStreams).toHaveBeenLastCalledWith(undefined, {
      limit: 1,
      page: 1,
      requestSource: "auth_live_probe",
    });
  });

  it("throws an empty-content error when no live categories exist", async () => {
    const contentService = createContentService();
    vi.mocked(contentService.getLiveCategories).mockResolvedValue([]);

    await expect(ensureLiveContentAvailable(contentService)).rejects.toEqual(
      expect.objectContaining({
        message: "No live categories found on this server",
        code: "EMPTY_CONTENT",
      })
    );
  });
});
