import { services } from "../../services";
import { logger } from "../../utils/logger";
import type { AppCategory, AppChannel, AppMovie, AppSeries } from "../../types/appModels";
import type {
  PersistedSearchCatalog,
  SearchCatalogCategorySets,
  SearchCatalogLiveEntry,
  SearchCatalogSeriesEntry,
  SearchCatalogVodEntry,
} from "./searchCatalogTypes";

export type SearchCatalogSyncMode = "warm" | "background" | "active";

const SEARCH_SYNC_CONCURRENCY_BY_MODE: Record<SearchCatalogSyncMode, number> = {
  warm: 3,
  background: 2,
  active: 4,
};
const SEARCH_WARM_CATEGORY_LIMITS = {
  live: 10,
  vod: 14,
  series: 14,
} as const;

const yieldToMainThread = () =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });

const dedupeById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const toLiveEntry = (item: AppChannel): SearchCatalogLiveEntry => ({
  id: item.id,
  title: item.title,
  titleLower: item.title.toLowerCase(),
  categoryId: item.categoryId,
  imageUrl: item.logoUrl,
  type: "live",
});

const toVodEntry = (item: AppMovie): SearchCatalogVodEntry => ({
  id: item.id,
  title: item.title,
  titleLower: item.title.toLowerCase(),
  categoryId: item.categoryId,
  imageUrl: item.posterUrl || item.backdropUrl,
  type: "vod",
});

const toSeriesEntry = (item: AppSeries): SearchCatalogSeriesEntry => ({
  id: item.id,
  title: item.title,
  titleLower: item.title.toLowerCase(),
  categoryId: item.categoryId,
  imageUrl: item.posterUrl || item.backdropUrl,
  type: "series",
});

const createEmptyCatalog = (): Omit<PersistedSearchCatalog, "version"> => ({
  completeness: "partial",
  generatedAt: new Date().toISOString(),
  live: [],
  vod: [],
  series: [],
  categories: {
    live: [],
    vod: [],
    series: [],
  },
  fetchedCategoryIds: {
    live: [],
    vod: [],
    series: [],
  },
});

type SyncCatalogParams = {
  seedCatalog?: PersistedSearchCatalog | null;
  onProgress?: (catalog: Omit<PersistedSearchCatalog, "version">) => void;
  shouldPause?: () => boolean;
  mode?: SearchCatalogSyncMode;
};

type BucketKind = "live" | "vod" | "series";

const processCategories = async <TItem, TEntry extends { id: string }>(
  categories: AppCategory[],
  fetchCategoryItems: (categoryId: string) => Promise<TItem[]>,
  mapItem: (item: TItem) => TEntry,
  getBucket: () => TEntry[],
  setBucket: (items: TEntry[]) => void,
  getFetchedCategoryIds: () => string[],
  setFetchedCategoryIds: (ids: string[]) => void,
  emitProgress: () => void,
  shouldPause: () => boolean,
  bucketKind: BucketKind,
  concurrency: number
) => {
  const pendingCategories = categories.filter(
    (category) => !getFetchedCategoryIds().includes(category.id)
  );
  if (pendingCategories.length === 0) return;

  let nextCategoryIndex = 0;

  const worker = async () => {
    while (nextCategoryIndex < pendingCategories.length) {
      if (shouldPause()) return;

      const category = pendingCategories[nextCategoryIndex];
      nextCategoryIndex += 1;

      try {
        const items = await fetchCategoryItems(category.id);
        const nextItems = dedupeById([
          ...getBucket(),
          ...items.map(mapItem),
        ]);
        setBucket(nextItems);
        setFetchedCategoryIds([...getFetchedCategoryIds(), category.id]);
        emitProgress();
      } catch (error) {
        logger.warn(`search_catalog_${bucketKind}_category_failed`, {
          categoryId: category.id,
          error,
        });
      }

      await yieldToMainThread();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pendingCategories.length) }, () => worker())
  );
};

const fetchSearchCategories = async (): Promise<SearchCatalogCategorySets> => {
  const results = await Promise.allSettled([
    services.content.getLiveCategories(),
    services.content.getVodCategories(),
    services.content.getSeriesCategories(),
  ]);

  const live = results[0].status === "fulfilled" ? results[0].value : [];
  const vod = results[1].status === "fulfilled" ? results[1].value : [];
  const series = results[2].status === "fulfilled" ? results[2].value : [];

  if (live.length === 0 && vod.length === 0 && series.length === 0) {
    const firstRejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    throw firstRejected?.reason ?? new Error("Unable to load search categories");
  }

  return { live, vod, series };
};

export const syncSearchCatalog = async ({
  seedCatalog,
  onProgress,
  shouldPause = () => false,
  mode = "active",
}: SyncCatalogParams) => {
  const catalog =
    seedCatalog?.completeness === "partial"
      ? {
        completeness: seedCatalog.completeness,
        generatedAt: seedCatalog.generatedAt,
        live: [...seedCatalog.live],
        vod: [...seedCatalog.vod],
        series: [...seedCatalog.series],
        categories: {
          live: [...seedCatalog.categories.live],
          vod: [...seedCatalog.categories.vod],
          series: [...seedCatalog.categories.series],
        },
        fetchedCategoryIds: {
          live: [...seedCatalog.fetchedCategoryIds.live],
          vod: [...seedCatalog.fetchedCategoryIds.vod],
          series: [...seedCatalog.fetchedCategoryIds.series],
        },
      }
      : createEmptyCatalog();

  if (shouldPause()) {
    return catalog;
  }

  const categories = await fetchSearchCategories();
  catalog.categories = categories;
  catalog.completeness = "partial";
  catalog.generatedAt = new Date().toISOString();
  onProgress?.(catalog);

  const liveCategories =
    mode === "warm"
      ? categories.live.slice(0, SEARCH_WARM_CATEGORY_LIMITS.live)
      : categories.live;
  const vodCategories =
    mode === "warm"
      ? categories.vod.slice(0, SEARCH_WARM_CATEGORY_LIMITS.vod)
      : categories.vod;
  const seriesCategories =
    mode === "warm"
      ? categories.series.slice(0, SEARCH_WARM_CATEGORY_LIMITS.series)
      : categories.series;
  const concurrency = SEARCH_SYNC_CONCURRENCY_BY_MODE[mode];

  await processCategories(
    liveCategories,
    (categoryId) => services.content.getLiveStreams(categoryId),
    toLiveEntry,
    () => catalog.live,
    (items) => {
      catalog.live = items;
    },
    () => catalog.fetchedCategoryIds.live,
    (ids) => {
      catalog.fetchedCategoryIds.live = ids;
    },
    () => onProgress?.({ ...catalog, categories: { ...catalog.categories } }),
    shouldPause,
    "live"
    ,
    concurrency
  );

  await processCategories(
    vodCategories,
    (categoryId) => services.content.getVodStreams(categoryId),
    toVodEntry,
    () => catalog.vod,
    (items) => {
      catalog.vod = items;
    },
    () => catalog.fetchedCategoryIds.vod,
    (ids) => {
      catalog.fetchedCategoryIds.vod = ids;
    },
    () => onProgress?.({ ...catalog, categories: { ...catalog.categories } }),
    shouldPause,
    "vod"
    ,
    concurrency
  );

  await processCategories(
    seriesCategories,
    (categoryId) => services.content.getSeries(categoryId),
    toSeriesEntry,
    () => catalog.series,
    (items) => {
      catalog.series = items;
    },
    () => catalog.fetchedCategoryIds.series,
    (ids) => {
      catalog.fetchedCategoryIds.series = ids;
    },
    () => onProgress?.({ ...catalog, categories: { ...catalog.categories } }),
    shouldPause,
    "series"
    ,
    concurrency
  );

  if (shouldPause()) {
    return catalog;
  }

  const isFullyFetched =
    catalog.fetchedCategoryIds.live.length >= categories.live.length &&
    catalog.fetchedCategoryIds.vod.length >= categories.vod.length &&
    catalog.fetchedCategoryIds.series.length >= categories.series.length;

  catalog.completeness = isFullyFetched ? "full" : "partial";
  catalog.generatedAt = new Date().toISOString();

  logger.info(`search_catalog_${mode}_sync_complete`, {
    liveCount: catalog.live.length,
    vodCount: catalog.vod.length,
    seriesCount: catalog.series.length,
    completeness: catalog.completeness,
  });

  return catalog;
};
