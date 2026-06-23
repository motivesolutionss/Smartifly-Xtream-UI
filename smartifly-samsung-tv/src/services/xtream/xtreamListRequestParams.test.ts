import { describe, expect, it } from "vitest";
import { buildXtreamListRequestParams } from "./xtreamListRequestParams";

describe("buildXtreamListRequestParams", () => {
  it("builds live pagination params compatible with bounded category probes", () => {
    expect(
      buildXtreamListRequestParams("live-10", { limit: 30, page: 3 }, "live")
    ).toEqual({
      category_id: "live-10",
      limit: "30",
      per_page: "30",
      page: "3",
      offset: "60",
      start: "60",
    });
  });

  it("builds vod params without live-only cursor fields", () => {
    expect(
      buildXtreamListRequestParams("vod-4", { limit: 48, page: 2 }, "vod")
    ).toEqual({
      category_id: "vod-4",
      limit: "48",
      page: "2",
    });
  });

  it("omits invalid pagination values", () => {
    expect(
      buildXtreamListRequestParams("series-1", { limit: 0, page: -2 }, "series")
    ).toEqual({
      category_id: "series-1",
    });
  });
});
