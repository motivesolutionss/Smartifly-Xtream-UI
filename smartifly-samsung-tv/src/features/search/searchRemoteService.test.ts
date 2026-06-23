import { describe, expect, it, vi, afterEach } from "vitest";
import { services } from "../../services";
import { mergeSearchResults, searchContentRemotely } from "./searchRemoteService";

describe("searchContentRemotely", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ranked remote matches and tolerates partial provider failures", async () => {
    const liveSpy = vi.spyOn(services.content, "searchLiveStreams").mockResolvedValue([
      { id: "2", title: "The Office News", streamType: "live" },
      { id: "1", title: "Office", streamType: "live" },
    ]);
    const vodSpy = vi
      .spyOn(services.content, "searchVodStreams")
      .mockRejectedValue(new Error("vod unavailable"));
    const seriesSpy = vi.spyOn(services.content, "searchSeries").mockResolvedValue([
      { id: "s2", title: "Office Nights" },
      { id: "s1", title: "Office" },
    ]);

    await expect(searchContentRemotely("Office")).resolves.toEqual({
      live: [
        { id: "1", title: "Office", streamType: "live" },
        { id: "2", title: "The Office News", streamType: "live" },
      ],
      vod: [],
      series: [
        { id: "s1", title: "Office" },
        { id: "s2", title: "Office Nights" },
      ],
    });

    expect(liveSpy).toHaveBeenCalledWith("Office", undefined, { limit: 36, page: 1 });
    expect(vodSpy).toHaveBeenCalledWith("Office", undefined, { limit: 48, page: 1 });
    expect(seriesSpy).toHaveBeenCalledWith("Office", undefined, { limit: 48, page: 1 });
  });

  it("throws when all targeted remote searches fail", async () => {
    vi.spyOn(services.content, "searchLiveStreams").mockRejectedValue(new Error("live failed"));
    vi.spyOn(services.content, "searchVodStreams").mockRejectedValue(new Error("vod failed"));
    vi.spyOn(services.content, "searchSeries").mockRejectedValue(new Error("series failed"));

    await expect(searchContentRemotely("matrix")).rejects.toThrow("live failed");
  });
});

describe("mergeSearchResults", () => {
  it("prefers primary results while appending missing fallback items", () => {
    expect(
      mergeSearchResults(
        {
          live: [{ id: "1", title: "Office", streamType: "live" }],
          vod: [{ id: "m1", title: "Movie 1" }],
          series: [],
        },
        {
          live: [
            { id: "1", title: "Office", streamType: "live" },
            { id: "2", title: "Office Extra", streamType: "live" },
          ],
          vod: [{ id: "m2", title: "Movie 2" }],
          series: [{ id: "s1", title: "Series 1" }],
        }
      )
    ).toEqual({
      live: [
        { id: "1", title: "Office", streamType: "live" },
        { id: "2", title: "Office Extra", streamType: "live" },
      ],
      vod: [
        { id: "m1", title: "Movie 1" },
        { id: "m2", title: "Movie 2" },
      ],
      series: [{ id: "s1", title: "Series 1" }],
    });
  });
});
