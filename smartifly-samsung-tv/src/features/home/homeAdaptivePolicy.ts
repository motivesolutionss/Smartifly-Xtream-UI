import {
  resolvePerformanceTier,
  type PerformanceTier,
} from "../../utils/performanceTier";

export type HomePerformanceTier = PerformanceTier;
export type HomeSnapshotMode = "bootstrap" | "full";

export type HomeRailPolicy = {
  totalRailsCap: number;
  movieCategoryRails: number;
  seriesCategoryRails: number;
  smartRowsCap: number;
  itemsPerRail: number;
  trendingItems: number;
  liveItems: number;
  newReleaseItems: number;
  fetchMovieCategories: number;
  fetchSeriesCategories: number;
  fetchLiveCategories: number;
  fetchItemsPerCategory: number;
};

const FULL_POLICY_BY_TIER: Record<HomePerformanceTier, HomeRailPolicy> = {
  low: {
    totalRailsCap: 5,
    movieCategoryRails: 1,
    seriesCategoryRails: 1,
    smartRowsCap: 1,
    itemsPerRail: 12,
    trendingItems: 12,
    liveItems: 10,
    newReleaseItems: 12,
    fetchMovieCategories: 2,
    fetchSeriesCategories: 1,
    fetchLiveCategories: 1,
    fetchItemsPerCategory: 20,
  },
  medium: {
    totalRailsCap: 7,
    movieCategoryRails: 1,
    seriesCategoryRails: 1,
    smartRowsCap: 1,
    itemsPerRail: 14,
    trendingItems: 14,
    liveItems: 12,
    newReleaseItems: 14,
    fetchMovieCategories: 2,
    fetchSeriesCategories: 2,
    fetchLiveCategories: 1,
    fetchItemsPerCategory: 24,
  },
  high: {
    totalRailsCap: 8,
    movieCategoryRails: 2,
    seriesCategoryRails: 1,
    smartRowsCap: 1,
    itemsPerRail: 16,
    trendingItems: 16,
    liveItems: 12,
    newReleaseItems: 16,
    fetchMovieCategories: 2,
    fetchSeriesCategories: 2,
    fetchLiveCategories: 1,
    fetchItemsPerCategory: 28,
  },
};

const BOOTSTRAP_POLICY_BY_TIER: Record<HomePerformanceTier, HomeRailPolicy> = {
  low: {
    ...FULL_POLICY_BY_TIER.low,
    totalRailsCap: 4,
    fetchMovieCategories: 1,
    fetchSeriesCategories: 1,
    fetchLiveCategories: 1,
    fetchItemsPerCategory: 12,
  },
  medium: {
    ...FULL_POLICY_BY_TIER.medium,
    totalRailsCap: 5,
    fetchMovieCategories: 1,
    fetchSeriesCategories: 1,
    fetchLiveCategories: 1,
    fetchItemsPerCategory: 14,
  },
  high: {
    ...FULL_POLICY_BY_TIER.high,
    totalRailsCap: 6,
    fetchMovieCategories: 1,
    fetchSeriesCategories: 1,
    fetchLiveCategories: 1,
    fetchItemsPerCategory: 16,
  },
};

const applyCatalogAdjustment = (
  basePolicy: HomeRailPolicy,
  estimatedCatalogSize: number
): HomeRailPolicy => {
  if (estimatedCatalogSize <= 500) {
    return {
      ...basePolicy,
      totalRailsCap: Math.max(4, basePolicy.totalRailsCap - 2),
      movieCategoryRails: 1,
      seriesCategoryRails: 1,
      smartRowsCap: 1,
    };
  }

  if (estimatedCatalogSize <= 5_000) {
    return basePolicy;
  }

  if (estimatedCatalogSize <= 20_000) {
    return {
      ...basePolicy,
      totalRailsCap: Math.min(10, basePolicy.totalRailsCap + 1),
    };
  }

  return {
    ...basePolicy,
    totalRailsCap: Math.min(10, basePolicy.totalRailsCap + 2),
    movieCategoryRails: Math.min(3, basePolicy.movieCategoryRails + 1),
    seriesCategoryRails: Math.min(2, basePolicy.seriesCategoryRails + 1),
  };
};

export const resolveHomePerformanceTier = (): HomePerformanceTier =>
  resolvePerformanceTier();

export const estimateHomeCatalogSize = ({
  vodCategoryCount,
  seriesCategoryCount,
  liveCategoryCount,
}: {
  vodCategoryCount: number;
  seriesCategoryCount: number;
  liveCategoryCount: number;
}) => {
  return (
    vodCategoryCount * 30 +
    seriesCategoryCount * 28 +
    liveCategoryCount * 20
  );
};

export const resolveHomeRailPolicy = ({
  tier,
  estimatedCatalogSize,
  mode,
}: {
  tier: HomePerformanceTier;
  estimatedCatalogSize: number;
  mode: HomeSnapshotMode;
}) => {
  const basePolicy =
    mode === "bootstrap" ? BOOTSTRAP_POLICY_BY_TIER[tier] : FULL_POLICY_BY_TIER[tier];

  return applyCatalogAdjustment(basePolicy, estimatedCatalogSize);
};
