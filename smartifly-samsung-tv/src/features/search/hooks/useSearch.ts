import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { services } from "../../../services";
import type {
  AppCategory,
  AppChannel,
  AppMovie,
  AppSeries,
} from "../../../types/appModels";

export interface SearchResults {
  live: AppChannel[];
  vod: AppMovie[];
  series: AppSeries[];
}

type SearchCorpus = {
  live: AppChannel[];
  vod: AppMovie[];
  series: AppSeries[];
  liveCats: AppCategory[];
  vodCats: AppCategory[];
  seriesCats: AppCategory[];
};

type SearchableItem = AppChannel | AppMovie | AppSeries;

type SearchIndexEntry<T extends SearchableItem> = {
  item: T;
  titleLower: string;
};

type SearchIndex = {
  live: SearchIndexEntry<AppChannel>[];
  vod: SearchIndexEntry<AppMovie>[];
  series: SearchIndexEntry<AppSeries>[];
};

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

const SEARCH_CORPUS_STALE_TIME_MS = 15 * 60 * 1000;
const SEARCH_CORPUS_GC_TIME_MS = 30 * 60 * 1000;

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

const buildIndex = <T extends SearchableItem>(items: T[]): SearchIndexEntry<T>[] =>
  items.map((item) => ({
    item,
    titleLower: item.title.toLowerCase(),
  }));

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

const getMatchingCategoryIds = (
  categories: AppCategory[],
  lowerQuery: string
) =>
  new Set(
    categories
      .filter((category) => matchCategory(category.name, lowerQuery))
      .map((category) => category.id)
  );

const calculateRelevanceScore = (
  titleLower: string,
  item: SearchableItem,
  lowerQuery: string,
  matchingCategoryIds: Set<string>
) => {
  if (titleLower === lowerQuery) return 100;
  if (titleLower.startsWith(lowerQuery)) return 80;

  try {
    const escapedQuery = escapeRegExp(lowerQuery);
    const wordRegex = new RegExp(`\\b${escapedQuery}\\b`, "i");
    if (wordRegex.test(titleLower)) return 60;
  } catch {
    // Ignore invalid regex construction and fall through to safer checks.
  }

  if (titleLower.includes(lowerQuery)) return 40;
  if (item.categoryId && matchingCategoryIds.has(item.categoryId)) return 20;

  return 0;
};

const rankMatches = <T extends SearchableItem>(
  entries: SearchIndexEntry<T>[],
  lowerQuery: string,
  matchingCategoryIds: Set<string>,
  limit: number
) =>
  entries
    .map((entry) => ({
      item: entry.item,
      score: calculateRelevanceScore(
        entry.titleLower,
        entry.item,
        lowerQuery,
        matchingCategoryIds
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);

const fetchSearchCorpus = async (): Promise<SearchCorpus> => {
  const results = await Promise.allSettled([
    services.content.getLiveStreams(),
    services.content.getVodStreams(),
    services.content.getSeries(),
    services.content.getLiveCategories(),
    services.content.getVodCategories(),
    services.content.getSeriesCategories(),
  ]);

  const live = results[0].status === "fulfilled" ? results[0].value : [];
  const vod = results[1].status === "fulfilled" ? results[1].value : [];
  const series = results[2].status === "fulfilled" ? results[2].value : [];
  const liveCats = results[3].status === "fulfilled" ? results[3].value : [];
  const vodCats = results[4].status === "fulfilled" ? results[4].value : [];
  const seriesCats = results[5].status === "fulfilled" ? results[5].value : [];

  if (
    results[0].status === "rejected" &&
    results[1].status === "rejected" &&
    results[2].status === "rejected"
  ) {
    throw results[0].reason;
  }

  return {
    live,
    vod,
    series,
    liveCats,
    vodCats,
    seriesCats,
  };
};

export const useSearch = (query: string) => {
  const shouldSearch = query.length >= 3;

  const corpusQuery = useQuery<SearchCorpus>({
    queryKey: ["search-corpus"],
    queryFn: fetchSearchCorpus,
    enabled: shouldSearch,
    retry: false,
    staleTime: SEARCH_CORPUS_STALE_TIME_MS,
    gcTime: SEARCH_CORPUS_GC_TIME_MS,
  });

  const searchIndex = useMemo<SearchIndex | null>(() => {
    if (!corpusQuery.data) return null;

    return {
      live: buildIndex(corpusQuery.data.live),
      vod: buildIndex(corpusQuery.data.vod),
      series: buildIndex(corpusQuery.data.series),
    };
  }, [corpusQuery.data]);

  const data = useMemo<SearchResults>(() => {
    if (!shouldSearch || !corpusQuery.data || !searchIndex) {
      return EMPTY_RESULTS;
    }

    const lowerQuery = query.toLowerCase();
    const matchingLiveCategoryIds = getMatchingCategoryIds(
      corpusQuery.data.liveCats,
      lowerQuery
    );
    const matchingVodCategoryIds = getMatchingCategoryIds(
      corpusQuery.data.vodCats,
      lowerQuery
    );
    const matchingSeriesCategoryIds = getMatchingCategoryIds(
      corpusQuery.data.seriesCats,
      lowerQuery
    );

    return {
      live: rankMatches(
        searchIndex.live,
        lowerQuery,
        matchingLiveCategoryIds,
        SEARCH_RESULT_LIMITS.live
      ),
      vod: rankMatches(
        searchIndex.vod,
        lowerQuery,
        matchingVodCategoryIds,
        SEARCH_RESULT_LIMITS.vod
      ),
      series: rankMatches(
        searchIndex.series,
        lowerQuery,
        matchingSeriesCategoryIds,
        SEARCH_RESULT_LIMITS.series
      ),
    };
  }, [corpusQuery.data, query, searchIndex, shouldSearch]);

  return {
    data,
    isLoading: shouldSearch ? corpusQuery.isLoading : false,
    isError: corpusQuery.isError,
    error: corpusQuery.error,
    refetch: corpusQuery.refetch,
  };
};
