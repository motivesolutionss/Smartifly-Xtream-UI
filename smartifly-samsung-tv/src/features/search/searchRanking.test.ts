import { describe, expect, it } from "vitest";
import type { AppCategory } from "../../types/appModels";
import type { SearchCatalogVodEntry } from "./searchCatalogTypes";
import {
  getMatchingCategoryIds,
  rankSearchMatches,
  toCompactSearchKey,
} from "./searchRanking";

const createVodEntry = (
  id: string,
  title: string,
  overrides: Partial<SearchCatalogVodEntry> = {}
): SearchCatalogVodEntry => ({
  id,
  title,
  titleLower: title.toLowerCase(),
  titleCompact: toCompactSearchKey(title),
  type: "vod",
  ...overrides,
});

describe("toCompactSearchKey", () => {
  it("removes spaces and common punctuation while keeping letters and numbers", () => {
    expect(toCompactSearchKey("Spider-Man: No Way Home")).toBe("spidermannowayhome");
    expect(toCompactSearchKey("Law & Order")).toBe("laworder");
    expect(toCompactSearchKey("S.W.A.T. 2017")).toBe("swat2017");
  });
});

describe("rankSearchMatches", () => {
  it("matches compact queries against punctuated titles", () => {
    const entries = [
      createVodEntry("1", "Spider-Man: No Way Home"),
      createVodEntry("2", "Spiderwick"),
      createVodEntry("3", "Superman"),
    ];

    const results = rankSearchMatches(entries, "spiderman", new Set<string>(), 10);

    expect(results.map((entry) => entry.id)).toEqual(["1"]);
  });

  it("keeps exact and prefix compact matches ahead of lower-confidence matches", () => {
    const entries = [
      createVodEntry("1", "Law & Order"),
      createVodEntry("2", "Lawless"),
      createVodEntry("3", "The Law Office"),
    ];

    const results = rankSearchMatches(entries, "laworder", new Set<string>(), 10);

    expect(results.map((entry) => entry.id)).toEqual(["1"]);
  });
});

describe("getMatchingCategoryIds", () => {
  it("matches category names with compact search keys while ignoring generic query words", () => {
    const categories: AppCategory[] = [
      { id: "1", name: "Kids Shows", type: "series" },
      { id: "2", name: "Live Sports", type: "live" },
    ];

    expect([...getMatchingCategoryIds(categories, "kidsshows")]).toEqual(["1"]);
    expect([...getMatchingCategoryIds(categories, "live sports")]).toEqual(["2"]);
  });
});
