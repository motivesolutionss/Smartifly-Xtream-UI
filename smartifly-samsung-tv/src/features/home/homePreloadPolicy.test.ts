import { describe, expect, it } from "vitest";
import type { HomeRail } from "./homeTypes";
import {
  getHomeFocusPrefetchUrls,
  getHomePreparationImagePlan,
  getHomePreparationImageUrls,
  getHomeRuntimeImagePlan,
  getHomeRailPreloadUrls,
} from "./homePreloadPolicy";

const createRail = (id: string, itemCount: number): HomeRail => ({
  id,
  title: `Rail ${id}`,
  items: Array.from({ length: itemCount }, (_, index) => ({
    id: `${id}-${index + 1}`,
    title: `${id} item ${index + 1}`,
    type: "vod",
    contentType: "MOVIE",
    imageUrl: `https://cdn.example.com/${id}-${index + 1}.jpg`,
  })),
});

describe("home preload policy", () => {
  it("keeps the first above-fold rail first for preparation preloading", () => {
    const rails = [createRail("rail-1", 8), createRail("rail-2", 8), createRail("rail-3", 8)];

    const urls = getHomeRailPreloadUrls(rails, 1);

    expect(urls.slice(0, 4)).toEqual([
      "https://cdn.example.com/rail-1-1.jpg",
      "https://cdn.example.com/rail-1-2.jpg",
      "https://cdn.example.com/rail-1-3.jpg",
      "https://cdn.example.com/rail-1-4.jpg",
    ]);
  });

  it("uses the card poster first during home preparation", () => {
    const urls = getHomePreparationImageUrls(
      {
        version: 2,
        completeness: "bootstrap",
        generatedAt: "2026-06-12T00:00:00.000Z",
        movies: [
          {
            id: "movie-1",
            title: "Movie 1",
            extension: "mp4",
            posterUrl: "https://cdn.example.com/movie-1-poster.jpg",
            backdropUrl: "https://cdn.example.com/movie-1-backdrop.jpg",
            categoryId: "vod-1",
          },
        ],
        series: [],
        liveStreams: [],
        vodCategories: [{ id: "vod-1", name: "Action", type: "vod" }],
        seriesCategories: [],
      },
      [],
      "profile-1"
    );

    expect(urls[0]).toBe("https://cdn.example.com/movie-1-poster.jpg");
  });

  it("splits home preparation into deduped critical, near, and warm buckets", () => {
    const snapshot = {
      version: 2 as const,
      completeness: "bootstrap" as const,
      generatedAt: "2026-06-12T00:00:00.000Z",
      movies: Array.from({ length: 10 }, (_, index) => ({
        id: `movie-${index + 1}`,
        title: `Movie ${index + 1}`,
        extension: "mp4",
        posterUrl: `https://cdn.example.com/movie-${index + 1}-poster.jpg`,
        backdropUrl: `https://cdn.example.com/movie-${index + 1}-backdrop.jpg`,
        categoryId: "vod-1",
      })),
      series: [],
      liveStreams: [],
      vodCategories: [{ id: "vod-1", name: "Action", type: "vod" as const }],
      seriesCategories: [],
    };
    const plan = getHomePreparationImagePlan(snapshot, [], "profile-1", "medium");

    expect(plan.critical[0]).toMatch(
      /^https:\/\/cdn\.example\.com\/movie-\d+-poster\.jpg$/
    );
    expect(new Set(plan.critical).size).toBe(plan.critical.length);
    expect(plan.near.every((url) => !plan.critical.includes(url))).toBe(true);
    expect(
      plan.warm.every(
        (url) => !plan.critical.includes(url) && !plan.near.includes(url)
      )
    ).toBe(true);
  });

  it("prioritizes the focused card, then forward items, then a small backward buffer", () => {
    const rail = createRail("rail-1", 12);

    const urls = getHomeFocusPrefetchUrls(rail, 5, "medium");

    expect(urls.slice(0, 6)).toEqual([
      "https://cdn.example.com/rail-1-6.jpg",
      "https://cdn.example.com/rail-1-7.jpg",
      "https://cdn.example.com/rail-1-8.jpg",
      "https://cdn.example.com/rail-1-9.jpg",
      "https://cdn.example.com/rail-1-10.jpg",
      "https://cdn.example.com/rail-1-11.jpg",
    ]);
    expect(urls).toContain("https://cdn.example.com/rail-1-3.jpg");
    expect(urls).toContain("https://cdn.example.com/rail-1-4.jpg");
    expect(urls).toContain("https://cdn.example.com/rail-1-5.jpg");
  });

  it("keeps runtime critical focus urls ahead of near and warm rail windows", () => {
    const rails = [createRail("rail-1", 12), createRail("rail-2", 12), createRail("rail-3", 12)];

    const plan = getHomeRuntimeImagePlan(rails, 1, 5, "medium");

    expect(plan.critical[0]).toBe("https://cdn.example.com/rail-2-6.jpg");
    expect(plan.near.every((url) => !plan.critical.includes(url))).toBe(true);
    expect(
      plan.warm.every(
        (url) => !plan.critical.includes(url) && !plan.near.includes(url)
      )
    ).toBe(true);
  });
});
