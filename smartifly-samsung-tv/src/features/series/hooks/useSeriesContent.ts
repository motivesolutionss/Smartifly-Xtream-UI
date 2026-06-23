import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppCategory, AppSeries, AppSeriesDetails } from "../../../types/appModels";
import { getUserFriendlyErrorMessage } from "../../../utils/errorMapper";
import { shouldPrefetchCategory } from "../../../utils/categoryPrefetchPolicy";

const EMPTY_CATEGORIES: AppCategory[] = [];
const EMPTY_SERIES: AppSeries[] = [];
const MAX_CONCURRENT_PREFETCHES = 2;
const PREFETCH_DEBOUNCE_MS = 300;
const SERIES_CONTENT_PAGE_SIZE = 60;
const SERIES_CONTENT_STALE_TIME_MS = 60 * 60 * 1000;
type PagedSeries = AppSeries[];

const getSortableName = (name: string) => {
  return name.replace(/^[^a-zA-Z0-9]+/, "").trim().toLowerCase();
};

export const useSeriesContent = (selectedCategoryId?: string) => {
  const categoriesQuery = useQuery<AppCategory[]>({
    queryKey: ["series-categories"],
    queryFn: () => services.content.getSeriesCategories(),
    retry: 2,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });

  const seriesQuery = useInfiniteQuery({
    queryKey: ["series-list", selectedCategoryId, SERIES_CONTENT_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      services.content.getSeries(selectedCategoryId, {
        limit: SERIES_CONTENT_PAGE_SIZE,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: PagedSeries,
      _allPages: PagedSeries[],
      lastPageParam: number
    ) =>
      lastPage.length < SERIES_CONTENT_PAGE_SIZE ? undefined : lastPageParam + 1,
    retry: 2,
    enabled:
      categoriesQuery.status === "success" &&
      (!!selectedCategoryId || (categoriesQuery.data?.length ?? 0) === 0),
    staleTime: SERIES_CONTENT_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
  const queryClient = useQueryClient();
  const error = categoriesQuery.error ?? seriesQuery.error;
  const activePrefetchesRef = useRef(0);
  const prefetchTimersRef = useRef<Map<string, number>>(new Map());

  const prefetchCategory = useCallback(
    (categoryId?: string) => {
      if (!categoryId) return;
      const queryKey = ["series-list", categoryId, SERIES_CONTENT_PAGE_SIZE] as const;

      if (
        !shouldPrefetchCategory({
          categoryId,
          activeCategoryId: selectedCategoryId,
          queryState: queryClient.getQueryState(queryKey),
          hasPendingTimer: prefetchTimersRef.current.has(categoryId),
          activePrefetchCount: activePrefetchesRef.current,
          maxConcurrentPrefetches: MAX_CONCURRENT_PREFETCHES,
          staleTimeMs: SERIES_CONTENT_STALE_TIME_MS,
          nowMs: Date.now(),
        })
      ) {
        return;
      }

      const timerId = window.setTimeout(() => {
        prefetchTimersRef.current.delete(categoryId);

        if (
          !shouldPrefetchCategory({
            categoryId,
            activeCategoryId: selectedCategoryId,
            queryState: queryClient.getQueryState(queryKey),
            hasPendingTimer: false,
            activePrefetchCount: activePrefetchesRef.current,
            maxConcurrentPrefetches: MAX_CONCURRENT_PREFETCHES,
            staleTimeMs: SERIES_CONTENT_STALE_TIME_MS,
            nowMs: Date.now(),
          })
        ) {
          return;
        }

        activePrefetchesRef.current += 1;
        void queryClient
          .prefetchInfiniteQuery({
            queryKey,
            queryFn: ({ pageParam }) =>
              services.content.getSeries(categoryId, {
                limit: SERIES_CONTENT_PAGE_SIZE,
                page: pageParam,
              }),
            initialPageParam: 1,
            getNextPageParam: (
              lastPage: PagedSeries,
              _allPages: PagedSeries[],
              lastPageParam: number
            ) =>
              lastPage.length < SERIES_CONTENT_PAGE_SIZE ? undefined : lastPageParam + 1,
            staleTime: SERIES_CONTENT_STALE_TIME_MS,
          })
          .finally(() => {
            activePrefetchesRef.current = Math.max(0, activePrefetchesRef.current - 1);
          });
      }, PREFETCH_DEBOUNCE_MS);

      prefetchTimersRef.current.set(categoryId, timerId);
    },
    [queryClient, selectedCategoryId]
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
    void seriesQuery.refetch();
  }, [categoriesQuery, seriesQuery]);

  const loadMoreSeries = useCallback(async () => {
    if (!seriesQuery.hasNextPage || seriesQuery.isFetchingNextPage) {
      return;
    }

    await seriesQuery.fetchNextPage();
  }, [seriesQuery]);

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

  const series = useMemo(
    () => seriesQuery.data?.pages.flatMap((page) => page) ?? EMPTY_SERIES,
    [seriesQuery.data]
  );

  return useMemo(() => ({
    categories: sortedCategories,
    series,
    isLoading: categoriesQuery.isLoading || seriesQuery.isLoading,
    isFetchingSeries: seriesQuery.isFetching && !seriesQuery.isFetchingNextPage,
    isFetchingMoreSeries: seriesQuery.isFetchingNextPage,
    hasMoreSeries: seriesQuery.hasNextPage ?? false,
    isError: categoriesQuery.isError || seriesQuery.isError,
    errorMessage: error ? getUserFriendlyErrorMessage(error) : null,
    loadMoreSeries,
    prefetchCategory,
    refetch,
  }), [
    sortedCategories,
    series,
    categoriesQuery.isLoading,
    categoriesQuery.isError,
    seriesQuery.isLoading,
    seriesQuery.isFetching,
    seriesQuery.isFetchingNextPage,
    seriesQuery.hasNextPage,
    seriesQuery.isError,
    error,
    loadMoreSeries,
    prefetchCategory,
    refetch,
  ]);
};

export const useSeriesDetails = (seriesId: string) => {
  return useQuery<AppSeriesDetails>({
    queryKey: ["series-details", seriesId],
    queryFn: () => services.content.getSeriesInfo(seriesId),
    enabled: !!seriesId,
    retry: 2,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};
