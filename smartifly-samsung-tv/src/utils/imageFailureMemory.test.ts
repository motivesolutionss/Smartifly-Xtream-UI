import { beforeEach, describe, expect, it, vi } from "vitest";
import { imageFailureMemory } from "./imageFailureMemory";

describe("imageFailureMemory host policy", () => {
  beforeEach(() => {
    imageFailureMemory.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T00:00:00.000Z"));
  });

  it("suppresses a host after repeated failures in a short window", () => {
    const url = "http://flaky.example.com/a.jpg";

    imageFailureMemory.markFailed(url);
    imageFailureMemory.markFailed(url);
    expect(imageFailureMemory.isHostSuppressed(url)).toBe(false);

    imageFailureMemory.markFailed(url);
    expect(imageFailureMemory.isHostSuppressed(url)).toBe(true);
    expect(imageFailureMemory.hasFailed(url)).toBe(true);
  });

  it("clears host suppression after a later success", () => {
    const failedUrl = "http://flaky.example.com/a.jpg";
    const freshUrl = "http://flaky.example.com/b.jpg";

    imageFailureMemory.markFailed(failedUrl);
    imageFailureMemory.markFailed(failedUrl);
    imageFailureMemory.markFailed(failedUrl);
    expect(imageFailureMemory.isHostSuppressed(failedUrl)).toBe(true);

    imageFailureMemory.markHostSuccess(freshUrl);

    expect(imageFailureMemory.isHostSuppressed(freshUrl)).toBe(false);
    expect(imageFailureMemory.hasFailed(freshUrl)).toBe(false);
    expect(imageFailureMemory.hasFailed(failedUrl)).toBe(true);
  });

  it("releases suppression after the cooldown expires", () => {
    const failedUrl = "http://flaky.example.com/a.jpg";
    const freshUrl = "http://flaky.example.com/b.jpg";

    imageFailureMemory.markFailed(failedUrl);
    imageFailureMemory.markFailed(failedUrl);
    imageFailureMemory.markFailed(failedUrl);
    expect(imageFailureMemory.isHostSuppressed(failedUrl)).toBe(true);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    expect(imageFailureMemory.isHostSuppressed(freshUrl)).toBe(false);
    expect(imageFailureMemory.hasFailed(freshUrl)).toBe(false);
    expect(imageFailureMemory.hasFailed(failedUrl)).toBe(true);
  });
});
