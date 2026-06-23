import { describe, expect, it } from "vitest";
import { getGridFocusPrefetchUrls } from "./gridFocusPreloadPolicy";

const createItems = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    imageUrl: `https://cdn.example.com/item-${index + 1}.jpg`,
  }));

describe("gridFocusPreloadPolicy", () => {
  it("prioritizes the focused item, then forward items, then a small backward buffer", () => {
    const urls = getGridFocusPrefetchUrls(
      createItems(14),
      5,
      (item) => item.imageUrl,
      "medium"
    );

    expect(urls.slice(0, 6)).toEqual([
      "https://cdn.example.com/item-6.jpg",
      "https://cdn.example.com/item-7.jpg",
      "https://cdn.example.com/item-8.jpg",
      "https://cdn.example.com/item-9.jpg",
      "https://cdn.example.com/item-10.jpg",
      "https://cdn.example.com/item-11.jpg",
    ]);
    expect(urls).toContain("https://cdn.example.com/item-3.jpg");
    expect(urls).toContain("https://cdn.example.com/item-4.jpg");
    expect(urls).toContain("https://cdn.example.com/item-5.jpg");
  });

  it("clamps correctly near the beginning of the list", () => {
    const urls = getGridFocusPrefetchUrls(
      createItems(4),
      0,
      (item) => item.imageUrl,
      "low"
    );

    expect(urls).toEqual([
      "https://cdn.example.com/item-1.jpg",
      "https://cdn.example.com/item-2.jpg",
      "https://cdn.example.com/item-3.jpg",
      "https://cdn.example.com/item-4.jpg",
    ]);
  });

  it("deduplicates duplicate image urls inside the focus horizon", () => {
    const items = [
      { imageUrl: "https://cdn.example.com/shared.jpg" },
      { imageUrl: "https://cdn.example.com/shared.jpg" },
      { imageUrl: "https://cdn.example.com/unique.jpg" },
    ];

    const urls = getGridFocusPrefetchUrls(items, 0, (item) => item.imageUrl, "high");

    expect(urls).toEqual([
      "https://cdn.example.com/shared.jpg",
      "https://cdn.example.com/unique.jpg",
    ]);
  });
});
