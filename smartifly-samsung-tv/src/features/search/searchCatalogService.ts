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
import { toCompactSearchKey } from "./searchRanking";

export type SearchCatalogSyncMode = "warm" | "background" | "active";

const SEARCH_SYNC_CONCURRENCY_BY_MODE: Record<SearchCatalogSyncMode, number> = {
  warm: 2,
  background: 2,
  active: 4,
};
const SEARCH_WARM_CATEGORY_LIMITS = {
  live: 4,
  vod: 6,
  series: 6,
} as const;
const SEARCH_SYNC_ITEM_LIMITS_BY_MODE: Record<
  SearchCatalogSyncMode,
  { live: number; vod: number; series: number }
> = {
  warm: {
    live: 12,
    vod: 20,
    series: 20,
  },
  background: {
    live: 36,
    vod: 60,
    series: 60,
  },
  active: {
    live: 48,
    vod: 72,
    series: 72,
  },
};

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
  syncMeta: {},
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

const fetchSearchCategories = async (
  mode: SearchCatalogSyncMode
): Promise<SearchCatalogCategorySets> => {
  const requestSource = `search_${mode}_categories`;
  const results = await Promise.allSettled([
    services.content.getLiveCategories({ requestSource }),
    services.content.getVodCategories({ requestSource }),
    services.content.getSeriesCategories({ requestSource }),
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
    seedCatalog
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
         syncMeta: {
           ...seedCatalog.syncMeta,
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

  const categories = await fetchSearchCategories(mode);
  catalog.categories = categories;
  catalog.completeness = "partial";
  catalog.generatedAt = new Date().toISOString();
  onProgress?.(catalog);

  const requestSource = `search_${mode}`;
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
  const itemLimits = SEARCH_SYNC_ITEM_LIMITS_BY_MODE[mode];

  await processCategories(
    liveCategories,
    (categoryId) =>
      services.content.getLiveStreams(categoryId, {
        limit: itemLimits.live,
        page: 1,
        requestSource,
      }),
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
    "live",
    concurrency
  );

  await processCategories(
    vodCategories,
    (categoryId) =>
      services.content.getVodStreams(categoryId, {
        limit: itemLimits.vod,
        page: 1,
        requestSource,
      }),
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
    "vod",
    concurrency
  );

  await processCategories(
    seriesCategories,
    (categoryId) =>
      services.content.getSeries(categoryId, {
        limit: itemLimits.series,
        page: 1,
        requestSource,
      }),
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
    "series",
    concurrency
  );

  if (shouldPause()) {
    return catalog;
  }

  catalog.completeness =
    mode === "warm" &&
    (liveCategories.length < categories.live.length ||
      vodCategories.length < categories.vod.length ||
      seriesCategories.length < categories.series.length)
      ? "partial"
      : "full";
  catalog.generatedAt = new Date().toISOString();
  catalog.syncMeta = {
    lastCompletedAt: catalog.generatedAt,
    lastCompletedMode: mode,
  };

  logger.info(`search_catalog_${mode}_sync_complete`, {
    liveCount: catalog.live.length,
    vodCount: catalog.vod.length,
    seriesCount: catalog.series.length,
    completeness: catalog.completeness,
  });

  return catalog;
};
