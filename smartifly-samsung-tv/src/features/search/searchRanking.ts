import type { AppCategory } from "../../types/appModels";
import type { IndexedSearchCatalogEntry, SearchCatalogEntry } from "./searchCatalogTypes";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const COMPACT_SEARCH_PATTERN = /[\s"'`.,!?()[\]{}\-_:;/\\|+&]+/g;

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

export const toCompactSearchKey = (value: string) =>
  value.toLowerCase().replace(COMPACT_SEARCH_PATTERN, "");

const matchCategory = (categoryName: string, lowerQuery: string, compactQuery: string) => {
  const nameLower = categoryName.toLowerCase();
  const nameCompact = toCompactSearchKey(nameLower);

  if (
    nameLower.includes(lowerQuery) ||
    lowerQuery.includes(nameLower) ||
    (compactQuery.length >= 3 &&
      (nameCompact.includes(compactQuery) || compactQuery.includes(nameCompact)))
  ) {
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

export const getMatchingCategoryIds = (categories: AppCategory[], lowerQuery: string) => {
  const compactQuery = toCompactSearchKey(lowerQuery);

  return new Set(
    categories
      .filter((category) => matchCategory(category.name, lowerQuery, compactQuery))
      .map((category) => category.id)
  );
};

const buildWordRegex = (lowerQuery: string) => {
  try {
    const escapedQuery = escapeRegExp(lowerQuery);
    return new RegExp(`\\b${escapedQuery}\\b`, "i");
  } catch {
    return null;
  }
};

export const rankSearchMatches = <T extends SearchCatalogEntry>(
  entries: IndexedSearchCatalogEntry<T>[],
  lowerQuery: string,
  matchingCategoryIds: Set<string>,
  limit: number
) => {
  if (entries.length === 0 || limit <= 0) {
    return [];
  }

  const compactQuery = toCompactSearchKey(lowerQuery);
  const hasCompactQuery = compactQuery.length >= 3;
  const exactMatches: IndexedSearchCatalogEntry<T>[] = [];
  const prefixMatches: IndexedSearchCatalogEntry<T>[] = [];
  const wordMatches: IndexedSearchCatalogEntry<T>[] = [];
  const containsMatches: IndexedSearchCatalogEntry<T>[] = [];
  const categoryMatches: IndexedSearchCatalogEntry<T>[] = [];
  const wordRegex = buildWordRegex(lowerQuery);

  for (const entry of entries) {
    const titleLower = entry.titleLower;
    const titleCompact = entry.titleCompact || toCompactSearchKey(titleLower);
    const compactExact = hasCompactQuery && titleCompact === compactQuery;
    const compactPrefix = hasCompactQuery && titleCompact.startsWith(compactQuery);

    if (titleLower === lowerQuery || compactExact) {
      exactMatches.push(entry);
      continue;
    }

    if (titleLower.startsWith(lowerQuery) || compactPrefix) {
      prefixMatches.push(entry);
      continue;
    }

    if (exactMatches.length + prefixMatches.length >= limit) {
      continue;
    }

    const compactContains = hasCompactQuery && titleCompact.includes(compactQuery);
    const titleContainsQuery = titleLower.includes(lowerQuery) || compactContains;
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
