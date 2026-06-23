import { beforeEach, describe, expect, it, vi } from "vitest";
import { localStorageService } from "./localStorageService";

describe("localStorageService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageService.clear();
  });

  it("returns pending deferred values before they are flushed", () => {
    localStorageService.setDeferred("deferred-key", { value: 42 }, 250);

    expect(localStorageService.get<{ value: number }>("deferred-key")).toEqual({ value: 42 });
  });

  it("defers serialization work until a later tick or flush", () => {
    const toJSON = vi.fn(() => ({ payload: "ok" }));
    const value = { toJSON };

    localStorageService.setDeferred("serialize-key", value, 250);

    expect(toJSON).not.toHaveBeenCalled();

    vi.advanceTimersByTime(32);

    expect(toJSON).toHaveBeenCalledTimes(1);
  });

  it("flushes the latest deferred value for a key", () => {
    localStorageService.setDeferred("latest-key", { value: 1 }, 250);
    localStorageService.setDeferred("latest-key", { value: 2 }, 250);

    localStorageService.flushPending();

    expect(localStorageService.get<{ value: number }>("latest-key")).toEqual({ value: 2 });
  });
});
