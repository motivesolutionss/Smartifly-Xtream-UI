import type { AppCategory } from "../../types/appModels";

export type SearchCatalogEntryType = "live" | "vod" | "series";

type SearchCatalogEntryBase = {
  id: string;
  title: string;
  titleLower: string;
  titleCompact?: string;
  categoryId?: string;
  imageUrl?: string;
};

export type SearchCatalogLiveEntry = SearchCatalogEntryBase & {
  type: "live";
};

export type SearchCatalogVodEntry = SearchCatalogEntryBase & {
  type: "vod";
};

export type SearchCatalogSeriesEntry = SearchCatalogEntryBase & {
  type: "series";
};

export type SearchCatalogEntry =
  | SearchCatalogLiveEntry
  | SearchCatalogVodEntry
  | SearchCatalogSeriesEntry;

export type IndexedSearchCatalogEntry<T extends SearchCatalogEntry = SearchCatalogEntry> = T;

export type SearchCatalogCategorySets = {
  live: AppCategory[];
  vod: AppCategory[];
  series: AppCategory[];
};

export type PersistedSearchCatalog = {
  completeness: "partial" | "full";
  generatedAt: string;
  syncMeta?: {
    lastCompletedAt?: string;
    lastCompletedMode?: "warm" | "background" | "active";
  };
  live: SearchCatalogLiveEntry[];
  vod: SearchCatalogVodEntry[];
  series: SearchCatalogSeriesEntry[];
  categories: SearchCatalogCategorySets;
  fetchedCategoryIds: {
    live: string[];
    vod: string[];
    series: string[];
  };
};

export type SearchCatalogSnapshot = PersistedSearchCatalog & {
  indexed: {
    live: IndexedSearchCatalogEntry<SearchCatalogLiveEntry>[];
    vod: IndexedSearchCatalogEntry<SearchCatalogVodEntry>[];
    series: IndexedSearchCatalogEntry<SearchCatalogSeriesEntry>[];
  };
};
