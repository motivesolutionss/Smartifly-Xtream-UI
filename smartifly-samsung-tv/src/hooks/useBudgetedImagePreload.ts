import { useEffect } from "react";
import { imageFailureMemory } from "../utils/imageFailureMemory";
import { imageWarmMemory } from "../utils/imageWarmMemory";
import { normalizeImageUrl, resolveImageCandidates } from "../utils/imagePolicy";
import {
  buildImagePreloadPlan,
  getImagePreloadHostConcurrencyLimit,
} from "./imagePreloadBackpressure";
import { logger } from "../utils/logger";
import { createPerfTrace } from "../utils/perfTrace";

const IMAGE_PRELOAD_MEMORY_CAP = 1200;
const preloadedImageUrls = new Set<string>();
const preloadedImageQueue: string[] = [];
const inflightImageUrls = new Set<string>();

type SharedImagePreloadOptions = {
  maxConcurrent?: number;
  maxUrls?: number;
  preserveOrder?: boolean;
  traceTag?: string;
};

const rememberPreloadedImage = (url: string) => {
  if (preloadedImageUrls.has(url)) {
    return;
  }

  preloadedImageUrls.add(url);
  preloadedImageQueue.push(url);

  while (preloadedImageQueue.length > IMAGE_PRELOAD_MEMORY_CAP) {
    const evictedUrl = preloadedImageQueue.shift();
    if (!evictedUrl) {
      break;
    }
    preloadedImageUrls.delete(evictedUrl);
  }
};

export const resetImagePreloadMemory = () => {
  preloadedImageUrls.clear();
  preloadedImageQueue.length = 0;
  inflightImageUrls.clear();
};

export const isImageMarkedPreloaded = (url: string) => preloadedImageUrls.has(url);
export const markImagePreloadedForTest = (url: string) => {
  rememberPreloadedImage(url);
};

type GridPreloadRangeArgs = {
  itemCount: number;
  columns: number;
  rowStride: number;
  viewportHeight: number;
  anchorScrollTop: number;
  overscanRows: number;
};

export const getGridAnchorScrollTop = ({
  focusedIndex,
  columns,
  rowStride,
  fallbackScrollTop,
}: {
  focusedIndex: number;
  columns: number;
  rowStride: number;
  fallbackScrollTop: number;
}) => {
  if (focusedIndex < 0 || columns <= 0) {
    return Math.max(0, fallbackScrollTop);
  }

  const focusedRow = Math.floor(focusedIndex / columns);
  return Math.max(0, focusedRow * rowStride - rowStride);
};

export const getGridPreloadRange = ({
  itemCount,
  columns,
  rowStride,
  viewportHeight,
  anchorScrollTop,
  overscanRows,
}: GridPreloadRangeArgs) => {
  const startRow = Math.max(
    0,
    Math.floor(anchorScrollTop / rowStride) - overscanRows
  );
  const endRow = Math.max(
    startRow + 1,
    Math.ceil((anchorScrollTop + viewportHeight) / rowStride) + overscanRows
  );

  return {
    startIndex: startRow * columns,
    endIndex: Math.min(itemCount, endRow * columns),
  };
};

export const sliceImagePreloadUrls = <T>(
  items: T[],
  getUrl: (item: T) => string | undefined,
  startIndex: number,
  endIndex: number
) =>
  items
    .slice(startIndex, endIndex)
    .map(getUrl)
    .filter((url): url is string => Boolean(url));

const preloadImage = (
  url: string,
  onSettled?: (result: "loaded" | "error" | "skipped") => void
) => {
  if (preloadedImageUrls.has(url) || inflightImageUrls.has(url)) {
    onSettled?.("skipped");
    return;
  }

  inflightImageUrls.add(url);

  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    inflightImageUrls.delete(url);
    rememberPreloadedImage(url);
    imageFailureMemory.markLoaded(url);
    imageWarmMemory.markWarm(url);
    onSettled?.("loaded");
  };
  img.onerror = () => {
    inflightImageUrls.delete(url);
    imageFailureMemory.markFailed(url);
    onSettled?.("error");
  };
  img.src = url;
};

const preloadImageAsync = (url: string) =>
  new Promise<"loaded" | "error" | "skipped">((resolve) => {
    preloadImage(url, resolve);
  });

const resolveOrderedImageCandidates = (urls: string[]) => {
  const seen = new Set<string>();
  const orderedUrls: string[] = [];

  urls.forEach((url) => {
    const normalized = normalizeImageUrl(url);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    orderedUrls.push(normalized);
  });

  return orderedUrls;
};

const preparePreloadExecution = (
  urls: string[],
  options: SharedImagePreloadOptions = {}
) => {
  const maxConcurrent = Math.max(1, options.maxConcurrent ?? 2);
  const maxUrls = Math.max(maxConcurrent, options.maxUrls ?? urls.length);
  const resolvedUrls = options.preserveOrder
    ? resolveOrderedImageCandidates(urls)
    : resolveImageCandidates(urls);
  const candidateUrls = resolvedUrls.filter(
    (url) =>
      !preloadedImageUrls.has(url) &&
      !inflightImageUrls.has(url) &&
      !imageFailureMemory.hasFailed(url)
  );

  const preloadPlan = buildImagePreloadPlan({
    urls: candidateUrls,
    maxConcurrent,
    maxUrls,
  });

  return {
    maxConcurrent,
    candidateUrls,
    preloadPlan,
  };
};

const createPreloadTrace = ({
  urls,
  prepared,
  traceTag,
}: {
  urls: string[];
  prepared: ReturnType<typeof preparePreloadExecution>;
  traceTag?: string;
}) =>
  createPerfTrace("image_preload_batch", {
    tag: traceTag ?? "generic",
    requestedUrlCount: urls.length,
    candidateUrlCount: prepared.candidateUrls.length,
    plannedUrlCount: prepared.preloadPlan.candidateUrls.length,
    requestedMaxConcurrent: prepared.maxConcurrent,
    plannedMaxConcurrent: prepared.preloadPlan.maxConcurrent,
    preserveOrder: Boolean(traceTag),
  });

const logBackpressureIfNeeded = ({
  prepared,
}: {
  prepared: ReturnType<typeof preparePreloadExecution>;
}) => {
  if (
    prepared.preloadPlan.maxConcurrent !== prepared.maxConcurrent ||
    prepared.preloadPlan.candidateUrls.length !== prepared.candidateUrls.length
  ) {
    logger.debug("image_preload_backpressure_applied", {
      requestedMaxConcurrent: prepared.maxConcurrent,
      adjustedMaxConcurrent: prepared.preloadPlan.maxConcurrent,
      requestedUrlCount: prepared.candidateUrls.length,
      adjustedUrlCount: prepared.preloadPlan.candidateUrls.length,
      constrainedHosts: prepared.preloadPlan.constrainedHosts,
    });
  }
};

export const startBudgetedImagePreloadBatch = (
  urls: string[],
  options: SharedImagePreloadOptions = {}
) => {
  const prepared = preparePreloadExecution(urls, options);

  if (prepared.preloadPlan.candidateUrls.length === 0) {
    return () => {};
  }

  const preloadTrace = createPreloadTrace({
    urls,
    prepared,
    traceTag: options.traceTag,
  });
  logBackpressureIfNeeded({ prepared });

  let cancelled = false;
  let activeCount = 0;
  const pendingUrls = [...prepared.preloadPlan.candidateUrls];
  const activeByHost = new Map<string, number>();
  let loadedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  const finalizeIfComplete = () => {
    if (
      cancelled ||
      pendingUrls.length > 0 ||
      activeCount > 0 ||
      preloadTrace.isClosed()
    ) {
      return;
    }

    preloadTrace.end({
      status: "completed",
      metricName: "image_preload_batch_total_ms",
      slowAboveMs: 900,
      data: {
        loadedCount,
        errorCount,
        skippedCount,
      },
    });
  };

  const schedule = () => {
    if (cancelled) return;

    while (
      activeCount < prepared.preloadPlan.maxConcurrent &&
      pendingUrls.length > 0
    ) {
      const nextUrlIndex = pendingUrls.findIndex((url) => {
        let host = "";
        try {
          host = new URL(url).hostname.trim().toLowerCase();
        } catch {
          host = "";
        }

        const activeForHost = activeByHost.get(host) ?? 0;
        return (
          activeForHost <
          getImagePreloadHostConcurrencyLimit(
            url,
            prepared.preloadPlan.maxConcurrent
          )
        );
      });

      if (nextUrlIndex < 0) {
        break;
      }

      const [url] = pendingUrls.splice(nextUrlIndex, 1);
      let host = "";
      try {
        host = new URL(url).hostname.trim().toLowerCase();
      } catch {
        host = "";
      }

      activeCount += 1;
      activeByHost.set(host, (activeByHost.get(host) ?? 0) + 1);
      preloadImage(url, (result) => {
        activeCount -= 1;
        if (result === "loaded") {
          loadedCount += 1;
        } else if (result === "error") {
          errorCount += 1;
        } else {
          skippedCount += 1;
        }
        if (host) {
          const nextCount = Math.max(0, (activeByHost.get(host) ?? 1) - 1);
          if (nextCount === 0) {
            activeByHost.delete(host);
          } else {
            activeByHost.set(host, nextCount);
          }
        }
        schedule();
        finalizeIfComplete();
      });
    }

    finalizeIfComplete();
  };

  schedule();

  return () => {
    cancelled = true;
    if (!preloadTrace.isClosed()) {
      preloadTrace.end({
        status: "cancelled",
        metricName: "image_preload_batch_total_ms",
        slowAboveMs: 900,
        data: {
          loadedCount,
          errorCount,
          skippedCount,
          pendingUrlCount: pendingUrls.length,
          activeCount,
        },
      });
    }
  };
};

export const startBudgetedImagePreloadBatchInOrder = (
  urls: string[],
  options: SharedImagePreloadOptions = {}
) => {
  const prepared = preparePreloadExecution(urls, {
    ...options,
    maxConcurrent: 1,
    preserveOrder: true,
  });

  if (prepared.preloadPlan.candidateUrls.length === 0) {
    return {
      cancel: () => {},
      done: Promise.resolve(),
    };
  }

  const preloadTrace = createPreloadTrace({
    urls,
    prepared,
    traceTag: options.traceTag,
  });
  logBackpressureIfNeeded({ prepared });

  let cancelled = false;
  let loadedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  const done = (async () => {
    for (const url of prepared.preloadPlan.candidateUrls) {
      if (cancelled) {
        break;
      }

      const result = await preloadImageAsync(url);
      if (result === "loaded") {
        loadedCount += 1;
      } else if (result === "error") {
        errorCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    if (!preloadTrace.isClosed()) {
      preloadTrace.end({
        status: cancelled ? "cancelled" : "completed",
        metricName: "image_preload_batch_total_ms",
        slowAboveMs: 900,
        data: {
          loadedCount,
          errorCount,
          skippedCount,
        },
      });
    }
  })();

  return {
    cancel: () => {
      cancelled = true;
    },
    done,
  };
};

type ImagePreloadOptions = {
  enabled: boolean;
  maxConcurrent?: number;
  maxUrls?: number;
};

export const useBudgetedImagePreload = (
  urls: string[],
  options: ImagePreloadOptions
) => {
  useEffect(() => {
    if (!options.enabled || urls.length === 0) {
      return;
    }

    return startBudgetedImagePreloadBatch(urls, {
      maxConcurrent: options.maxConcurrent,
      maxUrls: options.maxUrls,
    });
  }, [options.enabled, options.maxConcurrent, options.maxUrls, urls]);
};
