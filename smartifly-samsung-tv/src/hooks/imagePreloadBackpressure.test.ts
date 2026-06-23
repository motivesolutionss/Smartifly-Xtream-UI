import { beforeEach, describe, expect, it } from "vitest";
import { imageFailureMemory } from "../utils/imageFailureMemory";
import {
  buildImagePreloadPlan,
  getImagePreloadHostConcurrencyLimit,
  isConstrainedImageHost,
} from "./imagePreloadBackpressure";

describe("imagePreloadBackpressure", () => {
  beforeEach(() => {
    imageFailureMemory.clear();
  });

  it("keeps normal preload settings for healthy hosts", () => {
    const plan = buildImagePreloadPlan({
      urls: [
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/b.jpg",
        "https://image.tmdb.org/t/p/w500/c.jpg",
      ],
      maxConcurrent: 2,
      maxUrls: 10,
    });

    expect(plan.maxConcurrent).toBe(2);
    expect(plan.candidateUrls).toHaveLength(3);
    expect(plan.constrainedHosts).toEqual([]);
  });

  it("constrains host concurrency after repeated failures", () => {
    const flakyUrl = "https://flaky.example.com/a.jpg";
    imageFailureMemory.markFailed(flakyUrl);
    imageFailureMemory.markFailed(flakyUrl);

    expect(isConstrainedImageHost(flakyUrl)).toBe(true);
    expect(getImagePreloadHostConcurrencyLimit(flakyUrl, 2)).toBe(1);
  });

  it("caps queued urls per constrained host", () => {
    const flakyUrl = "https://flaky.example.com/a.jpg";
    imageFailureMemory.markFailed(flakyUrl);
    imageFailureMemory.markFailed(flakyUrl);

    const plan = buildImagePreloadPlan({
      urls: [
        "https://flaky.example.com/1.jpg",
        "https://flaky.example.com/2.jpg",
        "https://flaky.example.com/3.jpg",
        "https://flaky.example.com/4.jpg",
        "https://flaky.example.com/5.jpg",
        "https://good.example.com/1.jpg",
      ],
      maxConcurrent: 2,
      maxUrls: 10,
    });

    expect(plan.candidateUrls).toEqual([
      "https://flaky.example.com/1.jpg",
      "https://flaky.example.com/2.jpg",
      "https://flaky.example.com/3.jpg",
      "https://flaky.example.com/4.jpg",
      "https://good.example.com/1.jpg",
    ]);
  });

  it("reduces global preload pressure when every candidate host is constrained", () => {
    const flakyUrl = "https://starshare.one/a.jpg";
    imageFailureMemory.markFailed(flakyUrl);
    imageFailureMemory.markFailed(flakyUrl);

    const plan = buildImagePreloadPlan({
      urls: [
        "https://starshare.one/1.jpg",
        "https://starshare.one/2.jpg",
        "https://starshare.one/3.jpg",
        "https://starshare.one/4.jpg",
        "https://starshare.one/5.jpg",
        "https://starshare.one/6.jpg",
        "https://starshare.one/7.jpg",
        "https://starshare.one/8.jpg",
      ],
      maxConcurrent: 2,
      maxUrls: 8,
    });

    expect(plan.maxConcurrent).toBe(1);
    expect(plan.candidateUrls).toHaveLength(4);
    expect(plan.constrainedHosts).toEqual(["starshare.one"]);
  });
});
