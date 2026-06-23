import type { QueryClient } from "@tanstack/react-query";
import { searchCatalogSession } from "../features/search/searchCatalogSession";
import { resetImagePreloadMemory } from "../hooks/useBudgetedImagePreload";
import { appQueryClient } from "../providers/QueryProvider";
import { searchCatalogStorage } from "../features/search/searchCatalogStorage";
import { homeSnapshotStorage } from "../storage/homeSnapshotStorage";
import { recentlyWatchedStorage } from "../storage/recentlyWatchedStorage";
import { imageFailureMemory } from "./imageFailureMemory";
import { imageWarmMemory } from "./imageWarmMemory";

export type SessionCacheResetReason =
  | "sign-out"
  | "playlist-switch"
  | "profile-switch"
  | "full-local-data-clear";

type ClearSessionCachesOptions = {
  reason: SessionCacheResetReason;
  queryClient?: QueryClient;
};

const shouldClearPersistedSearchCatalog = (reason: SessionCacheResetReason) =>
  reason === "sign-out" ||
  reason === "playlist-switch" ||
  reason === "full-local-data-clear";

const shouldClearInMemoryQueryCache = (reason: SessionCacheResetReason) =>
  reason === "sign-out" || reason === "playlist-switch";

export const clearSessionCaches = async ({
  reason,
  queryClient = appQueryClient,
}: ClearSessionCachesOptions) => {
  if (shouldClearInMemoryQueryCache(reason)) {
    await queryClient.cancelQueries();
    queryClient.clear();
  }

  homeSnapshotStorage.clearAllSnapshots();
  searchCatalogSession.clearAll();
  resetImagePreloadMemory();
  imageFailureMemory.clear();
  imageWarmMemory.clear();

  if (shouldClearPersistedSearchCatalog(reason)) {
    await searchCatalogStorage.clearAll();
  }

  if (reason === "full-local-data-clear") {
    recentlyWatchedStorage.clearHistory();
  }
};
