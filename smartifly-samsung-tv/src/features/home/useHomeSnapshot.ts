import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import type { HeroItem } from "../../components/common/HeroBanner";
import { services } from "../../services";
import { homeSnapshotStorage, type PersistedHomeSnapshot } from "../../storage/homeSnapshotStorage";
import { playlistStorage } from "../../storage/playlistStorage";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";
import { useProfileStore } from "../../store/profileStore";
import type { AppCategory, AppChannel, AppMovie, AppSeries } from "../../types/appModels";
import { logger } from "../../utils/logger";
import { stableHash } from "../../utils/imagePolicy";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import { buildHomeHeroItems, buildHomeRails, HOME_POLICY } from "./homePolicy";
import type { HomeRail } from "./homeTypes";

const HOME_SNAPSHOT_STALE_MS = 5 * 60 * 1000;
const HOME_SNAPSHOT_GC_MS = 2 * 60 * 60 * 1000;
const HOME_PRELOAD_RAIL_COUNT = 3;
const HOME_PRELOAD_ITEMS_PER_RAIL = 6;
const HOME_BOOTSTRAP_VOD_CATEGORY_COUNT = 2;
const HOME_BOOTSTRAP_SERIES_CATEGORY_COUNT = 2;
const HOME_BOOTSTRAP_LIVE_CATEGORY_COUNT = 1;
const HOME_VOD_CATEGORY_COUNT = 4;
const HOME_SERIES_CATEGORY_COUNT = 4;
const HOME_LIVE_CATEGORY_COUNT = 1;
const HOME_MOVIE_FALLBACK_MIN = 18;
const HOME_SERIES_FALLBACK_MIN = 18;
const HOME_LIVE_FALLBACK_MIN = 10;
const HOME_LIVE_CACHE_CAP = 24;
type HomeSnapshotMode = "bootstrap" | "full";

const HOME_SNAPSHOT_CONFIG: Record<
  HomeSnapshotMode,
  {
    completeness: HomeSnapshotMode;
    vodCategoryCount: number;
    seriesCategoryCount: number;
    liveCategoryCount: number;
    includeFallbackFetches: boolean;
  }
> = {
  bootstrap: {
    completeness: "bootstrap",
    vodCategoryCount: HOME_BOOTSTRAP_VOD_CATEGORY_COUNT,
    seriesCategoryCount: HOME_BOOTSTRAP_SERIES_CATEGORY_COUNT,
    liveCategoryCount: HOME_BOOTSTRAP_LIVE_CATEGORY_COUNT,
    includeFallbackFetches: false,
  },
  full: {
    completeness: "full",
    vodCategoryCount: HOME_VOD_CATEGORY_COUNT,
    seriesCategoryCount: HOME_SERIES_CATEGORY_COUNT,
    liveCategoryCount: HOME_LIVE_CATEGORY_COUNT,
    includeFallbackFetches: true,
  },
};

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

const fetchHomeSnapshot = async (mode: HomeSnapshotMode): Promise<PersistedHomeSnapshot> => {
  const config = HOME_SNAPSHOT_CONFIG[mode];
  const categoryResults = await Promise.allSettled([
    services.content.getVodCategories(),
    services.content.getSeriesCategories(),
    services.content.getLiveCategories(),
  ]);

  if (allRejected(categoryResults)) {
    throw new Error("Unable to load home categories");
  }

  const vodCategories = categoryResults[0]?.status === "fulfilled" ? categoryResults[0].value : [];
  const seriesCategories = categoryResults[1]?.status === "fulfilled" ? categoryResults[1].value : [];
  const liveCategories = categoryResults[2]?.status === "fulfilled" ? categoryResults[2].value : [];

  const selectedVodCategories = selectCategories(vodCategories, config.vodCategoryCount);
  const selectedSeriesCategories = selectCategories(seriesCategories, config.seriesCategoryCount);
  const selectedLiveCategories = selectCategories(liveCategories, config.liveCategoryCount);

  const [vodResults, seriesResults, liveResults] = await Promise.all([
    Promise.allSettled(
      selectedVodCategories.map((category) => services.content.getVodStreams(category.id))
    ),
    Promise.allSettled(
      selectedSeriesCategories.map((category) => services.content.getSeries(category.id))
    ),
    Promise.allSettled(
      selectedLiveCategories.map((category) => services.content.getLiveStreams(category.id))
    ),
  ]);

  let movies = fulfilledGroups(vodResults).flatMap((items) =>
    sampleRichItems(
      items.filter(hasUsableArtwork),
      HOME_POLICY.vodRailCap,
      rankMovie,
      isRichMovieCandidate
    )
  );

  let series = fulfilledGroups(seriesResults).flatMap((items) =>
    sampleRichItems(
      items.filter(hasUsableArtwork),
      HOME_POLICY.seriesRailCap,
      rankSeries,
      isRichSeriesCandidate
    )
  );

  let liveStreams = fulfilledGroups(liveResults).flatMap((items) =>
    sampleItems(
      items.filter((item) => item.logoUrl),
      HOME_POLICY.liveRailCap,
      rankChannel
    )
  );

  movies = dedupeById(movies);

  series = dedupeById(series);

  if (config.includeFallbackFetches && liveStreams.length < HOME_LIVE_FALLBACK_MIN) {
    try {
      const previousCount = liveStreams.length;
      const fallbackLiveStreams = await services.content.getLiveStreams();
      liveStreams = sampleItems(
        dedupeById(
          fallbackLiveStreams.filter((item) => item.logoUrl)
        ),
        HOME_LIVE_CACHE_CAP,
        rankChannel
      );
      logger.info("home_snapshot_live_fallback", {
        previousCount,
        fallbackCount: fallbackLiveStreams.length,
      });
    } catch (error) {
      logger.warn("Home live fallback fetch failed", error);
    }
  } else {
    liveStreams = dedupeById(liveStreams);
  }

  const attemptedContentFetches =
    selectedVodCategories.length + selectedSeriesCategories.length + selectedLiveCategories.length;

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
  });

  return {
    version: 2,
    completeness: config.completeness,
    generatedAt: new Date().toISOString(),
    movies,
    series,
    liveStreams,
    vodCategories: selectedVodCategories,
    seriesCategories: selectedSeriesCategories,
  };
};

export const getHomeSnapshotQueryKey = (playlistId: string | null, profileId: string | null) =>
  ["home-snapshot", playlistId, profileId] as const;

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

export const preloadHomeSnapshot = (
  queryClient: QueryClient,
  playlistId: string | null,
  profileId: string | null
) => {
  if (!playlistId || !profileId) {
    return Promise.resolve();
  }

  if (hasFreshHomeSnapshotInCache(queryClient, playlistId, profileId)) {
    return Promise.resolve(
      queryClient.getQueryData<PersistedHomeSnapshot>(getHomeSnapshotQueryKey(playlistId, profileId))
    );
  }

  const persistedSnapshot = homeSnapshotStorage.getSnapshot(playlistId, profileId);
  const queryKey = getHomeSnapshotQueryKey(playlistId, profileId);

  return queryClient.fetchQuery({
    queryKey,
    queryFn: async () => {
      const bootstrapSnapshot = await fetchHomeSnapshot("bootstrap");

      if (!hasHomeSnapshotContent(bootstrapSnapshot) && hasHomeSnapshotContent(persistedSnapshot)) {
        logger.info("home_snapshot_bootstrap_fallback_to_persisted", {
          profileId,
          persistedCompleteness: persistedSnapshot?.completeness ?? "none",
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
  });
};

export const getHomePreparationImageUrls = (
  snapshot: PersistedHomeSnapshot | null | undefined,
  continueWatching: RecentlyWatchedItem[] = []
) => {
  if (!snapshot) return [];

  const heroItems = buildHomeHeroItems(
    snapshot.movies,
    snapshot.series,
    snapshot.liveStreams,
    continueWatching
  );
  const rails = buildHomeRails(
    snapshot.movies,
    snapshot.series,
    snapshot.liveStreams,
    continueWatching,
    snapshot.vodCategories,
    snapshot.seriesCategories
  );

  const urls = new Set<string>();
  const activeHero = heroItems[0];
  if (activeHero?.backdropUrl) {
    urls.add(activeHero.backdropUrl);
  }

  rails
    .slice(0, HOME_PRELOAD_RAIL_COUNT)
    .forEach((rail) => {
      rail.items.slice(0, HOME_PRELOAD_ITEMS_PER_RAIL).forEach((item) => {
        const url = item.imageUrl || item.backdropUrl;
        if (url) {
          urls.add(url);
        }
      });
    });

  return [...urls];
};

export const useHomeSnapshot = (continueWatching: RecentlyWatchedItem[]) => {
  const playlistId = playlistStorage.getActivePlaylistId();
  const profileId = useProfileStore((state) => state.activeProfile?.id ?? null);
  const imageFailureRevision = useSyncExternalStore(
    imageFailureMemory.subscribe,
    imageFailureMemory.getRevision,
    () => 0
  );

  const persistedSnapshot = useMemo(
    () => homeSnapshotStorage.getSnapshot(playlistId, profileId),
    [playlistId, profileId]
  );

  const query = useQuery<PersistedHomeSnapshot>({
    queryKey: getHomeSnapshotQueryKey(playlistId, profileId),
    queryFn: () => fetchHomeSnapshot("full"),
    enabled: Boolean(playlistId && profileId),
    initialData: persistedSnapshot ?? undefined,
    initialDataUpdatedAt: getSnapshotUpdatedAt(persistedSnapshot),
    staleTime: HOME_SNAPSHOT_STALE_MS,
    gcTime: HOME_SNAPSHOT_GC_MS,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!query.data) return;

    homeSnapshotStorage.saveSnapshot(playlistId, profileId, {
      completeness: query.data.completeness,
      generatedAt: query.data.generatedAt,
      movies: query.data.movies,
      series: query.data.series,
      liveStreams: query.data.liveStreams,
      vodCategories: query.data.vodCategories,
      seriesCategories: query.data.seriesCategories,
    });
  }, [playlistId, profileId, query.data]);

  const snapshot = useMemo(() => {
    if (!query.data) return null;

    const heroItems: HeroItem[] = buildHomeHeroItems(
      query.data.movies,
      query.data.series,
      query.data.liveStreams,
      continueWatching
    );

    const rails: HomeRail[] = buildHomeRails(
      query.data.movies,
      query.data.series,
      query.data.liveStreams,
      continueWatching,
      query.data.vodCategories,
      query.data.seriesCategories
    );

    return {
      generatedAt: query.data.generatedAt,
      heroItems,
      rails,
    };
  }, [continueWatching, imageFailureRevision, query.data]);

  return {
    snapshot,
    isBooting: query.isPending && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    isError: query.isError && !query.data,
    refresh: () => query.refetch(),
  };
};
