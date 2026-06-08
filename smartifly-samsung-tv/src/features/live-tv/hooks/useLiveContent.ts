import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppCategory, AppChannel } from "../../../types/appModels";
import { getAppErrorCode, getUserFriendlyErrorMessage } from "../../../utils/errorMapper";

const EMPTY_CATEGORIES: AppCategory[] = [];
const EMPTY_CHANNELS: AppChannel[] = [];

/** Maximum number of category prefetches that can be in-flight simultaneously. */
const MAX_CONCURRENT_PREFETCHES = 3;
/** Minimum ms between prefetch calls for the same category. */
const PREFETCH_DEBOUNCE_MS = 350;

const getSortableName = (name: string) => {
  return name.replace(/^[^a-zA-Z0-9]+/, "").trim().toLowerCase();
};

export const useLiveContent = (selectedCategoryId?: string) => {
  const categoriesQuery = useQuery<AppCategory[]>({
    queryKey: ["live-categories"],
    queryFn: () => services.content.getLiveCategories(),
    retry: 2,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const effectiveCategoryId =
    selectedCategoryId ?? categoriesQuery.data?.[0]?.id ?? undefined;

  const channelsQuery = useQuery<AppChannel[]>({
    queryKey: ["live-channels", effectiveCategoryId],
    queryFn: () => services.content.getLiveStreams(effectiveCategoryId),
    retry: 2,
    enabled: categoriesQuery.status === "success",
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const queryClient = useQueryClient();
  const error = categoriesQuery.error ?? channelsQuery.error;
  const errorCode = error ? getAppErrorCode(error) : null;

  // ── Bounded, debounced prefetch ───────────────────────────────────────────
  const activePrefetchesRef = useRef(0);
  const prefetchTimersRef = useRef<Map<string, number>>(new Map());

  const prefetchCategory = useCallback(
    (categoryId?: string) => {
      if (!categoryId) return;

      // Cancel any pending debounce for this category.
      const existing = prefetchTimersRef.current.get(categoryId);
      if (existing !== undefined) {
        window.clearTimeout(existing);
      }

      const timerId = window.setTimeout(() => {
        prefetchTimersRef.current.delete(categoryId);

        // Respect the concurrency cap.
        if (activePrefetchesRef.current >= MAX_CONCURRENT_PREFETCHES) return;

        activePrefetchesRef.current += 1;
        void queryClient
          .prefetchQuery({
            queryKey: ["live-channels", categoryId],
            queryFn: () => services.content.getLiveStreams(categoryId),
            staleTime: 10 * 60 * 1000,
          })
          .finally(() => {
            activePrefetchesRef.current = Math.max(0, activePrefetchesRef.current - 1);
          });
      }, PREFETCH_DEBOUNCE_MS);

      prefetchTimersRef.current.set(categoryId, timerId);
    },
    [queryClient]
  );

  useEffect(() => {
    const timers = prefetchTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const refetch = useCallback(() => {
    void categoriesQuery.refetch();
    void channelsQuery.refetch();
  }, [categoriesQuery, channelsQuery]);

  const sortedCategories = useMemo(() => {
    const raw = categoriesQuery.data;
    if (!raw || raw.length === 0) return EMPTY_CATEGORIES;
    return [...raw].sort((a, b) => {
      const nameA = getSortableName(a.name);
      const nameB = getSortableName(b.name);
      return (nameA || a.name.toLowerCase()).localeCompare(
        nameB || b.name.toLowerCase(),
        undefined,
        { sensitivity: "base", numeric: true }
      );
    });
  }, [categoriesQuery.data]);

  return useMemo(
    () => ({
      categories: sortedCategories,
      channels: channelsQuery.data ?? EMPTY_CHANNELS,
      isLoading: categoriesQuery.isLoading || channelsQuery.isLoading,
      isFetchingChannels: channelsQuery.isFetching,
      isError: categoriesQuery.isError || channelsQuery.isError,
      errorCode,
      errorMessage: error ? getUserFriendlyErrorMessage(error) : null,
      effectiveCategoryId,
      prefetchCategory,
      refetch,
    }),
    [
      sortedCategories,
      categoriesQuery.isLoading,
      categoriesQuery.isError,
      channelsQuery.data,
      channelsQuery.isLoading,
      channelsQuery.isFetching,
      channelsQuery.isError,
      errorCode,
      error,
      effectiveCategoryId,
      prefetchCategory,
      refetch,
    ]
  );
};
