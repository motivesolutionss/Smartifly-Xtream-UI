import { services } from "../../services";
import type { AppChannel, AppMovie, AppSeries } from "../../types/appModels";
import { createPerfTrace } from "../../utils/perfTrace";
import { rankSearchMatches, toCompactSearchKey } from "./searchRanking";
import type {
  SearchCatalogLiveEntry,
  SearchCatalogSeriesEntry,
  SearchCatalogVodEntry,
} from "./searchCatalogTypes";

export type SearchRemoteResults = {
  live: AppChannel[];
  vod: AppMovie[];
  series: AppSeries[];
};

const REMOTE_SEARCH_FETCH_LIMITS = {
  live: 36,
  vod: 48,
  series: 48,
} as const;

const REMOTE_SEARCH_RESULT_LIMITS = {
  live: 24,
  vod: 30,
  series: 30,
} as const;

const toLiveEntry = (item: AppChannel): SearchCatalogLiveEntry => ({
  id: item.id,
  title: item.title,
  titleLower: item.title.toLowerCase(),
  titleCompact: toCompactSearchKey(item.title),
  categoryId: item.categoryId,
  imageUrl: item.logoUrl,
  type: "live",
});

const toVodEntry = (item: AppMovie): SearchCatalogVodEntry => ({
  id: item.id,
  title: item.title,
  titleLower: item.title.toLowerCase(),
  titleCompact: toCompactSearchKey(item.title),
  categoryId: item.categoryId,
  imageUrl: item.posterUrl || item.backdropUrl,
  type: "vod",
});

const toSeriesEntry = (item: AppSeries): SearchCatalogSeriesEntry => ({
  id: item.id,
  title: item.title,
  titleLower: item.title.toLowerCase(),
  titleCompact: toCompactSearchKey(item.title),
  categoryId: item.categoryId,
  imageUrl: item.posterUrl || item.backdropUrl,
  type: "series",
});

const dedupeById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const rankLiveResults = (items: AppChannel[], lowerQuery: string) => {
  const uniqueItems = dedupeById(items);
  const rankedIds = rankSearchMatches(
    uniqueItems.map(toLiveEntry),
    lowerQuery,
    new Set<string>(),
    REMOTE_SEARCH_RESULT_LIMITS.live
  ).map((entry) => entry.id);
  const order = new Map(rankedIds.map((id, index) => [id, index]));

  return uniqueItems
    .filter((item) => order.has(item.id))
    .sort((left, right) => {
      return (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
    });
};

const rankVodResults = (items: AppMovie[], lowerQuery: string) => {
  const uniqueItems = dedupeById(items);
  const rankedIds = rankSearchMatches(
    uniqueItems.map(toVodEntry),
    lowerQuery,
    new Set<string>(),
    REMOTE_SEARCH_RESULT_LIMITS.vod
  ).map((entry) => entry.id);
  const order = new Map(rankedIds.map((id, index) => [id, index]));

  return uniqueItems
    .filter((item) => order.has(item.id))
    .sort((left, right) => {
      return (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
    });
};

const rankSeriesResults = (items: AppSeries[], lowerQuery: string) => {
  const uniqueItems = dedupeById(items);
  const rankedIds = rankSearchMatches(
    uniqueItems.map(toSeriesEntry),
    lowerQuery,
    new Set<string>(),
    REMOTE_SEARCH_RESULT_LIMITS.series
  ).map((entry) => entry.id);
  const order = new Map(rankedIds.map((id, index) => [id, index]));

  return uniqueItems
    .filter((item) => order.has(item.id))
    .sort((left, right) => {
      return (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
    });
};

export const searchContentRemotely = async (query: string): Promise<SearchRemoteResults> => {
  const lowerQuery = query.trim().toLowerCase();
  if (lowerQuery.length < 3) {
    return { live: [], vod: [], series: [] };
  }

  const trace = createPerfTrace("search_remote_fetch", {
    query: lowerQuery,
  });

  try {
    const results = await Promise.allSettled([
      services.content.searchLiveStreams(query, undefined, {
        limit: REMOTE_SEARCH_FETCH_LIMITS.live,
        page: 1,
      }),
      services.content.searchVodStreams(query, undefined, {
        limit: REMOTE_SEARCH_FETCH_LIMITS.vod,
        page: 1,
      }),
      services.content.searchSeries(query, undefined, {
        limit: REMOTE_SEARCH_FETCH_LIMITS.series,
        page: 1,
      }),
    ]);

    const live = results[0].status === "fulfilled" ? results[0].value : [];
    const vod = results[1].status === "fulfilled" ? results[1].value : [];
    const series = results[2].status === "fulfilled" ? results[2].value : [];

    if (live.length === 0 && vod.length === 0 && series.length === 0) {
      const firstRejected = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );
      if (firstRejected) {
        throw firstRejected.reason;
      }
    }

    const rankedResults = {
      live: rankLiveResults(live, lowerQuery),
      vod: rankVodResults(vod, lowerQuery),
      series: rankSeriesResults(series, lowerQuery),
    };

    trace.end({
      status: "completed",
      metricName: "search_remote_fetch_total_ms",
      slowAboveMs: 650,
      data: {
        liveCount: rankedResults.live.length,
        vodCount: rankedResults.vod.length,
        seriesCount: rankedResults.series.length,
      },
    });

    return rankedResults;
  } catch (error) {
    trace.fail(error, {
      metricName: "search_remote_fetch_total_ms",
      slowAboveMs: 650,
    });
    throw error;
  }
};

export const mergeSearchResults = (
  primary: SearchRemoteResults,
  fallback: SearchRemoteResults
): SearchRemoteResults => {
  const mergeBucket = <T extends { id: string }>(first: T[], second: T[]) => {
    const merged = new Map<string, T>();
    [...first, ...second].forEach((item) => {
      if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    });
    return [...merged.values()];
  };

  return {
    live: mergeBucket(primary.live, fallback.live),
    vod: mergeBucket(primary.vod, fallback.vod),
    series: mergeBucket(primary.series, fallback.series),
  };
};
