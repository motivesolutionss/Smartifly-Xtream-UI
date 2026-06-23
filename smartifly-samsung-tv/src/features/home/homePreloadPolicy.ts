import type { PersistedHomeSnapshot } from "../../storage/homeSnapshotStorage";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";
import { normalizeImageUrl } from "../../utils/imagePolicy";
import type { HomePerformanceTier } from "./homeAdaptivePolicy";
import type { HomeRail, HomeRailItem } from "./homeTypes";
import { buildHomeHeroItems, buildHomeRails } from "./homePolicy";
import { stabilizeHomeHeroOrder } from "./homeHeroSession";

type HomeImagePreloadPlan = {
  critical: string[];
  near: string[];
  warm: string[];
};

const HOME_ABOVE_FOLD_WINDOWS_BY_TIER: Record<
  HomePerformanceTier,
  {
    maxRails: number;
    criticalRails: number;
    criticalItemsPerRail: number;
    nearItemsPerRail: number;
    warmItemsPerRail: number;
  }
> = {
  low: {
    maxRails: 3,
    criticalRails: 1,
    criticalItemsPerRail: 4,
    nearItemsPerRail: 6,
    warmItemsPerRail: 8,
  },
  medium: {
    maxRails: 3,
    criticalRails: 2,
    criticalItemsPerRail: 8,
    nearItemsPerRail: 14,
    warmItemsPerRail: 18,
  },
  high: {
    maxRails: 3,
    criticalRails: 2,
    criticalItemsPerRail: 10,
    nearItemsPerRail: 18,
    warmItemsPerRail: 24,
  }
};
const HOME_FOCUS_PREFETCH_COUNTS: Record<
  HomePerformanceTier,
  { forward: number; backward: number }
> = {
  low: { forward: 4, backward: 1 },
  medium: { forward: 10, backward: 3 },
  high: { forward: 14, backward: 4 },
};

const appendDistinctUrl = (urls: string[], seen: Set<string>, url?: string | null) => {
  if (!url || seen.has(url)) {
    return;
  }

  seen.add(url);
  urls.push(url);
};

const buildHomeItemImageCandidates = (item: HomeRailItem) =>
  [item.imageUrl, item.backdropUrl]
    .map((url) => normalizeImageUrl(url))
    .filter((url): url is string => Boolean(url))
    .filter((url, index, urls) => urls.indexOf(url) === index);

const appendItemCandidates = (
  urls: string[],
  seen: Set<string>,
  item: HomeRailItem
) => {
  buildHomeItemImageCandidates(item).forEach((url) =>
    appendDistinctUrl(urls, seen, url)
  );
};

const appendRailWindow = (
  urls: string[],
  seen: Set<string>,
  rails: HomeRail[],
  railCount: number,
  itemsPerRail: number
) => {
  rails.slice(0, railCount).forEach((rail) => {
    rail.items.slice(0, itemsPerRail).forEach((item) => {
      appendItemCandidates(urls, seen, item);
    });
  });
};

const appendItems = (
  urls: string[],
  seen: Set<string>,
  items: HomeRailItem[]
) => {
  items.forEach((item) => {
    appendItemCandidates(urls, seen, item);
  });
};

export const getHomeAboveFoldImagePlan = (
  rails: HomeRail[],
  tier: HomePerformanceTier
): HomeImagePreloadPlan => {
  if (rails.length === 0) {
    return {
      critical: [],
      near: [],
      warm: [],
    };
  }
  const windowConfig = HOME_ABOVE_FOLD_WINDOWS_BY_TIER[tier];
  const cappedRails = rails.slice(0, windowConfig.maxRails);
  const critical: string[] = [];
  const near: string[] = [];
  const warm: string[] = [];
  const criticalSeen = new Set<string>();
  const nearSeen = new Set<string>();
  const warmSeen = new Set<string>();

  appendRailWindow(
    critical,
    criticalSeen,
    cappedRails,
    windowConfig.criticalRails,
    windowConfig.criticalItemsPerRail
  );
  appendRailWindow(
    near,
    nearSeen,
    cappedRails,
    Math.min(3, cappedRails.length),
    windowConfig.nearItemsPerRail
  );
  appendRailWindow(
    warm,
    warmSeen,
    cappedRails,
    cappedRails.length,
    Math.max(windowConfig.warmItemsPerRail, windowConfig.nearItemsPerRail)
  );

  const criticalSet = new Set(critical);
  const nearFiltered = near.filter((url) => !criticalSet.has(url));
  const nearSet = new Set(nearFiltered);
  const warmFiltered = warm.filter(
    (url) => !criticalSet.has(url) && !nearSet.has(url)
  );

  return {
    critical,
    near: nearFiltered,
    warm: warmFiltered,
  };
};

export const getOrderedHomeHeroItems = (
  snapshot: PersistedHomeSnapshot | null | undefined,
  continueWatching: RecentlyWatchedItem[] = [],
  profileId?: string | null
) => {
  if (!snapshot) {
    return [];
  }

  const heroItems = buildHomeHeroItems(
    snapshot.movies,
    snapshot.series,
    snapshot.liveStreams,
    continueWatching
  );

  return stabilizeHomeHeroOrder(profileId, heroItems);
};

export const getHomePreparationImagePlan = (
  snapshot: PersistedHomeSnapshot | null | undefined,
  continueWatching: RecentlyWatchedItem[] = [],
  profileId?: string | null,
  tier: HomePerformanceTier = "medium"
): HomeImagePreloadPlan => {
  if (!snapshot) {
    return {
      critical: [],
      near: [],
      warm: [],
    };
  }

  const rails = buildHomeRails(
    snapshot.movies,
    snapshot.series,
    snapshot.liveStreams,
    continueWatching,
    snapshot.vodCategories,
    snapshot.seriesCategories,
    {
      ...snapshot.policy,
      profileId,
      trendingIds: snapshot.trendingIds,
      smartRows: snapshot.smartRows,
    }
  );
  return getHomeAboveFoldImagePlan(rails, tier);
};

export const getHomePreparationImageUrls = (
  snapshot: PersistedHomeSnapshot | null | undefined,
  continueWatching: RecentlyWatchedItem[] = [],
  profileId?: string | null,
  tier: HomePerformanceTier = "medium"
) => {
  const plan = getHomePreparationImagePlan(
    snapshot,
    continueWatching,
    profileId,
    tier
  );
  return [...plan.critical, ...plan.near, ...plan.warm];
};

export const getHomeRuntimeImagePlan = (
  rails: HomeRail[],
  activeRailIndex: number,
  currentItemIndex: number,
  tier: HomePerformanceTier
): HomeImagePreloadPlan => {
  const activeRail = rails[activeRailIndex];
  if (!activeRail) {
    return {
      critical: [],
      near: [],
      warm: [],
    };
  }
  const critical: string[] = [];
  const near: string[] = [];
  const warm: string[] = [];
  const criticalSeen = new Set<string>();
  const nearSeen = new Set<string>();
  const warmSeen = new Set<string>();
  const { forward, backward } = HOME_FOCUS_PREFETCH_COUNTS[tier];

  if (currentItemIndex < 0 || currentItemIndex >= activeRail.items.length) {
    return {
      critical,
      near,
      warm,
    };
  }

  appendItemCandidates(critical, criticalSeen, activeRail.items[currentItemIndex]);
  appendItems(
    near,
    nearSeen,
    activeRail.items.slice(currentItemIndex + 1, currentItemIndex + 1 + forward)
  );
  appendItems(
    warm,
    warmSeen,
    activeRail.items
      .slice(Math.max(0, currentItemIndex - backward), currentItemIndex)
  );

  const criticalSet = new Set(critical);
  const nearFiltered = near.filter((url) => !criticalSet.has(url));
  const nearSet = new Set(nearFiltered);
  const warmFiltered = warm.filter(
    (url) => !criticalSet.has(url) && !nearSet.has(url)
  );

  return {
    critical,
    near: nearFiltered,
    warm: warmFiltered,
  };
};

export const getHomeRailPreloadUrls = (rails: HomeRail[], activeRailIndex: number) => {
  void activeRailIndex;
  const plan = getHomeAboveFoldImagePlan(rails, "medium");
  return [...plan.critical, ...plan.near, ...plan.warm];
};

export const getHomeFocusPrefetchUrls = (
  rail: HomeRail | undefined,
  currentIndex: number,
  tier: HomePerformanceTier
) => {
  const plan = getHomeRuntimeImagePlan(
    rail ? [rail] : [],
    0,
    currentIndex,
    tier
  );
  return [...plan.critical, ...plan.near, ...plan.warm];
};
