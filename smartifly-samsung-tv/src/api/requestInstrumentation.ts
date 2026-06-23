import { perfMetrics } from "../utils/perfMetrics";
import { logger } from "../utils/logger";

export type RequestInstrumentationMeta = {
  source?: string;
};

type RequestAttemptInfo = {
  attempt: number;
  startedAt: number;
};

type SanitizedRequestShape = {
  action: string;
  safeUrl: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
  page?: number;
  path: string;
  search?: string;
};

type StartedRequest = {
  beginAttempt: (attempt: number) => void;
  fail: (error: unknown) => void;
  retry: (attempt: number, delayMs: number, error: unknown) => void;
  succeed: () => void;
};

const XTREAM_API_PATHS = new Set(["/player_api.php", "/xmltv.php"]);
const REQUEST_TRACE_STORAGE_KEY = "smartifly_request_trace";
const MAX_RECENT_REQUESTS = 120;

declare global {
  interface Window {
    __smartiflyRequestTrace?: {
      clear: () => void;
      getSummary: () => {
        duplicates: number;
        inflight: number;
        recentRequests: Array<Record<string, unknown>>;
        totalRequests: number;
      };
    };
  }
}

const requestCountsByKey = new Map<string, number>();
const recentRequests: Array<Record<string, unknown>> = [];
let duplicateRequests = 0;
let totalRequests = 0;
let inflightRequests = 0;

const getNow = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
};

const isRequestTracingEnabled = () => {
  const envValue = import.meta.env.VITE_SMARTIFLY_REQUEST_TRACE?.trim().toLowerCase();
  if (envValue === "1" || envValue === "true" || envValue === "yes") {
    return true;
  }

  try {
    return localStorage.getItem(REQUEST_TRACE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const recordRecentRequest = (entry: Record<string, unknown>) => {
  recentRequests.push(entry);
  if (recentRequests.length > MAX_RECENT_REQUESTS) {
    recentRequests.splice(0, recentRequests.length - MAX_RECENT_REQUESTS);
  }
};

const sanitizeUrl = (url: string): SanitizedRequestShape => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.searchParams.has("username")) {
      parsedUrl.searchParams.set("username", "***");
    }
    if (parsedUrl.searchParams.has("password")) {
      parsedUrl.searchParams.set("password", "***");
    }

    const rawAction = parsedUrl.searchParams.get("action")?.trim();
    const action =
      rawAction ||
      (XTREAM_API_PATHS.has(parsedUrl.pathname) ? "player_api" : parsedUrl.pathname.replace(/^\//, ""));

    return {
      action,
      safeUrl: parsedUrl.toString(),
      categoryId: parsedUrl.searchParams.get("category_id") ?? undefined,
      limit: Number.parseInt(parsedUrl.searchParams.get("limit") ?? "", 10) || undefined,
      offset: Number.parseInt(parsedUrl.searchParams.get("offset") ?? "", 10) || undefined,
      page: Number.parseInt(parsedUrl.searchParams.get("page") ?? "", 10) || undefined,
      path: parsedUrl.pathname,
      search: parsedUrl.searchParams.get("search") ?? undefined,
    };
  } catch {
    return {
      action: "invalid-url",
      safeUrl: "[invalid-url]",
      path: "[invalid-url]",
    };
  }
};

const buildRequestKey = (
  method: string,
  shape: SanitizedRequestShape,
  source: string
) => {
  void source;
  return [
    method.toUpperCase(),
    shape.action,
    shape.categoryId ?? "",
    shape.page ?? "",
    shape.limit ?? "",
    shape.offset ?? "",
    shape.search ?? "",
  ].join("|");
};

const ensureApi = () => {
  if (typeof window === "undefined" || window.__smartiflyRequestTrace) return;

  window.__smartiflyRequestTrace = {
    clear: () => {
      requestCountsByKey.clear();
      recentRequests.length = 0;
      duplicateRequests = 0;
      totalRequests = 0;
      inflightRequests = 0;
    },
    getSummary: () => ({
      duplicates: duplicateRequests,
      inflight: inflightRequests,
      recentRequests: recentRequests.slice(),
      totalRequests,
    }),
  };
};

ensureApi();

export const startTrackedRequest = ({
  method,
  meta,
  retries,
  timeoutMs,
  url,
}: {
  meta?: RequestInstrumentationMeta;
  method: string;
  retries: number;
  timeoutMs: number;
  url: string;
}): StartedRequest => {
  const shape = sanitizeUrl(url);
  const source = meta?.source?.trim() || "other";
  const requestKey = buildRequestKey(method, shape, source);
  const duplicateCount = (requestCountsByKey.get(requestKey) ?? 0) + 1;
  requestCountsByKey.set(requestKey, duplicateCount);
  totalRequests += 1;
  inflightRequests += 1;

  const traceEnabled = isRequestTracingEnabled();
  const startedAt = getNow();
  const requestId = `${totalRequests}:${shape.action}:${source}`;
  const baseData = {
    action: shape.action,
    attemptCount: 0,
    categoryId: shape.categoryId,
    duplicateCount,
    isDuplicate: duplicateCount > 1,
    limit: shape.limit,
    method: method.toUpperCase(),
    offset: shape.offset,
    page: shape.page,
    path: shape.path,
    requestId,
    retriesConfigured: retries,
    safeUrl: shape.safeUrl,
    search: shape.search,
    source,
    timeoutMs,
  };

  if (duplicateCount > 1) {
    duplicateRequests += 1;
    perfMetrics.increment("http_duplicate_request_count");
  }

  perfMetrics.increment("http_request_count");
  recordRecentRequest({
    ...baseData,
    event: "started",
    startedAtIso: new Date().toISOString(),
  });

  if (traceEnabled) {
    logger.info("http_request_started", baseData);
  }

  let activeAttempt: RequestAttemptInfo | null = null;
  let retryCount = 0;

  const complete = (status: "completed" | "failed", data?: Record<string, unknown>) => {
    inflightRequests = Math.max(0, inflightRequests - 1);
    const durationMs = Math.max(0, Math.round(getNow() - startedAt));
    const payload = {
      ...baseData,
      attemptCount: activeAttempt?.attempt ?? retryCount + 1,
      durationMs,
      retryCount,
      ...data,
    };

    perfMetrics.recordDuration("http_request_duration_ms", durationMs, {
      slowAboveMs: timeoutMs,
      data: payload,
      logSlowEvent: false,
    });
    recordRecentRequest({
      ...payload,
      event: status,
      endedAtIso: new Date().toISOString(),
    });

    if (traceEnabled) {
      logger.info(`http_request_${status}`, payload);
    }
  };

  return {
    beginAttempt(attempt: number) {
      activeAttempt = {
        attempt,
        startedAt: getNow(),
      };

      if (traceEnabled) {
        logger.debug("http_request_attempt_started", {
          ...baseData,
          attempt,
        });
      }
    },
    retry(attempt: number, delayMs: number, error: unknown) {
      retryCount += 1;
      const attemptDurationMs = activeAttempt
        ? Math.max(0, Math.round(getNow() - activeAttempt.startedAt))
        : undefined;

      if (traceEnabled) {
        logger.warn("http_request_retry_scheduled", {
          ...baseData,
          attempt,
          attemptDurationMs,
          delayMs,
          error,
          retryCount,
        });
      }
    },
    succeed() {
      complete("completed");
    },
    fail(error: unknown) {
      complete("failed", {
        error,
        timedOut:
          Boolean(error) &&
          typeof error === "object" &&
          "code" in (error as Record<string, unknown>) &&
          (error as { code?: string }).code === "TIMEOUT",
      });
    },
  };
};
