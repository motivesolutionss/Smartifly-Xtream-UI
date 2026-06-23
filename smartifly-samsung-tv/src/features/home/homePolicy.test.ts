import { beforeEach, describe, expect, it } from "vitest";
import { buildHomeHeroItems, buildHomeRails } from "./homePolicy";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import type { AppCategory, AppChannel, AppMovie, AppSeries } from "../../types/appModels";
import { resetHomeRailRankerSession } from "./homeRailRanker";

const createMovie = (
  id: string,
  categoryId: string,
  overrides: Partial<AppMovie> = {}
): AppMovie => ({
  id,
  title: `Movie ${id}`,
  categoryId,
  extension: "mp4",
  posterUrl: `https://cdn.example.com/${id}.jpg`,
  backdropUrl: `https://cdn.example.com/${id}-bg.jpg`,
  year: "2025",
  ...overrides,
});

const createSeries = (
  id: string,
  categoryId: string,
  overrides: Partial<AppSeries> = {}
): AppSeries => ({
  id,
  title: `Series ${id}`,
  categoryId,
  posterUrl: `https://cdn.example.com/${id}.jpg`,
  backdropUrl: `https://cdn.example.com/${id}-bg.jpg`,
  year: "2024",
  ...overrides,
});

const createLive = (id: string): AppChannel => ({
  id,
  title: `Live ${id}`,
  logoUrl: `https://cdn.example.com/${id}.png`,
  streamType: "live",
});

describe("buildHomeRails", () => {
  beforeEach(() => {
    imageFailureMemory.clear();
    resetHomeRailRankerSession();
  });

  it("builds Kotlin-aligned anchor rails before ranked supplemental rails", () => {
    const vodCategories: AppCategory[] = [
      { id: "vod-top", name: "Top Picks", type: "vod" },
      { id: "vod-classics", name: "Classics", type: "vod" },
    ];
    const seriesCategories: AppCategory[] = [
      { id: "series-hit", name: "Hit Series", type: "series" },
    ];

    const movies = [
      createMovie("movie-1", "vod-top", { year: "2026" }),
      createMovie("movie-2", "vod-top", { year: "2025" }),
      createMovie("movie-3", "vod-top", { year: "2024" }),
      createMovie("movie-4", "vod-top", { year: "2023" }),
      createMovie("movie-5", "vod-top", { year: "2022" }),
      createMovie("movie-6", "vod-classics", { year: "2018" }),
      createMovie("movie-7", "vod-classics", { year: "2017" }),
      createMovie("movie-8", "vod-classics", { year: "2016" }),
      createMovie("movie-9", "vod-classics", { year: "2015" }),
      createMovie("movie-10", "vod-classics", { year: "2014" }),
    ];
    const series = [
      createSeries("series-1", "series-hit", { year: "2026" }),
      createSeries("series-2", "series-hit", { year: "2025" }),
      createSeries("series-3", "series-hit", { year: "2024" }),
      createSeries("series-4", "series-hit", { year: "2023" }),
      createSeries("series-5", "series-hit", { year: "2022" }),
    ];

    const rails = buildHomeRails(
      movies,
      series,
      [createLive("live-1")],
      [{
        id: "movie-1",
        title: "Movie movie-1",
        type: "vod",
        imageUrl: "https://cdn.example.com/movie-1.jpg",
        backdropUrl: "https://cdn.example.com/movie-1-bg.jpg",
        watchedAt: "2026-06-12T00:00:00.000Z",
      }],
      vodCategories,
      seriesCategories
    );

    const railIds = rails.map((rail) => rail.id);
    expect(railIds[0]).toBe("continue-watching");
    expect(railIds.slice(0, 3)).toContain("live-channels");
    expect(railIds.slice(0, 4)).toContain("movies");
    expect(railIds.slice(0, 5)).toContain("series");
    expect(railIds).toContain("trending");
    expect(railIds).toContain("live-highlights");
    expect(railIds).toContain("new-movies");
    expect(railIds).toContain("category-vod-vod-top");
    expect(railIds).toContain("category-vod-vod-classics");
    expect(railIds).toContain("series-spotlight");
    expect(railIds).toContain("category-series-series-hit");
  });

  it("keeps Kotlin-style supplemental rail sequencing after anchors", () => {
    const vodCategories: AppCategory[] = [
      { id: "vod-top", name: "Top Picks", type: "vod" },
      { id: "vod-classics", name: "Classics", type: "vod" },
    ];
    const seriesCategories: AppCategory[] = [
      { id: "series-hit", name: "Hit Series", type: "series" },
    ];

    const movies = Array.from({ length: 12 }, (_, index) =>
      createMovie(`movie-${index + 1}`, index < 6 ? "vod-top" : "vod-classics", {
        year: `${2026 - index}`,
      })
    );
    const series = Array.from({ length: 8 }, (_, index) =>
      createSeries(`series-${index + 1}`, "series-hit", {
        year: `${2025 - index}`,
      })
    );

    const rails = buildHomeRails(
      movies,
      series,
      [createLive("live-1"), createLive("live-2")],
      [],
      vodCategories,
      seriesCategories,
      {
        totalRailsCap: 10,
        movieCategoryRails: 2,
        seriesCategoryRails: 1,
        itemsPerRail: 10,
        trendingItems: 10,
        liveItems: 8,
        newReleaseItems: 10,
      }
    );

    const railIds = rails.map((rail) => rail.id);
    expect(railIds.indexOf("trending")).toBeGreaterThan(-1);
    expect(railIds.indexOf("new-movies")).toBeGreaterThan(railIds.indexOf("trending"));
    expect(railIds.indexOf("live-highlights")).toBeGreaterThan(railIds.indexOf("new-movies"));
    expect(railIds.indexOf("category-vod-vod-top")).toBeGreaterThan(
      railIds.indexOf("new-movies")
    );
    expect(railIds.indexOf("category-series-series-hit")).toBeGreaterThan(-1);
    expect(railIds.indexOf("series-spotlight")).toBeGreaterThan(
      railIds.indexOf("new-movies")
    );
  });

  it("skips fallback category rails that would render with no usable artwork", () => {
    const vodCategories: AppCategory[] = [
      { id: "vod-healthy", name: "Healthy", type: "vod" },
      { id: "vod-empty", name: "Empty", type: "vod" },
    ];

    const healthyMovies = Array.from({ length: 5 }, (_, index) =>
      createMovie(`healthy-${index + 1}`, "vod-healthy")
    );
    const emptyMovies = Array.from({ length: 5 }, (_, index) =>
      createMovie(`empty-${index + 1}`, "vod-empty", {
        posterUrl: undefined,
        backdropUrl: undefined,
      })
    );

    const rails = buildHomeRails(
      [...healthyMovies, ...emptyMovies],
      [],
      [],
      [],
      vodCategories,
      []
    );

    expect(rails.find((rail) => rail.id === "category-vod-vod-healthy")?.items).toHaveLength(5);
    expect(rails.some((rail) => rail.id === "category-vod-vod-empty")).toBe(false);
  });

  it("respects adaptive category rail counts before final cap trimming", () => {
    const vodCategories: AppCategory[] = [
      { id: "vod-top", name: "Top Picks", type: "vod" },
      { id: "vod-classics", name: "Classics", type: "vod" },
      { id: "vod-crime", name: "Crime", type: "vod" },
    ];
    const seriesCategories: AppCategory[] = [
      { id: "series-hit", name: "Hit Series", type: "series" },
      { id: "series-docs", name: "Docs", type: "series" },
    ];

    const movies = Array.from({ length: 15 }, (_, index) =>
      createMovie(`movie-${index + 1}`, vodCategories[index % vodCategories.length]!.id)
    );
    const series = Array.from({ length: 10 }, (_, index) =>
      createSeries(`series-${index + 1}`, seriesCategories[index % seriesCategories.length]!.id)
    );

    const rails = buildHomeRails(movies, series, [createLive("live-1")], [], vodCategories, seriesCategories, {
      movieCategoryRails: 1,
      seriesCategoryRails: 1,
      totalRailsCap: 10,
      itemsPerRail: 10,
      trendingItems: 10,
      liveItems: 8,
      newReleaseItems: 10,
    });

    expect(rails.length).toBeLessThanOrEqual(10);
    expect(rails.filter((rail) => rail.id.startsWith("category-vod-"))).toHaveLength(1);
    expect(rails.filter((rail) => rail.id.startsWith("category-series-"))).toHaveLength(1);
  });

  it("prefers continue-watching as the first hero, otherwise the best rated visual candidate", () => {
    const movies = [
      createMovie("movie-1", "vod-top", { rating: "6.5" }),
      createMovie("movie-2", "vod-top", { rating: "8.8" }),
      createMovie("movie-3", "vod-top", { rating: "7.1" }),
    ];
    const series = [createSeries("series-1", "series-hit", { rating: "9.0" })];

    const heroesWithoutResume = buildHomeHeroItems(movies, series, [], []);
    expect(heroesWithoutResume[0]?.id).toBe("series-1");
    expect(heroesWithoutResume[0]?.type).toBe("series");

    const heroesWithResume = buildHomeHeroItems(movies, series, [], [
      {
        id: "movie-1",
        title: "Movie movie-1",
        type: "vod",
        imageUrl: "https://cdn.example.com/movie-1.jpg",
        backdropUrl: "https://cdn.example.com/movie-1-bg.jpg",
        watchedAt: "2026-06-12T00:00:00.000Z",
      },
    ]);
    expect(heroesWithResume[0]?.id).toBe("movie-1");
    expect(heroesWithResume[0]?.description).toContain("Resume watching");
  });

  it("uses backend trending ids and smart rows when they are available", () => {
    const vodCategories: AppCategory[] = [{ id: "vod-top", name: "Top Picks", type: "vod" }];
    const movies = [
      createMovie("movie-1", "vod-top", { rating: "6.5" }),
      createMovie("movie-2", "vod-top", { rating: "8.8" }),
      createMovie("movie-3", "vod-top", { rating: "7.1" }),
    ];

    const rails = buildHomeRails(
      movies,
      [],
      [],
      [],
      vodCategories,
      [],
      {
        trendingIds: ["movie-3"],
        smartRowsCap: 1,
        smartRows: [
          {
            title: "Because You Watched Action",
            items: [
              createMovie("smart-1", "vod-top", { title: "Smart Pick 1" }),
              createMovie("smart-2", "vod-top", { title: "Smart Pick 2" }),
            ],
          },
        ],
      }
    );

    const trendingRail = rails.find((rail) => rail.id === "trending");
    expect(trendingRail?.items[0]?.id).toBe("movie-3");
    expect(rails.some((rail) => rail.title === "Because You Watched Action")).toBe(true);
  });
});
