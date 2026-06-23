import { logger } from "./logger";
import { perfMetrics } from "./perfMetrics";
import { getPerfSessionContext, nextPerfTraceId } from "./perfSession";

type TraceLogLevel = "debug" | "info" | "warn";

type TraceEventOptions = {
  data?: Record<string, unknown>;
  logLevel?: TraceLogLevel;
  metricName?: string;
  slowAboveMs?: number;
  logSlowEvent?: boolean;
};

type TraceEndOptions = TraceEventOptions & {
  status?: string;
};

const getNow = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
};

const roundDuration = (durationMs: number) => Math.max(0, Math.round(durationMs));

const logWithLevel = (
  level: TraceLogLevel,
  message: string,
  data?: Record<string, unknown>
) => {
  if (level === "warn") {
    logger.warn(message, data);
    return;
  }

  if (level === "info") {
    logger.info(message, data);
    return;
  }

  logger.debug(message, data);
};

export const createPerfTrace = (
  name: string,
  initialData: Record<string, unknown> = {}
) => {
  const startedAt = getNow();
  const traceId = nextPerfTraceId();
  const sessionContext = getPerfSessionContext();
  let closed = false;
  const traceContext = {
    traceId,
    traceName: name,
    ...sessionContext,
    ...initialData,
  };

  logger.info(`${name}_started`, traceContext);

  const getElapsedMs = () => Math.max(0, getNow() - startedAt);

  const record = (
    eventName: string,
    durationMs: number,
    defaultMetricName: string,
    defaultLogLevel: TraceLogLevel,
    options?: TraceEventOptions
  ) => {
    const roundedDurationMs = roundDuration(durationMs);
    const data = {
      durationMs: roundedDurationMs,
      ...traceContext,
      ...options?.data,
    };

    logWithLevel(options?.logLevel ?? defaultLogLevel, `${name}_${eventName}`, data);
    perfMetrics.recordDuration(options?.metricName ?? defaultMetricName, durationMs, {
      slowAboveMs: options?.slowAboveMs,
      data,
      logSlowEvent: options?.logSlowEvent,
    });

    return roundedDurationMs;
  };

  return {
    getDurationMs() {
      return roundDuration(getElapsedMs());
    },
    isClosed() {
      return closed;
    },
    mark(eventName: string, options?: TraceEventOptions) {
      return record(
        eventName,
        getElapsedMs(),
        `${name}_${eventName}_ms`,
        "debug",
        options
      );
    },
    end(options?: TraceEndOptions) {
      if (closed) {
        return 0;
      }

      closed = true;
      const eventName = options?.status ?? "completed";

      return record(
        eventName,
        getElapsedMs(),
        options?.metricName ?? `${name}_total_ms`,
        "info",
        options
      );
    },
    fail(error: unknown, options?: TraceEventOptions) {
      if (closed) {
        return 0;
      }

      closed = true;
      const durationMs = getElapsedMs();
      const roundedDurationMs = roundDuration(durationMs);
      const data = {
        durationMs: roundedDurationMs,
        ...traceContext,
        ...options?.data,
        error,
      };

      logger.error(`${name}_failed`, data);
      perfMetrics.recordDuration(options?.metricName ?? `${name}_total_ms`, durationMs, {
        slowAboveMs: options?.slowAboveMs,
        data,
        logSlowEvent: options?.logSlowEvent,
      });

      return roundedDurationMs;
    },
  };
};
