import type { PerformanceTier } from "../utils/performanceTier";

const GRID_FOCUS_PREFETCH_COUNTS: Record<
  PerformanceTier,
  { forward: number; backward: number }
> = {
  low: { forward: 4, backward: 1 },
  medium: { forward: 10, backward: 3 },
  high: { forward: 14, backward: 4 },
};

const appendDistinctUrl = (urls: string[], seen: Set<string>, url?: string) => {
  if (!url || seen.has(url)) {
    return;
  }

  seen.add(url);
  urls.push(url);
};

export const getGridFocusPrefetchUrls = <T>(
  items: T[],
  currentIndex: number,
  getUrl: (item: T) => string | undefined,
  tier: PerformanceTier
) => {
  if (currentIndex < 0 || currentIndex >= items.length) {
    return [];
  }

  const { forward, backward } = GRID_FOCUS_PREFETCH_COUNTS[tier];
  const urls: string[] = [];
  const seen = new Set<string>();

  appendDistinctUrl(urls, seen, getUrl(items[currentIndex]));

  items
    .slice(currentIndex + 1, currentIndex + 1 + forward)
    .forEach((item) => appendDistinctUrl(urls, seen, getUrl(item)));

  items
    .slice(Math.max(0, currentIndex - backward), currentIndex)
    .forEach((item) => appendDistinctUrl(urls, seen, getUrl(item)));

  return urls;
};
