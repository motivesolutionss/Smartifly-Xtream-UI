import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEpg } from "./useEpg";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

describe("useEpg", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not start the refresh clock when EPG preview is disabled", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    renderHook(() =>
      useEpg("", {
        enabled: false,
        refreshClock: true,
      })
    );

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it("starts and clears the refresh clock only when enabled", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = renderHook(() =>
      useEpg("channel-1", {
        enabled: true,
        refreshClock: true,
      })
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});
