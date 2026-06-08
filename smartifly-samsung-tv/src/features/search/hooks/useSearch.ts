import { useMemo } from "react";
import type { AppCategory, AppChannel, AppMovie, AppSeries } from "../../../types/appModels";
import { useSearchCatalog } from "./useSearchCatalog";
import type {
  IndexedSearchCatalogEntry,
  SearchCatalogEntry,
  SearchCatalogLiveEntry,
  SearchCatalogSeriesEntry,
  SearchCatalogVodEntry,
} from "../searchCatalogTypes";

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

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const GENERIC_QUERY_TOKENS = new Set([
  "vod",
  "live",
  "series",
  "show",
  "shows",
  "movie",
  "movies",
  "channel",
  "channels",
  "pick",
  "picks",
]);

const matchCategory = (categoryName: string, lowerQuery: string) => {
  const nameLower = categoryName.toLowerCase();

  if (nameLower.includes(lowerQuery) || lowerQuery.includes(nameLower)) {
    return true;
  }

  const queryTokens = lowerQuery.split(/\s+/).filter((token) => token.length >= 3);

  for (const token of queryTokens) {
    if (GENERIC_QUERY_TOKENS.has(token) && nameLower !== token) {
      continue;
    }

    if (nameLower.includes(token)) {
      return true;
    }
  }

  return false;
};

const getMatchingCategoryIds = (categories: AppCategory[], lowerQuery: string) =>
  new Set(
    categories
      .filter((category) => matchCategory(category.name, lowerQuery))
      .map((category) => category.id)
  );

const buildWordRegex = (lowerQuery: string) => {
  try {
    const escapedQuery = escapeRegExp(lowerQuery);
    return new RegExp(`\\b${escapedQuery}\\b`, "i");
  } catch {
    return null;
  }
};

const rankMatches = <T extends SearchCatalogEntry>(
  entries: IndexedSearchCatalogEntry<T>[],
  lowerQuery: string,
  matchingCategoryIds: Set<string>,
  limit: number
) => {
  if (entries.length === 0 || limit <= 0) {
    return [];
  }

  const exactMatches: IndexedSearchCatalogEntry<T>[] = [];
  const prefixMatches: IndexedSearchCatalogEntry<T>[] = [];
  const wordMatches: IndexedSearchCatalogEntry<T>[] = [];
  const containsMatches: IndexedSearchCatalogEntry<T>[] = [];
  const categoryMatches: IndexedSearchCatalogEntry<T>[] = [];
  const wordRegex = buildWordRegex(lowerQuery);

  for (const entry of entries) {
    const titleLower = entry.titleLower;

    if (titleLower === lowerQuery) {
      exactMatches.push(entry);
      continue;
    }

    if (titleLower.startsWith(lowerQuery)) {
      prefixMatches.push(entry);
      continue;
    }

    // Once we already have enough exact/prefix hits, lower-confidence buckets
    // cannot affect the top limited result set.
    if (exactMatches.length + prefixMatches.length >= limit) {
      continue;
    }

    const titleContainsQuery = titleLower.includes(lowerQuery);
    if (titleContainsQuery) {
      if (wordRegex?.test(titleLower)) {
        wordMatches.push(entry);
      } else {
        containsMatches.push(entry);
      }
      continue;
    }

    if (entry.categoryId && matchingCategoryIds.has(entry.categoryId)) {
      categoryMatches.push(entry);
    }
  }

  return [
    ...exactMatches,
    ...prefixMatches,
    ...wordMatches,
    ...containsMatches,
    ...categoryMatches,
  ].slice(0, limit);
};

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
  const shouldSearch = query.length >= 3;
  const { snapshot, status, error, refresh, isSyncing } = useSearchCatalog(shouldSearch);

  const data = useMemo<SearchResults>(() => {
    if (!shouldSearch || !snapshot) {
      return EMPTY_RESULTS;
    }

    const lowerQuery = query.toLowerCase();
    const matchingLiveCategoryIds = getMatchingCategoryIds(snapshot.categories.live, lowerQuery);
    const matchingVodCategoryIds = getMatchingCategoryIds(snapshot.categories.vod, lowerQuery);
    const matchingSeriesCategoryIds = getMatchingCategoryIds(
      snapshot.categories.series,
      lowerQuery
    );

    return {
      live: rankMatches(
        snapshot.indexed.live,
        lowerQuery,
        matchingLiveCategoryIds,
        SEARCH_RESULT_LIMITS.live
      ).map(toLiveResult),
      vod: rankMatches(
        snapshot.indexed.vod,
        lowerQuery,
        matchingVodCategoryIds,
        SEARCH_RESULT_LIMITS.vod
      ).map(toVodResult),
      series: rankMatches(
        snapshot.indexed.series,
        lowerQuery,
        matchingSeriesCategoryIds,
        SEARCH_RESULT_LIMITS.series
      ).map(toSeriesResult),
    };
  }, [query, shouldSearch, snapshot]);

  return {
    data,
    isLoading: shouldSearch ? isSyncing && !snapshot : false,
    isRefreshing: shouldSearch ? isSyncing && Boolean(snapshot) : false,
    isError: status === "error" && !snapshot,
    error,
    refetch: refresh,
    isPartialCatalog: snapshot?.completeness === "partial",
  };
};
