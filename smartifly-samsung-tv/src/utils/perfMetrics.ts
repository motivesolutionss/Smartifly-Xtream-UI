import { isDebugLoggingEnabled, logger } from "./logger";

const FLUSH_INTERVAL_MS = 15000;

type DurationOptions = {
  slowAboveMs?: number;
  data?: Record<string, unknown>;
  logSlowEvent?: boolean;
};

type DurationSummary = {
  count: number;
  totalMs: number;
  maxMs: number;
  slowCount: number;
};

const MAX_SLOW_LOGS_PER_METRIC_PER_FLUSH = 6;
const counters = new Map<string, number>();
const durations = new Map<string, DurationSummary>();
const slowLogsByMetric = new Map<string, number>();
const suppressedSlowLogsByMetric = new Map<string, number>();
let flushTimerId: number | null = null;

const reset = () => {
  counters.clear();
  durations.clear();
  slowLogsByMetric.clear();
  suppressedSlowLogsByMetric.clear();
};

const isPerfEnabled = () => isDebugLoggingEnabled();

const flush = () => {
  flushTimerId = null;

  if (!isPerfEnabled() || (counters.size === 0 && durations.size === 0)) {
    reset();
    return;
  }

  const counterSnapshot = Object.fromEntries(counters.entries());
  const durationSnapshot = Object.fromEntries(
    Array.from(durations.entries()).map(([name, summary]) => [
      name,
      {
        count: summary.count,
        avgMs: Math.round(summary.totalMs / summary.count),
        maxMs: Math.round(summary.maxMs),
        slowCount: summary.slowCount,
      },
    ])
  );
  const suppressedSlowLogsSnapshot = Object.fromEntries(
    Array.from(suppressedSlowLogsByMetric.entries())
  );

  logger.debug("perf_metrics_flush", {
    counters: counterSnapshot,
    durations: durationSnapshot,
    suppressedSlowLogs:
      Object.keys(suppressedSlowLogsSnapshot).length > 0
        ? suppressedSlowLogsSnapshot
        : undefined,
  });

  reset();
};

const scheduleFlush = () => {
  if (!isPerfEnabled() || flushTimerId !== null || typeof window === "undefined") {
    return;
  }

  flushTimerId = window.setTimeout(flush, FLUSH_INTERVAL_MS);
};

export const perfMetrics = {
  get enabled() {
    return isPerfEnabled();
  },
  increment(name: string, delta = 1) {
    if (!isPerfEnabled()) return;
    counters.set(name, (counters.get(name) ?? 0) + delta);
    scheduleFlush();
  },
  recordDuration(name: string, durationMs: number, options?: DurationOptions) {
    if (!isPerfEnabled()) return;

    const summary = durations.get(name) ?? {
      count: 0,
      totalMs: 0,
      maxMs: 0,
      slowCount: 0,
    };

    summary.count += 1;
    summary.totalMs += durationMs;
    summary.maxMs = Math.max(summary.maxMs, durationMs);
    if (options?.slowAboveMs !== undefined && durationMs >= options.slowAboveMs) {
      summary.slowCount += 1;
      if (options.logSlowEvent !== false) {
        const slowLogCount = slowLogsByMetric.get(name) ?? 0;
        if (slowLogCount < MAX_SLOW_LOGS_PER_METRIC_PER_FLUSH) {
          slowLogsByMetric.set(name, slowLogCount + 1);
          logger.debug("perf_slow_duration", {
            metric: name,
            durationMs: Math.round(durationMs),
            ...options.data,
          });
        } else {
          suppressedSlowLogsByMetric.set(
            name,
            (suppressedSlowLogsByMetric.get(name) ?? 0) + 1
          );
        }
      }
    }

    durations.set(name, summary);
    scheduleFlush();
  },
  flushNow() {
    flush();
  },
};
