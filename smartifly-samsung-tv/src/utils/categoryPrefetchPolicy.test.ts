import { describe, expect, it } from "vitest";
import { shouldPrefetchCategory } from "./categoryPrefetchPolicy";

describe("shouldPrefetchCategory", () => {
  const nowMs = 10_000;

  it("skips prefetch for the currently active category", () => {
    expect(
      shouldPrefetchCategory({
        categoryId: "news",
        activeCategoryId: "news",
        hasPendingTimer: false,
        activePrefetchCount: 0,
        maxConcurrentPrefetches: 2,
        staleTimeMs: 60_000,
        nowMs,
      })
    ).toBe(false);
  });

  it("skips prefetch when the category already has a pending debounce timer", () => {
    expect(
      shouldPrefetchCategory({
        categoryId: "sports",
        activeCategoryId: "news",
        hasPendingTimer: true,
        activePrefetchCount: 0,
        maxConcurrentPrefetches: 2,
        staleTimeMs: 60_000,
        nowMs,
      })
    ).toBe(false);
  });

  it("skips prefetch while the category query is already fetching", () => {
    expect(
      shouldPrefetchCategory({
        categoryId: "sports",
        activeCategoryId: "news",
        queryState: {
          fetchStatus: "fetching",
        },
        hasPendingTimer: false,
        activePrefetchCount: 0,
        maxConcurrentPrefetches: 2,
        staleTimeMs: 60_000,
        nowMs,
      })
    ).toBe(false);
  });

  it("skips prefetch when the category cache is still fresh", () => {
    expect(
      shouldPrefetchCategory({
        categoryId: "sports",
        activeCategoryId: "news",
        queryState: {
          dataUpdatedAt: nowMs - 1_000,
          fetchStatus: "idle",
        },
        hasPendingTimer: false,
        activePrefetchCount: 0,
        maxConcurrentPrefetches: 2,
        staleTimeMs: 60_000,
        nowMs,
      })
    ).toBe(false);
  });

  it("allows prefetch for a stale, inactive category when capacity is available", () => {
    expect(
      shouldPrefetchCategory({
        categoryId: "sports",
        activeCategoryId: "news",
        queryState: {
          dataUpdatedAt: nowMs - 700_000,
          fetchStatus: "idle",
        },
        hasPendingTimer: false,
        activePrefetchCount: 1,
        maxConcurrentPrefetches: 2,
        staleTimeMs: 60_000,
        nowMs,
      })
    ).toBe(true);
  });
});
