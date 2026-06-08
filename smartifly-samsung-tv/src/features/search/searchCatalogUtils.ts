import type { PersistedSearchCatalog, SearchCatalogSnapshot } from "./searchCatalogTypes";

export const hydrateSearchCatalog = (
  catalog: PersistedSearchCatalog | null | undefined
): SearchCatalogSnapshot | null => {
  if (!catalog) return null;

  return {
    completeness: catalog.completeness,
    generatedAt: catalog.generatedAt,
    live: catalog.live,
    vod: catalog.vod,
    series: catalog.series,
    categories: catalog.categories,
    fetchedCategoryIds: catalog.fetchedCategoryIds,
    indexed: {
      live: catalog.live,
      vod: catalog.vod,
      series: catalog.series,
    },
  };
};

export const SEARCH_CATALOG_STALE_MS = 15 * 60 * 1000;

export const isSearchCatalogFresh = (
  catalog: PersistedSearchCatalog | SearchCatalogSnapshot | null | undefined
) => {
  if (!catalog) return false;
  const timestamp = Date.parse(catalog.generatedAt);
  if (Number.isNaN(timestamp) || timestamp <= 0) return false;
  return Date.now() - timestamp <= SEARCH_CATALOG_STALE_MS;
};
