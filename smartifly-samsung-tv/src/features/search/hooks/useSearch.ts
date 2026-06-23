import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AppChannel, AppMovie, AppSeries } from "../../../types/appModels";
import { perfMetrics } from "../../../utils/perfMetrics";
import { createPerfTrace } from "../../../utils/perfTrace";
import { useSearchCatalog } from "./useSearchCatalog";
import type {
  SearchCatalogLiveEntry,
  SearchCatalogSeriesEntry,
  SearchCatalogVodEntry,
} from "../searchCatalogTypes";
import { getMatchingCategoryIds, rankSearchMatches } from "../searchRanking";
import { mergeSearchResults, searchContentRemotely } from "../searchRemoteService";

export interface SearchResults {
  live: AppChannel[];
  vod: AppMovie[];
  series: AppSeries[];
}

const EMPTY_RESULTS: SearchResults = {
  live: [],
  vod: [],
  series: [],
};

const SEARCH_RESULT_LIMITS = {
  live: 24,
  vod: 30,
  series: 30,
} as const;

const toLiveResult = (entry: SearchCatalogLiveEntry): AppChannel => ({
  id: entry.id,
  title: entry.title,
  logoUrl: entry.imageUrl,
  categoryId: entry.categoryId,
  streamType: "live",
});

const toVodResult = (entry: SearchCatalogVodEntry): AppMovie => ({
  id: entry.id,
  title: entry.title,
  posterUrl: entry.imageUrl,
  categoryId: entry.categoryId,
});

const toSeriesResult = (entry: SearchCatalogSeriesEntry): AppSeries => ({
  id: entry.id,
  title: entry.title,
  posterUrl: entry.imageUrl,
  categoryId: entry.categoryId,
});

export const useSearch = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  const shouldSearch = normalizedQuery.length >= 3;
  const { snapshot, status, error, refresh, isSyncing } = useSearchCatalog(shouldSearch);
  const searchTraceRef = useRef<ReturnType<typeof createPerfTrace> | null>(null);
  const localReadyQueryRef = useRef<string | null>(null);
  const completedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldSearch) {
      if (searchTraceRef.current && !searchTraceRef.current.isClosed()) {
        searchTraceRef.current.end({
          status: "cleared",
          metricName: "search_query_total_ms",
        });
      }
      searchTraceRef.current = null;
      localReadyQueryRef.current = null;
      completedQueryRef.current = null;
      return;
    }

    if (
      searchTraceRef.current &&
      !searchTraceRef.current.isClosed() &&
      completedQueryRef.current !== normalizedQuery
    ) {
      searchTraceRef.current.end({
        status: "replaced",
        metricName: "search_query_total_ms",
      });
    }

    searchTraceRef.current = createPerfTrace("search_query", {
      query: normalizedQuery,
    });
    localReadyQueryRef.current = null;
    completedQueryRef.current = null;
  }, [normalizedQuery, shouldSearch]);

  const remoteQuery = useQuery({
    queryKey: ["search-remote", query],
    queryFn: () => searchContentRemotely(query),
    enabled: shouldSearch,
    retry: 1,
    staleTime: 30 * 1000,
  });

  const localData = useMemo<SearchResults>(() => {
    if (!shouldSearch || !snapshot) {
      return EMPTY_RESULTS;
    }

    const computeStartedAt = performance.now();
    const matchingLiveCategoryIds = getMatchingCategoryIds(
      snapshot.categories.live,
      normalizedQuery
    );
    const matchingVodCategoryIds = getMatchingCategoryIds(snapshot.categories.vod, normalizedQuery);
    const matchingSeriesCategoryIds = getMatchingCategoryIds(
      snapshot.categories.series,
      normalizedQuery
    );

    const results = {
      live: rankSearchMatches(
        snapshot.indexed.live,
        normalizedQuery,
        matchingLiveCategoryIds,
        SEARCH_RESULT_LIMITS.live
      ).map(toLiveResult),
      vod: rankSearchMatches(
        snapshot.indexed.vod,
        normalizedQuery,
        matchingVodCategoryIds,
        SEARCH_RESULT_LIMITS.vod
      ).map(toVodResult),
      series: rankSearchMatches(
        snapshot.indexed.series,
        normalizedQuery,
        matchingSeriesCategoryIds,
        SEARCH_RESULT_LIMITS.series
      ).map(toSeriesResult),
    };
    const computeDurationMs = performance.now() - computeStartedAt;

    perfMetrics.recordDuration("search_local_compute_ms", computeDurationMs, {
      slowAboveMs: 50,
      data: {
        query: normalizedQuery,
        liveCount: results.live.length,
        vodCount: results.vod.length,
        seriesCount: results.series.length,
      },
      logSlowEvent: false,
    });

    if (
      searchTraceRef.current &&
      !searchTraceRef.current.isClosed() &&
      localReadyQueryRef.current !== normalizedQuery &&
      (results.live.length > 0 || results.vod.length > 0 || results.series.length > 0)
    ) {
      localReadyQueryRef.current = normalizedQuery;
      searchTraceRef.current.mark("local_ready", {
        metricName: "search_local_ready_ms",
        slowAboveMs: 80,
        data: {
          liveCount: results.live.length,
          vodCount: results.vod.length,
          seriesCount: results.series.length,
        },
      });
    }

    return results;
  }, [normalizedQuery, shouldSearch, snapshot]);

  const data = useMemo<SearchResults>(() => {
    if (!shouldSearch) {
      return EMPTY_RESULTS;
    }

    if (!remoteQuery.data) {
      return localData;
    }

    return mergeSearchResults(remoteQuery.data, localData);
  }, [localData, remoteQuery.data, shouldSearch]);

  const hasLocalResults =
    localData.live.length > 0 || localData.vod.length > 0 || localData.series.length > 0;

  useEffect(() => {
    if (!shouldSearch || !searchTraceRef.current || searchTraceRef.current.isClosed()) {
      return;
    }

    if (completedQueryRef.current === normalizedQuery) {
      return;
    }

    if (remoteQuery.data) {
      completedQueryRef.current = normalizedQuery;
      searchTraceRef.current.end({
        status: "remote_ready",
        metricName: "search_query_total_ms",
        slowAboveMs: 650,
        data: {
          liveCount: remoteQuery.data.live.length,
          vodCount: remoteQuery.data.vod.length,
          seriesCount: remoteQuery.data.series.length,
        },
      });
      return;
    }

    if (remoteQuery.isError) {
      completedQueryRef.current = normalizedQuery;
      if (hasLocalResults) {
        searchTraceRef.current.end({
          status: "remote_failed_local_fallback",
          metricName: "search_query_total_ms",
          slowAboveMs: 650,
          data: {
            localLiveCount: localData.live.length,
            localVodCount: localData.vod.length,
            localSeriesCount: localData.series.length,
          },
        });
      } else {
        searchTraceRef.current.fail(remoteQuery.error, {
          metricName: "search_query_total_ms",
          slowAboveMs: 650,
        });
      }
    }
  }, [hasLocalResults, localData, normalizedQuery, remoteQuery.data, remoteQuery.error, remoteQuery.isError, shouldSearch]);

  return {
    data,
    isLoading: shouldSearch ? remoteQuery.isPending && !hasLocalResults : false,
    isRefreshing: shouldSearch ? remoteQuery.isFetching || isSyncing : false,
    isError: (remoteQuery.isError && !hasLocalResults) || (status === "error" && !snapshot),
    error: remoteQuery.error ?? error,
    refetch: () => {
      void remoteQuery.refetch();
      void refresh();
    },
    isPartialCatalog: snapshot?.completeness === "partial",
  };
};
