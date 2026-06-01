import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { HeroItem } from "../../components/common/HeroBanner";
import { services } from "../../services";
import { homeSnapshotStorage, type PersistedHomeSnapshot } from "../../storage/homeSnapshotStorage";
import { playlistStorage } from "../../storage/playlistStorage";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";
import { useProfileStore } from "../../store/profileStore";
import type { AppCategory, AppChannel, AppMovie, AppSeries } from "../../types/appModels";
import { logger } from "../../utils/logger";
import { stableHash } from "../../utils/imagePolicy";
import { buildHomeHeroItems, buildHomeRails, HOME_POLICY } from "./homePolicy";
import type { HomeRail } from "./homeTypes";

const HOME_SNAPSHOT_STALE_MS = 5 * 60 * 1000;
const HOME_SNAPSHOT_GC_MS = 2 * 60 * 60 * 1000;
const HOME_VOD_CATEGORY_COUNT = 2;
const HOME_SERIES_CATEGORY_COUNT = 2;
const HOME_LIVE_CATEGORY_COUNT = 1;
const HOME_MOVIE_FALLBACK_MIN = 18;
const HOME_SERIES_FALLBACK_MIN = 18;
const HOME_LIVE_FALLBACK_MIN = 10;
const HOME_MOVIE_CACHE_CAP = 40;
const HOME_SERIES_CACHE_CAP = 40;
const HOME_LIVE_CACHE_CAP = 24;

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

const sampleItems = <T>(items: T[], limit: number, rank: (item: T) => number) => {
  return [...items].sort((left, right) => rank(right) - rank(left)).slice(0, limit);
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

const getSnapshotUpdatedAt = (snapshot: PersistedHomeSnapshot | null) => {
  if (!snapshot) return undefined;
  if (isSparseSnapshot(snapshot)) return 0;
  const timestamp = Date.parse(snapshot.generatedAt);
  return Number.isNaN(timestamp) ? undefined : timestamp;
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

const fetchHomeSnapshot = async (): Promise<PersistedHomeSnapshot> => {
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

  const selectedVodCategories = selectCategories(vodCategories, HOME_VOD_CATEGORY_COUNT);
  const selectedSeriesCategories = selectCategories(seriesCategories, HOME_SERIES_CATEGORY_COUNT);
  const selectedLiveCategories = selectCategories(liveCategories, HOME_LIVE_CATEGORY_COUNT);

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
    sampleItems(
      items.filter((item) => item.posterUrl || item.backdropUrl),
      HOME_POLICY.vodRailCap,
      rankMovie
    )
  );

  let series = fulfilledGroups(seriesResults).flatMap((items) =>
    sampleItems(
      items.filter((item) => item.posterUrl || item.backdropUrl),
      HOME_POLICY.seriesRailCap,
      rankSeries
    )
  );

  let liveStreams = fulfilledGroups(liveResults).flatMap((items) =>
    sampleItems(
      items.filter((item) => item.logoUrl),
      HOME_POLICY.liveRailCap,
      rankChannel
    )
  );

  if (movies.length < HOME_MOVIE_FALLBACK_MIN) {
    try {
      const previousCount = movies.length;
      const fallbackMovies = await services.content.getVodStreams();
      movies = sampleItems(
        dedupeById(
          fallbackMovies.filter((item) => item.posterUrl || item.backdropUrl)
        ),
        HOME_MOVIE_CACHE_CAP,
        rankMovie
      );
      logger.info("home_snapshot_movie_fallback", {
        previousCount,
        fallbackCount: fallbackMovies.length,
      });
    } catch (error) {
      logger.warn("Home movie fallback fetch failed", error);
    }
  } else {
    movies = dedupeById(movies);
  }

  if (series.length < HOME_SERIES_FALLBACK_MIN) {
    try {
      const previousCount = series.length;
      const fallbackSeries = await services.content.getSeries();
      series = sampleItems(
        dedupeById(
          fallbackSeries.filter((item) => item.posterUrl || item.backdropUrl)
        ),
        HOME_SERIES_CACHE_CAP,
        rankSeries
      );
      logger.info("home_snapshot_series_fallback", {
        previousCount,
        fallbackCount: fallbackSeries.length,
      });
    } catch (error) {
      logger.warn("Home series fallback fetch failed", error);
    }
  } else {
    series = dedupeById(series);
  }

  if (liveStreams.length < HOME_LIVE_FALLBACK_MIN) {
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
    vodCategoryCount: selectedVodCategories.length,
    seriesCategoryCount: selectedSeriesCategories.length,
    liveCategoryCount: selectedLiveCategories.length,
    movieCount: movies.length,
    seriesCount: series.length,
    liveCount: liveStreams.length,
  });

  return {
    generatedAt: new Date().toISOString(),
    movies,
    series,
    liveStreams,
    vodCategories: selectedVodCategories,
    seriesCategories: selectedSeriesCategories,
  };
};

export const useHomeSnapshot = (continueWatching: RecentlyWatchedItem[]) => {
  const playlistId = playlistStorage.getActivePlaylistId();
  const profileId = useProfileStore((state) => state.activeProfile?.id ?? null);

  const persistedSnapshot = useMemo(
    () => homeSnapshotStorage.getSnapshot(playlistId, profileId),
    [playlistId, profileId]
  );

  const query = useQuery<PersistedHomeSnapshot>({
    queryKey: ["home-snapshot", playlistId, profileId],
    queryFn: fetchHomeSnapshot,
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
  }, [continueWatching, query.data]);

  return {
    snapshot,
    isBooting: query.isPending && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    isError: query.isError && !query.data,
    refresh: () => query.refetch(),
  };
};
