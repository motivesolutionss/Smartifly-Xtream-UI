export type PrefetchQueryState = {
  dataUpdatedAt?: number;
  fetchStatus?: "fetching" | "paused" | "idle";
};

type ShouldPrefetchCategoryOptions = {
  categoryId?: string;
  activeCategoryId?: string;
  queryState?: PrefetchQueryState;
  hasPendingTimer: boolean;
  activePrefetchCount: number;
  maxConcurrentPrefetches: number;
  staleTimeMs: number;
  nowMs: number;
};

export const shouldPrefetchCategory = ({
  categoryId,
  activeCategoryId,
  queryState,
  hasPendingTimer,
  activePrefetchCount,
  maxConcurrentPrefetches,
  staleTimeMs,
  nowMs,
}: ShouldPrefetchCategoryOptions) => {
  if (!categoryId) return false;
  if (categoryId === activeCategoryId) return false;
  if (hasPendingTimer) return false;
  if (activePrefetchCount >= maxConcurrentPrefetches) return false;
  if (queryState?.fetchStatus === "fetching") return false;

  const dataUpdatedAt = queryState?.dataUpdatedAt ?? 0;
  if (dataUpdatedAt > 0 && nowMs - dataUpdatedAt < staleTimeMs) {
    return false;
  }

  return true;
};
