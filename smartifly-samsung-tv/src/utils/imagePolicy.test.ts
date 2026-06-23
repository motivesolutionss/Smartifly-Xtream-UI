import { beforeEach, describe, expect, it } from "vitest";
import { imageFailureMemory } from "./imageFailureMemory";
import {
  normalizeImageUrl,
  resolveImageCandidates,
  setPortalImageBaseUrl,
} from "./imagePolicy";

describe("imagePolicy", () => {
  beforeEach(() => {
    imageFailureMemory.clear();
    setPortalImageBaseUrl(null);
  });

  it("normalizes protocol-relative image urls", () => {
    expect(normalizeImageUrl("//cdn.example.com/poster.jpg")).toBe(
      "https://cdn.example.com/poster.jpg"
    );
  });

  it("resolves portal-relative image urls against the configured base url", () => {
    setPortalImageBaseUrl("http://portal.example.com:8080/player_api.php");

    expect(normalizeImageUrl("/images/cover.jpg")).toBe(
      "http://portal.example.com:8080/images/cover.jpg"
    );
  });

  it("strips invisible characters before validating urls", () => {
    expect(normalizeImageUrl("\u200Bhttps://cdn.example.com/poster.jpg\uFEFF")).toBe(
      "https://cdn.example.com/poster.jpg"
    );
  });

  it("rejects non-http schemes", () => {
    expect(normalizeImageUrl("javascript:alert(1)")).toBeNull();
  });

  it("keeps normalized candidates deduped in their declared order", () => {
    setPortalImageBaseUrl("https://portal.example.com");

    expect(
      resolveImageCandidates([
        "//cdn.example.com/poster.jpg",
        "/images/poster.jpg",
        "https://cdn.example.com/poster.jpg",
      ])
    ).toEqual([
      "https://cdn.example.com/poster.jpg",
      "https://portal.example.com/images/poster.jpg",
    ]);
  });
});
