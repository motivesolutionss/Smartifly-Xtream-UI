import { perfMetrics } from "./perfMetrics";
import { logger } from "./logger";

const emittedMarkers = new Set<string>();

const getElapsedMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return Math.max(0, Math.round(performance.now()));
  }

  return 0;
};

export const markStartupMarker = (
  name: string,
  data?: Record<string, unknown>,
  options: { once?: boolean } = {}
) => {
  const once = options.once ?? true;
  if (once && emittedMarkers.has(name)) {
    return;
  }

  emittedMarkers.add(name);
  const elapsedMs = getElapsedMs();
  const payload = {
    elapsedMs,
    marker: name,
    ...data,
  };

  logger.info("startup_marker", payload);
  perfMetrics.recordDuration(`startup_marker_${name}_ms`, elapsedMs, {
    data: payload,
    logSlowEvent: false,
  });
};

export const resetStartupMarkersForTest = () => {
  emittedMarkers.clear();
};
