import { describe, expect, it } from "vitest";
import {
  estimateHomeCatalogSize,
  resolveHomePerformanceTier,
  resolveHomeRailPolicy,
} from "./homeAdaptivePolicy";

describe("homeAdaptivePolicy", () => {
  it("shrinks the home policy for low-tier sparse catalogs", () => {
    expect(
      resolveHomeRailPolicy({
        tier: "low",
        estimatedCatalogSize: 400,
        mode: "full",
      })
    ).toMatchObject({
      totalRailsCap: 4,
      movieCategoryRails: 1,
      seriesCategoryRails: 1,
      itemsPerRail: 12,
      fetchMovieCategories: 2,
      fetchSeriesCategories: 1,
      fetchLiveCategories: 1,
      fetchItemsPerCategory: 20,
    });
  });

  it("expands the home policy for high-tier large catalogs", () => {
    expect(
      resolveHomeRailPolicy({
        tier: "high",
        estimatedCatalogSize: 25_000,
        mode: "full",
      })
    ).toMatchObject({
      totalRailsCap: 10,
      movieCategoryRails: 3,
      seriesCategoryRails: 2,
      itemsPerRail: 16,
      fetchMovieCategories: 2,
      fetchSeriesCategories: 2,
      fetchLiveCategories: 1,
      fetchItemsPerCategory: 28,
    });
  });

  it("uses a lighter bootstrap policy than the full policy", () => {
    expect(
      resolveHomeRailPolicy({
        tier: "medium",
        estimatedCatalogSize: 6_000,
        mode: "bootstrap",
      })
    ).toMatchObject({
      totalRailsCap: 6,
      fetchMovieCategories: 1,
      fetchSeriesCategories: 1,
      fetchLiveCategories: 1,
      fetchItemsPerCategory: 14,
    });
  });

  it("treats the adaptive reduced class as low-tier mode", () => {
    document.documentElement.classList.add("perf-reduced");

    expect(resolveHomePerformanceTier()).toBe("low");

    document.documentElement.classList.remove("perf-reduced");
  });

  it("estimates a larger catalog size when more categories are present", () => {
    const smallCatalog = estimateHomeCatalogSize({
      vodCategoryCount: 2,
      seriesCategoryCount: 1,
      liveCategoryCount: 1,
    });
    const largeCatalog = estimateHomeCatalogSize({
      vodCategoryCount: 120,
      seriesCategoryCount: 60,
      liveCategoryCount: 20,
    });

    expect(largeCatalog).toBeGreaterThan(smallCatalog);
    expect(largeCatalog).toBeGreaterThan(5_000);
  });
});
