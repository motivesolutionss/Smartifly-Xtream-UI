export type PerformanceTier = "low" | "medium" | "high";

export const PERF_REDUCED_CLASS = "perf-reduced";

export const resolvePerformanceTier = (): PerformanceTier => {
  if (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains(PERF_REDUCED_CLASS)
  ) {
    return "low";
  }

  return "medium";
};
