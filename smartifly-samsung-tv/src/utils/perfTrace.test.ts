import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPerfTrace } from "./perfTrace";
import { logger } from "./logger";
import { perfMetrics } from "./perfMetrics";

vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./perfMetrics", () => ({
  perfMetrics: {
    recordDuration: vi.fn(),
  },
}));

describe("createPerfTrace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs start and completion with a total duration metric", () => {
    const nowSpy = vi
      .spyOn(performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(245);

    const trace = createPerfTrace("home_screen", { screen: "home" });
    const durationMs = trace.end();

    expect(durationMs).toBe(145);
    expect(logger.info).toHaveBeenNthCalledWith(
      1,
      "home_screen_started",
      expect.objectContaining({
        screen: "home",
        traceName: "home_screen",
        traceId: expect.any(Number),
        sessionId: expect.any(String),
        pageLoadedAt: expect.any(String),
      })
    );
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      "home_screen_completed",
      expect.objectContaining({
        durationMs: 145,
        screen: "home",
        traceName: "home_screen",
        traceId: expect.any(Number),
        sessionId: expect.any(String),
      })
    );
    expect(perfMetrics.recordDuration).toHaveBeenCalledWith(
      "home_screen_total_ms",
      145,
      {
        slowAboveMs: undefined,
        data: expect.objectContaining({
          durationMs: 145,
          screen: "home",
          traceName: "home_screen",
          traceId: expect.any(Number),
          sessionId: expect.any(String),
        }),
        logSlowEvent: undefined,
      }
    );

    nowSpy.mockRestore();
  });

  it("logs intermediate marks with their own metric names", () => {
    const nowSpy = vi
      .spyOn(performance, "now")
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(135);

    const trace = createPerfTrace("search_query", { query: "news" });
    const durationMs = trace.mark("local_ready", {
      metricName: "search_local_ready_ms",
      slowAboveMs: 40,
    });

    expect(durationMs).toBe(85);
    expect(logger.debug).toHaveBeenCalledWith(
      "search_query_local_ready",
      expect.objectContaining({
        durationMs: 85,
        query: "news",
        traceName: "search_query",
        traceId: expect.any(Number),
        sessionId: expect.any(String),
      })
    );
    expect(perfMetrics.recordDuration).toHaveBeenCalledWith(
      "search_local_ready_ms",
      85,
      {
        slowAboveMs: 40,
        data: expect.objectContaining({
          durationMs: 85,
          query: "news",
          traceName: "search_query",
          traceId: expect.any(Number),
          sessionId: expect.any(String),
        }),
        logSlowEvent: undefined,
      }
    );

    nowSpy.mockRestore();
  });

  it("logs failures and records the total failed duration", () => {
    const error = new Error("boom");
    const nowSpy = vi
      .spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(61);

    const trace = createPerfTrace("login_connect", { screen: "login" });
    const durationMs = trace.fail(error, {
      data: { stage: "credentials" },
      slowAboveMs: 25,
    });

    expect(durationMs).toBe(51);
    expect(logger.error).toHaveBeenCalledWith(
      "login_connect_failed",
      expect.objectContaining({
        durationMs: 51,
        screen: "login",
        stage: "credentials",
        error,
        traceName: "login_connect",
        traceId: expect.any(Number),
        sessionId: expect.any(String),
      })
    );
    expect(perfMetrics.recordDuration).toHaveBeenCalledWith(
      "login_connect_total_ms",
      51,
      {
        slowAboveMs: 25,
        data: expect.objectContaining({
          durationMs: 51,
          screen: "login",
          stage: "credentials",
          error,
          traceName: "login_connect",
          traceId: expect.any(Number),
          sessionId: expect.any(String),
        }),
        logSlowEvent: undefined,
      }
    );

    nowSpy.mockRestore();
  });
});
