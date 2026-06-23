import { useEffect, useMemo } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { HeroItem } from "../../components/common/HeroBanner";
import { services } from "../../services";
import { homeSnapshotStorage, type PersistedHomeSnapshot } from "../../storage/homeSnapshotStorage";
import { playlistStorage } from "../../storage/playlistStorage";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";
import { useProfileStore } from "../../store/profileStore";
import type { AppCategory, AppChannel, AppMovie, AppSeries } from "../../types/appModels";
import { logger } from "../../utils/logger";
import { createPerfTrace } from "../../utils/perfTrace";
import { stableHash } from "../../utils/imagePolicy";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import { markStartupMarker } from "../../utils/startupMarkers";
import {
  estimateHomeCatalogSize,
  resolveHomePerformanceTier,
  resolveHomeRailPolicy,
  type HomeSnapshotMode,
} from "./homeAdaptivePolicy";
import { buildHomeHeroItems, buildHomeRails } from "./homePolicy";
import { getHomePreparationImageUrls as collectHomePreparationImageUrls } from "./homePreloadPolicy";
import { stabilizeHomeHeroOrder } from "./homeHeroSession";
import type { HomeRail } from "./homeTypes";

const HOME_SNAPSHOT_STALE_MS = 5 * 60 * 1000;
const HOME_SNAPSHOT_GC_MS = 2 * 60 * 60 * 1000;
const HOME_MOVIE_FALLBACK_MIN = 18;
const HOME_SERIES_FALLBACK_MIN = 18;
const HOME_LIVE_FALLBACK_MIN = 10;
const HOME_LIVE_CACHE_CAP = 24;
const HOME_DEFERRED_FULL_REFRESH_RETRY_COOLDOWN_MS = 20_000;
const HOME_BOOTSTRAP_PROMOTION_REUSE_MS = 90_000;
const HOME_DEFERRED_FULL_REFRESH_DELAY_MS_BY_TIER = {
  low: 12000,
  medium: 9000,
  high: 7000,
} as const;
const deferredFullRefreshAttemptAtByScope = new Map<string, number>();

const EMPTY_FETCHED_CATEGORY_IDS = {
  live: [],
  series: [],
  vod: [],
} as const;

const GENERIC_CATEGORY_NAMES = new Set([
  "all",
  "all movies",
  "all series",
  "all channels",
  "movies",
  "series",
  "live",
  "live tv",
  "uncategorized",
]);

const isCategoryPreferred = (category: AppCategory) => {
  return !GENERIC_CATEGORY_NAMES.has(category.name.trim().toLowerCase());
};

const selectCategories = (categories: AppCategory[], count: number) => {
  const preferred = categories.filter(isCategoryPreferred);
  const source = preferred.length >= count ? preferred : categories;
  return source.slice(0, count);
};

const rankMovie = (item: AppMovie) => {
  const hasBackdrop = item.backdropUrl ? 1000 : 0;
  const hasPoster = item.posterUrl ? 250 : 0;
  const hasMetadata =
    (item.description ? 40 : 0) +
    (item.rating ? 20 : 0) +
    (item.genre ? 10 : 0);
  return hasBackdrop + hasPoster + hasMetadata + (stableHash(item.id) % 100);
};

const rankSeries = (item: AppSeries) => {
  const hasBackdrop = item.backdropUrl ? 900 : 0;
  const hasPoster = item.posterUrl ? 300 : 0;
  const hasMetadata =
    (item.description ? 40 : 0) +
    (item.rating ? 20 : 0) +
    (item.genre ? 10 : 0);
  return hasBackdrop + hasPoster + hasMetadata + (stableHash(item.id) % 100);
};

const rankChannel = (item: AppChannel) => {
  const hasLogo = item.logoUrl ? 500 : 0;
  return hasLogo + (stableHash(item.id) % 100);
};

const hasUsableArtwork = (item: { posterUrl?: string; backdropUrl?: string }) => {
  const posterAvailable =
    item.posterUrl && !imageFailureMemory.hasFailed(item.posterUrl);
  const backdropAvailable =
    item.backdropUrl && !imageFailureMemory.hasFailed(item.backdropUrl);
  return Boolean(posterAvailable || backdropAvailable);
};

const isRichMovieCandidate = (item: AppMovie) => {
  if (!hasUsableArtwork(item)) return false;

  const metadataSignals = [
    item.description,
    item.rating,
    item.genre,
    item.year,
    item.tmdbId,
    item.director,
    item.cast,
  ].filter(Boolean).length;

  return metadataSignals >= 2 || Boolean(item.backdropUrl && item.posterUrl);
};

const isRichSeriesCandidate = (item: AppSeries) => {
  if (!hasUsableArtwork(item)) return false;

  const metadataSignals = [
    item.description,
    item.rating,
    item.genre,
    item.year,
    item.tmdbId,
    item.director,
    item.cast,
  ].filter(Boolean).length;

  return metadataSignals >= 2 || Boolean(item.backdropUrl && item.posterUrl);
};

const sampleItems = <T>(items: T[], limit: number, rank: (item: T) => number) => {
  return [...items].sort((left, right) => rank(right) - rank(left)).slice(0, limit);
};

const sampleRichItems = <T>(
  items: T[],
  limit: number,
  rank: (item: T) => number,
  isRichCandidate: (item: T) => boolean
) => {
  const richItems = items.filter(isRichCandidate);
  if (richItems.length >= limit) {
    return sampleItems(richItems, limit, rank);
  }

  if (richItems.length > 0) {
    const richIds = new Set(
      richItems.map((item) => (item as { id?: string }).id).filter(Boolean)
    );
    const fillerItems = items.filter(
      (item) => !richIds.has((item as { id?: string }).id)
    );

    return [
      ...sampleItems(richItems, richItems.length, rank),
      ...sampleItems(fillerItems, Math.max(0, limit - richItems.length), rank),
    ].slice(0, limit);
  }

  return sampleItems(items, limit, rank);
};

const dedupeById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const isSparseSnapshot = (snapshot: PersistedHomeSnapshot) => {
  return (
    snapshot.movies.length < HOME_MOVIE_FALLBACK_MIN &&
    snapshot.series.length < HOME_SERIES_FALLBACK_MIN &&
    snapshot.liveStreams.length < HOME_LIVE_FALLBACK_MIN
  );
};

export const hasHomeSnapshotContent = (snapshot: PersistedHomeSnapshot | null | undefined) => {
  if (!snapshot) return false;
  return snapshot.movies.length > 0 || snapshot.series.length > 0 || snapshot.liveStreams.length > 0;
};

const getSnapshotUpdatedAt = (snapshot: PersistedHomeSnapshot | null) => {
  if (!snapshot) return undefined;
  if (snapshot.completeness === "bootstrap") return 0;
  if (isSparseSnapshot(snapshot)) return 0;
  const timestamp = Date.parse(snapshot.generatedAt);
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

export const isHomeSnapshotFresh = (snapshot: PersistedHomeSnapshot | null | undefined) => {
  const updatedAt = getSnapshotUpdatedAt(snapshot ?? null);
  if (updatedAt === undefined || updatedAt <= 0) return false;
  return Date.now() - updatedAt <= HOME_SNAPSHOT_STALE_MS;
};

const fulfilledGroups = <T>(results: PromiseSettledResult<T[]>[]) => {
  return results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return [result.value];
    }
    return [[]];
  });
};

const allRejected = (results: PromiseSettledResult<unknown>[]) => {
  return results.length > 0 && results.every((result) => result.status === "rejected");
};

const parseTimestamp = (value?: string) => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const wasFetchedRecently = (value: string | undefined, maxAgeMs: number) => {
  const timestamp = parseTimestamp(value);
  if (timestamp <= 0) return false;
  return Date.now() - timestamp <= maxAgeMs;
};

const getSnapshotFetchedCategoryIds = (snapshot?: PersistedHomeSnapshot | null) =>
  snapshot?.fetchMeta?.fetchedCategoryIds ?? EMPTY_FETCHED_CATEGORY_IDS;

const getReusableCategoryItems = <T extends { categoryId?: string }>(
  items: T[],
  fetchedCategoryIds: Set<string>,
  categoryId: string,
  limit: number
) => {
  if (!fetchedCategoryIds.has(categoryId)) {
    return null;
  }

  return items.filter((item) => item.categoryId === categoryId).slice(0, limit);
};

const canPromoteBootstrapSnapshot = (snapshot?: PersistedHomeSnapshot | null) => {
  if (!snapshot || !hasHomeSnapshotContent(snapshot)) return false;
  return wasFetchedRecently(
    snapshot.fetchMeta?.contentFetchedAt ?? snapshot.generatedAt,
    HOME_BOOTSTRAP_PROMOTION_REUSE_MS
  );
};

type FetchHomeSnapshotOptions = {
  requestSource?: string;
  seedSnapshot?: PersistedHomeSnapshot | null;
};

const fetchHomeSnapshot = async (
  mode: HomeSnapshotMode,
  profileId?: string | null,
  options: FetchHomeSnapshotOptions = {}
): Promise<PersistedHomeSnapshot> => {
  const seedSnapshot = options.seedSnapshot ?? null;
  const trace = createPerfTrace("home_snapshot_fetch", {
    mode,
    profileId,
    requestSource: options.requestSource ?? `home_${mode}`,
  });

  try {
    const categoryRequestSource = `${options.requestSource ?? `home_${mode}`}_categories`;
    const contentRequestSource = `${options.requestSource ?? `home_${mode}`}_content`;
    const reusableSeedSnapshot = mode === "full" && canPromoteBootstrapSnapshot(seedSnapshot)
      ? seedSnapshot
      : null;

    let vodCategories = reusableSeedSnapshot?.vodCategories ?? [];
    let seriesCategories = reusableSeedSnapshot?.seriesCategories ?? [];
    let liveCategories = reusableSeedSnapshot?.liveCategories ?? [];

    const shouldFetchVodCategories = vodCategories.length === 0;
    const shouldFetchSeriesCategories = seriesCategories.length === 0;
    const shouldFetchLiveCategories = liveCategories.length === 0;

    const categoryResults = await Promise.allSettled([
      shouldFetchVodCategories
        ? services.content.getVodCategories({
            requestSource: categoryRequestSource,
          })
        : Promise.resolve(vodCategories),
      shouldFetchSeriesCategories
        ? services.content.getSeriesCategories({
            requestSource: categoryRequestSource,
          })
        : Promise.resolve(seriesCategories),
      shouldFetchLiveCategories
        ? services.content.getLiveCategories({
            requestSource: categoryRequestSource,
          })
        : Promise.resolve(liveCategories),
    ]);

    if (
      shouldFetchVodCategories &&
      shouldFetchSeriesCategories &&
      shouldFetchLiveCategories &&
      allRejected(categoryResults)
    ) {
      throw new Error("Unable to load home categories");
    }

    vodCategories = categoryResults[0]?.status === "fulfilled" ? categoryResults[0].value : vodCategories;
    seriesCategories =
      categoryResults[1]?.status === "fulfilled" ? categoryResults[1].value : seriesCategories;
    liveCategories =
      categoryResults[2]?.status === "fulfilled" ? categoryResults[2].value : liveCategories;

    trace.mark("categories_ready", {
      metricName: "home_snapshot_categories_ready_ms",
      slowAboveMs: 250,
      data: {
        vodCategoryCount: vodCategories.length,
        seriesCategoryCount: seriesCategories.length,
        liveCategoryCount: liveCategories.length,
        reusedSeedCategories: Boolean(reusableSeedSnapshot),
      },
    });

    const tier = resolveHomePerformanceTier();
    const estimatedCatalogSize = estimateHomeCatalogSize({
      vodCategoryCount: vodCategories.length,
      seriesCategoryCount: seriesCategories.length,
      liveCategoryCount: liveCategories.length,
    });
    const policy = resolveHomeRailPolicy({
      tier,
      estimatedCatalogSize,
      mode,
    });

    logger.info("home_snapshot_policy_resolved", {
      mode,
      tier,
      estimatedCatalogSize,
      fetchMovieCategories: policy.fetchMovieCategories,
      fetchSeriesCategories: policy.fetchSeriesCategories,
      fetchLiveCategories: policy.fetchLiveCategories,
      fetchItemsPerCategory: policy.fetchItemsPerCategory,
      totalRailsCap: policy.totalRailsCap,
      itemsPerRail: policy.itemsPerRail,
    });

    const selectedVodCategories = selectCategories(vodCategories, policy.fetchMovieCategories);
    const selectedSeriesCategories = selectCategories(
      seriesCategories,
      policy.fetchSeriesCategories
    );
    const selectedLiveCategories = selectCategories(liveCategories, policy.fetchLiveCategories);

    const reusableFetchedCategoryIds = {
      live: new Set(getSnapshotFetchedCategoryIds(reusableSeedSnapshot).live),
      series: new Set(getSnapshotFetchedCategoryIds(reusableSeedSnapshot).series),
      vod: new Set(getSnapshotFetchedCategoryIds(reusableSeedSnapshot).vod),
    };

    const [vodResults, seriesResults, liveResults] = await Promise.all([
      Promise.allSettled(
        selectedVodCategories.map((category) => {
          const reusedItems = reusableSeedSnapshot
            ? getReusableCategoryItems(
                reusableSeedSnapshot.movies,
                reusableFetchedCategoryIds.vod,
                category.id,
                policy.fetchItemsPerCategory
              )
            : null;

          if (reusedItems) {
            return Promise.resolve(reusedItems);
          }

          return services.content.getVodStreams(category.id, {
            limit: policy.fetchItemsPerCategory,
            page: 1,
            requestSource: contentRequestSource,
          });
        })
      ),
      Promise.allSettled(
        selectedSeriesCategories.map((category) => {
          const reusedItems = reusableSeedSnapshot
            ? getReusableCategoryItems(
                reusableSeedSnapshot.series,
                reusableFetchedCategoryIds.series,
                category.id,
                policy.fetchItemsPerCategory
              )
            : null;

          if (reusedItems) {
            return Promise.resolve(reusedItems);
          }

          return services.content.getSeries(category.id, {
            limit: policy.fetchItemsPerCategory,
            page: 1,
            requestSource: contentRequestSource,
          });
        })
      ),
      Promise.allSettled(
        selectedLiveCategories.map((category) => {
          const reusedItems = reusableSeedSnapshot
            ? getReusableCategoryItems(
                reusableSeedSnapshot.liveStreams,
                reusableFetchedCategoryIds.live,
                category.id,
                policy.fetchItemsPerCategory
              )
            : null;

          if (reusedItems) {
            return Promise.resolve(reusedItems);
          }

          return services.content.getLiveStreams(category.id, {
            limit: policy.fetchItemsPerCategory,
            page: 1,
            requestSource: contentRequestSource,
          });
        })
      ),
    ]);

    const shouldReuseAnalytics =
      Boolean(reusableSeedSnapshot) &&
      wasFetchedRecently(
        reusableSeedSnapshot?.fetchMeta?.analyticsFetchedAt ?? reusableSeedSnapshot?.generatedAt,
        HOME_SNAPSHOT_STALE_MS
      );

    const shouldFetchAnalytics = mode === "full" && !shouldReuseAnalytics;
    const [trendingIds, smartRows] = shouldFetchAnalytics
      ? await Promise.all([
          services.analytics.getTrendingIds(),
          profileId ? services.analytics.getSmartRows(profileId) : Promise.resolve([]),
        ])
      : [
          reusableSeedSnapshot?.trendingIds ?? [],
          reusableSeedSnapshot?.smartRows ?? [],
        ];

    trace.mark("content_batches_ready", {
      metricName: "home_snapshot_content_ready_ms",
      slowAboveMs: 550,
      data: {
        selectedVodCategoryCount: selectedVodCategories.length,
        selectedSeriesCategoryCount: selectedSeriesCategories.length,
        selectedLiveCategoryCount: selectedLiveCategories.length,
        analyticsFetched: shouldFetchAnalytics,
        reusedBootstrapContent: Boolean(reusableSeedSnapshot),
      },
    });

    let movies = fulfilledGroups(vodResults).flatMap((items) =>
      sampleRichItems(
        items.filter(hasUsableArtwork),
        policy.fetchItemsPerCategory,
        rankMovie,
        isRichMovieCandidate
      )
    );

    let series = fulfilledGroups(seriesResults).flatMap((items) =>
      sampleRichItems(
        items.filter(hasUsableArtwork),
        policy.fetchItemsPerCategory,
        rankSeries,
        isRichSeriesCandidate
      )
    );

    let liveStreams = fulfilledGroups(liveResults).flatMap((items) =>
      sampleItems(
        items.filter((item) => item.logoUrl),
        Math.max(policy.liveItems, policy.fetchItemsPerCategory),
        rankChannel
      )
    );

    movies = dedupeById(movies);
    series = dedupeById(series);

    if (mode === "full" && liveStreams.length < HOME_LIVE_FALLBACK_MIN) {
      try {
        const previousCount = liveStreams.length;
        const fallbackLimit = Math.max(HOME_LIVE_CACHE_CAP, policy.fetchItemsPerCategory);
        const fallbackLiveStreams = await services.content.getLiveStreams(undefined, {
          limit: fallbackLimit,
          page: 1,
          requestSource: `${contentRequestSource}_live_fallback`,
        });
        liveStreams = sampleItems(
          dedupeById(fallbackLiveStreams.filter((item) => item.logoUrl)),
          fallbackLimit,
          rankChannel
        );
        logger.info("home_snapshot_live_fallback", {
          previousCount,
          fallbackCount: fallbackLiveStreams.length,
        });
        trace.mark("live_fallback_ready", {
          metricName: "home_snapshot_live_fallback_ms",
          slowAboveMs: 250,
          data: {
            previousCount,
            fallbackCount: fallbackLiveStreams.length,
          },
        });
      } catch (error) {
        logger.warn("Home live fallback fetch failed", error);
      }
    } else {
      liveStreams = dedupeById(liveStreams);
    }

    const attemptedContentFetches =
      selectedVodCategories.length +
      selectedSeriesCategories.length +
      selectedLiveCategories.length;

    if (
      attemptedContentFetches > 0 &&
      movies.length === 0 &&
      series.length === 0 &&
      liveStreams.length === 0 &&
      allRejected([...vodResults, ...seriesResults, ...liveResults])
    ) {
      throw new Error("Unable to load home content");
    }

    logger.info("home_snapshot_built", {
      mode,
      vodCategoryCount: selectedVodCategories.length,
      seriesCategoryCount: selectedSeriesCategories.length,
      liveCategoryCount: selectedLiveCategories.length,
      movieCount: movies.length,
      seriesCount: series.length,
      liveCount: liveStreams.length,
      trendingIdCount: trendingIds.length,
      smartRowCount: smartRows.length,
    });

    const snapshot = {
      version: 4 as const,
      completeness: mode,
      generatedAt: new Date().toISOString(),
      liveCategories,
      movies,
      series,
      liveStreams,
      fetchMeta: {
        analyticsFetchedAt: shouldFetchAnalytics
          ? new Date().toISOString()
          : reusableSeedSnapshot?.fetchMeta?.analyticsFetchedAt,
        categoriesFetchedAt: new Date().toISOString(),
        contentFetchedAt: new Date().toISOString(),
        fetchedCategoryIds: {
          live: selectedLiveCategories.map((category) => category.id),
          series: selectedSeriesCategories.map((category) => category.id),
          vod: selectedVodCategories.map((category) => category.id),
        },
      },
      vodCategories,
      seriesCategories,
      trendingIds,
      smartRows,
      policy,
    };

    trace.end({
      status: "completed",
      metricName: "home_snapshot_fetch_total_ms",
      slowAboveMs: 900,
      data: {
        movieCount: movies.length,
        seriesCount: series.length,
        liveCount: liveStreams.length,
      },
    });

    return snapshot;
  } catch (error) {
    trace.fail(error, {
      metricName: "home_snapshot_fetch_total_ms",
      slowAboveMs: 900,
    });
    throw error;
  }
};

export const getHomeSnapshotQueryKey = (playlistId: string | null, profileId: string | null) =>
  ["home-snapshot", playlistId, profileId] as const;

export const getHomeBootstrapSnapshotQueryKey = (
  playlistId: string | null,
  profileId: string | null
) => ["home-snapshot-bootstrap", playlistId, profileId] as const;

export const hasFreshHomeSnapshotInCache = (
  queryClient: QueryClient,
  playlistId: string | null,
  profileId: string | null
) => {
  if (!playlistId || !profileId) return false;

  const cachedSnapshot =
    queryClient.getQueryData<PersistedHomeSnapshot>(getHomeSnapshotQueryKey(playlistId, profileId)) ??
    null;

  return (
    cachedSnapshot?.completeness === "full" &&
    hasHomeSnapshotContent(cachedSnapshot) &&
    isHomeSnapshotFresh(cachedSnapshot)
  );
};

export const hasFreshPersistedHomeSnapshot = (
  playlistId: string | null,
  profileId: string | null
) => {
  const persistedSnapshot = homeSnapshotStorage.getSnapshot(playlistId, profileId);
  return (
    persistedSnapshot?.completeness === "full" &&
    hasHomeSnapshotContent(persistedSnapshot) &&
    isHomeSnapshotFresh(persistedSnapshot)
  );
};

export const hasFreshHomeSnapshotAvailable = (
  queryClient: QueryClient,
  playlistId: string | null,
  profileId: string | null
) =>
  hasFreshHomeSnapshotInCache(queryClient, playlistId, profileId) ||
  hasFreshPersistedHomeSnapshot(playlistId, profileId);

export const hasHomeSnapshotSeedAvailable = (
  queryClient: QueryClient,
  playlistId: string | null,
  profileId: string | null
) => {
  const persistedSnapshot = homeSnapshotStorage.getSnapshot(playlistId, profileId);
  return hasHomeSnapshotContent(
    getInitialHomeSnapshotData({
      queryClient,
      playlistId,
      profileId,
      persistedSnapshot,
    })
  );
};

export const getInitialHomeSnapshotData = ({
  queryClient,
  playlistId,
  profileId,
  persistedSnapshot,
}: {
  queryClient: QueryClient;
  playlistId: string | null;
  profileId: string | null;
  persistedSnapshot: PersistedHomeSnapshot | null;
}) => {
  if (!playlistId || !profileId) {
    return persistedSnapshot;
  }

  const cachedFullSnapshot =
    queryClient.getQueryData<PersistedHomeSnapshot>(
      getHomeSnapshotQueryKey(playlistId, profileId)
    ) ?? null;

  if (cachedFullSnapshot) {
    return cachedFullSnapshot;
  }

  const cachedBootstrapSnapshot =
    queryClient.getQueryData<PersistedHomeSnapshot>(
      getHomeBootstrapSnapshotQueryKey(playlistId, profileId)
    ) ?? null;

  return cachedBootstrapSnapshot ?? persistedSnapshot;
};

export const shouldDeferFullHomeSnapshotRefresh = (
  snapshot: PersistedHomeSnapshot | null | undefined
) => {
  return snapshot?.completeness === "bootstrap" && hasHomeSnapshotContent(snapshot);
};

export const getDeferredFullHomeSnapshotRefreshDelayMs = (
  tier = resolveHomePerformanceTier()
) => HOME_DEFERRED_FULL_REFRESH_DELAY_MS_BY_TIER[tier];

export const resetHomeSnapshotRuntimeState = () => {
  deferredFullRefreshAttemptAtByScope.clear();
};

export const preloadHomeSnapshot = (
  queryClient: QueryClient,
  playlistId: string | null,
  profileId: string | null
) => {
  if (!playlistId || !profileId) {
    return Promise.resolve();
  }

  const trace = createPerfTrace("home_snapshot_preload", {
    playlistId,
    profileId,
  });

  if (hasFreshHomeSnapshotInCache(queryClient, playlistId, profileId)) {
    trace.end({
      status: "cache_hit",
      metricName: "home_snapshot_preload_total_ms",
      data: {
        source: "query-cache",
      },
    });
    return Promise.resolve(
      queryClient.getQueryData<PersistedHomeSnapshot>(getHomeSnapshotQueryKey(playlistId, profileId))
    );
  }

  const persistedSnapshot = homeSnapshotStorage.getSnapshot(playlistId, profileId);
  const queryKey = getHomeBootstrapSnapshotQueryKey(playlistId, profileId);

  return queryClient
    .fetchQuery({
      queryKey,
      queryFn: async () => {
        const bootstrapSnapshot = await fetchHomeSnapshot("bootstrap", profileId, {
          requestSource: "home_bootstrap",
          seedSnapshot: persistedSnapshot,
        });
        markStartupMarker("home_bootstrap_data_ready", {
          completeness: bootstrapSnapshot.completeness,
          movieCount: bootstrapSnapshot.movies.length,
          railSeedCount:
            bootstrapSnapshot.movies.length +
            bootstrapSnapshot.series.length +
            bootstrapSnapshot.liveStreams.length,
        });

        if (!hasHomeSnapshotContent(bootstrapSnapshot) && hasHomeSnapshotContent(persistedSnapshot)) {
          logger.info("home_snapshot_bootstrap_fallback_to_persisted", {
            profileId,
            persistedCompleteness: persistedSnapshot?.completeness ?? "none",
          });
          trace.mark("persisted_fallback_used", {
            metricName: "home_snapshot_preload_persisted_fallback_ms",
            data: {
              persistedCompleteness: persistedSnapshot?.completeness ?? "none",
            },
          });
          return persistedSnapshot as PersistedHomeSnapshot;
        }

        return bootstrapSnapshot;
      },
      initialData: persistedSnapshot ?? undefined,
      initialDataUpdatedAt: getSnapshotUpdatedAt(persistedSnapshot),
      staleTime: HOME_SNAPSHOT_STALE_MS,
      gcTime: HOME_SNAPSHOT_GC_MS,
      retry: 1,
    })
    .then((snapshot) => {
      homeSnapshotStorage.saveSnapshot(playlistId, profileId, {
        completeness: snapshot.completeness,
        generatedAt: snapshot.generatedAt,
        liveCategories: snapshot.liveCategories,
        movies: snapshot.movies,
        series: snapshot.series,
        liveStreams: snapshot.liveStreams,
        fetchMeta: snapshot.fetchMeta,
        vodCategories: snapshot.vodCategories,
        seriesCategories: snapshot.seriesCategories,
        trendingIds: snapshot.trendingIds,
        smartRows: snapshot.smartRows,
        policy: snapshot.policy,
      });
      trace.end({
        status: "completed",
        metricName: "home_snapshot_preload_total_ms",
        slowAboveMs: 800,
        data: {
          completeness: snapshot.completeness,
          movieCount: snapshot.movies.length,
          seriesCount: snapshot.series.length,
          liveCount: snapshot.liveStreams.length,
        },
      });
      return snapshot;
    })
    .catch((error) => {
      trace.fail(error, {
        metricName: "home_snapshot_preload_total_ms",
        slowAboveMs: 800,
      });
      throw error;
    });
};

export const getHomePreparationImageUrls = (
  snapshot: PersistedHomeSnapshot | null | undefined,
  continueWatching: RecentlyWatchedItem[] = [],
  profileId?: string | null
) => collectHomePreparationImageUrls(snapshot, continueWatching, profileId);

export const useHomeSnapshot = (continueWatching: RecentlyWatchedItem[]) => {
  const playlistId = playlistStorage.getActivePlaylistId();
  const profileId = useProfileStore((state) => state.activeProfile?.id ?? null);
  const queryClient = useQueryClient();
  const homePerformanceTier = useMemo(() => resolveHomePerformanceTier(), []);
  const deferredFullRefreshScopeKey =
    playlistId && profileId ? `${playlistId}:${profileId}` : null;

  const persistedSnapshot = useMemo(
    () => homeSnapshotStorage.getSnapshot(playlistId, profileId),
    [playlistId, profileId]
  );
  const initialSnapshot = useMemo(
    () =>
      getInitialHomeSnapshotData({
        queryClient,
        playlistId,
        profileId,
        persistedSnapshot,
      }),
    [persistedSnapshot, playlistId, profileId, queryClient]
  );
  const shouldDeferInitialFullRefresh = shouldDeferFullHomeSnapshotRefresh(initialSnapshot);

  const query = useQuery<PersistedHomeSnapshot>({
    queryKey: getHomeSnapshotQueryKey(playlistId, profileId),
    queryFn: () =>
      fetchHomeSnapshot("full", profileId, {
        requestSource: "home_full",
        seedSnapshot:
          queryClient.getQueryData<PersistedHomeSnapshot>(
            getHomeBootstrapSnapshotQueryKey(playlistId, profileId)
          ) ?? initialSnapshot,
      }),
    enabled: Boolean(playlistId && profileId) && !shouldDeferInitialFullRefresh,
    initialData: initialSnapshot ?? undefined,
    initialDataUpdatedAt: getSnapshotUpdatedAt(initialSnapshot),
    staleTime: HOME_SNAPSHOT_STALE_MS,
    gcTime: HOME_SNAPSHOT_GC_MS,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!playlistId || !profileId) return;
    if (!shouldDeferInitialFullRefresh) return;
    if ((query.data ?? initialSnapshot)?.completeness !== "bootstrap") return;
    if (query.fetchStatus === "fetching") return;
    if (!deferredFullRefreshScopeKey) return;

    const lastAttemptAt =
      deferredFullRefreshAttemptAtByScope.get(deferredFullRefreshScopeKey) ?? 0;
    if (Date.now() - lastAttemptAt < HOME_DEFERRED_FULL_REFRESH_RETRY_COOLDOWN_MS) {
      return;
    }

    deferredFullRefreshAttemptAtByScope.set(deferredFullRefreshScopeKey, Date.now());
    let cancelled = false;
    const timerId = window.setTimeout(() => {
      if (cancelled) return;
      void query.refetch();
    }, getDeferredFullHomeSnapshotRefreshDelayMs(homePerformanceTier));

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    deferredFullRefreshScopeKey,
    initialSnapshot,
    playlistId,
    profileId,
    query.data,
    query.fetchStatus,
    query.refetch,
    homePerformanceTier,
    shouldDeferInitialFullRefresh,
  ]);

  useEffect(() => {
    if (!query.data) return;

    if (
      deferredFullRefreshScopeKey &&
      query.data.completeness === "full" &&
      hasHomeSnapshotContent(query.data)
    ) {
      deferredFullRefreshAttemptAtByScope.delete(deferredFullRefreshScopeKey);
    }

    homeSnapshotStorage.saveSnapshot(playlistId, profileId, {
      completeness: query.data.completeness,
      generatedAt: query.data.generatedAt,
      liveCategories: query.data.liveCategories,
      movies: query.data.movies,
      series: query.data.series,
      liveStreams: query.data.liveStreams,
      fetchMeta: query.data.fetchMeta,
      vodCategories: query.data.vodCategories,
      seriesCategories: query.data.seriesCategories,
      trendingIds: query.data.trendingIds,
      smartRows: query.data.smartRows,
      policy: query.data.policy,
    });
  }, [deferredFullRefreshScopeKey, playlistId, profileId, query.data]);

  const snapshot = useMemo(() => {
    if (!query.data) return null;

    const heroItems: HeroItem[] = stabilizeHomeHeroOrder(
      profileId,
      buildHomeHeroItems(
        query.data.movies,
        query.data.series,
        query.data.liveStreams,
        continueWatching
      )
    );

    const rails: HomeRail[] = buildHomeRails(
      query.data.movies,
      query.data.series,
      query.data.liveStreams,
      continueWatching,
      query.data.vodCategories,
      query.data.seriesCategories,
      {
        ...query.data.policy,
        profileId,
        trendingIds: query.data.trendingIds,
        smartRows: query.data.smartRows,
      }
    );

    return {
      generatedAt: query.data.generatedAt,
      heroItems,
      rails,
    };
  }, [continueWatching, profileId, query.data]);

  useEffect(() => {
    if (!query.data) return;

    if (query.data.completeness === "bootstrap") {
      markStartupMarker("home_first_data_available", {
        heroCount: snapshot?.heroItems.length ?? 0,
        railCount: snapshot?.rails.length ?? 0,
      });
      return;
    }

    markStartupMarker("home_full_refresh_complete", {
      heroCount: snapshot?.heroItems.length ?? 0,
      railCount: snapshot?.rails.length ?? 0,
    });
  }, [query.data, snapshot?.heroItems.length, snapshot?.rails.length]);

  return {
    snapshot,
    isBooting: query.isPending && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    isError: query.isError && !query.data,
    refresh: () => query.refetch(),
  };
};
