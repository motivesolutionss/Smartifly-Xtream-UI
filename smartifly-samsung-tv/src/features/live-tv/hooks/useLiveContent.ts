import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppCategory, AppChannel } from "../../../types/appModels";
import { getAppErrorCode, getUserFriendlyErrorMessage } from "../../../utils/errorMapper";
import { shouldPrefetchCategory } from "../../../utils/categoryPrefetchPolicy";

const EMPTY_CATEGORIES: AppCategory[] = [];
const EMPTY_CHANNELS: AppChannel[] = [];

/** Maximum number of category prefetches that can be in-flight simultaneously. */
const MAX_CONCURRENT_PREFETCHES = 3;
/** Minimum ms between prefetch calls for the same category. */
const PREFETCH_DEBOUNCE_MS = 350;
const LIVE_CONTENT_PAGE_SIZE = 80;
const LIVE_CONTENT_STALE_TIME_MS = 10 * 60 * 1000;
type PagedChannels = AppChannel[];

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

  const channelsQuery = useInfiniteQuery({
    queryKey: ["live-channels", effectiveCategoryId, LIVE_CONTENT_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      services.content.getLiveStreams(effectiveCategoryId, {
        limit: LIVE_CONTENT_PAGE_SIZE,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: PagedChannels,
      _allPages: PagedChannels[],
      lastPageParam: number
    ) =>
      lastPage.length < LIVE_CONTENT_PAGE_SIZE ? undefined : lastPageParam + 1,
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
      const queryKey = ["live-channels", categoryId, LIVE_CONTENT_PAGE_SIZE] as const;

      if (
        !shouldPrefetchCategory({
          categoryId,
          activeCategoryId: effectiveCategoryId,
          queryState: queryClient.getQueryState(queryKey),
          hasPendingTimer: prefetchTimersRef.current.has(categoryId),
          activePrefetchCount: activePrefetchesRef.current,
          maxConcurrentPrefetches: MAX_CONCURRENT_PREFETCHES,
          staleTimeMs: LIVE_CONTENT_STALE_TIME_MS,
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
            activeCategoryId: effectiveCategoryId,
            queryState: queryClient.getQueryState(queryKey),
            hasPendingTimer: false,
            activePrefetchCount: activePrefetchesRef.current,
            maxConcurrentPrefetches: MAX_CONCURRENT_PREFETCHES,
            staleTimeMs: LIVE_CONTENT_STALE_TIME_MS,
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
              services.content.getLiveStreams(categoryId, {
                limit: LIVE_CONTENT_PAGE_SIZE,
                page: pageParam,
              }),
            initialPageParam: 1,
            getNextPageParam: (
              lastPage: PagedChannels,
              _allPages: PagedChannels[],
              lastPageParam: number
            ) =>
              lastPage.length < LIVE_CONTENT_PAGE_SIZE ? undefined : lastPageParam + 1,
            staleTime: LIVE_CONTENT_STALE_TIME_MS,
          })
          .finally(() => {
            activePrefetchesRef.current = Math.max(0, activePrefetchesRef.current - 1);
          });
      }, PREFETCH_DEBOUNCE_MS);

      prefetchTimersRef.current.set(categoryId, timerId);
    },
    [effectiveCategoryId, queryClient]
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

  const loadMoreChannels = useCallback(async () => {
    if (!channelsQuery.hasNextPage || channelsQuery.isFetchingNextPage) {
      return;
    }

    await channelsQuery.fetchNextPage();
  }, [channelsQuery]);

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

  const channels = useMemo(
    () => channelsQuery.data?.pages.flatMap((page) => page) ?? EMPTY_CHANNELS,
    [channelsQuery.data]
  );

  return useMemo(
    () => ({
      categories: sortedCategories,
      channels,
      isLoading: categoriesQuery.isLoading || channelsQuery.isLoading,
      isFetchingChannels: channelsQuery.isFetching && !channelsQuery.isFetchingNextPage,
      isFetchingMoreChannels: channelsQuery.isFetchingNextPage,
      hasMoreChannels: channelsQuery.hasNextPage ?? false,
      isError: categoriesQuery.isError || channelsQuery.isError,
      errorCode,
      errorMessage: error ? getUserFriendlyErrorMessage(error) : null,
      effectiveCategoryId,
      loadMoreChannels,
      prefetchCategory,
      refetch,
    }),
    [
      sortedCategories,
      channels,
      categoriesQuery.isLoading,
      categoriesQuery.isError,
      channelsQuery.isLoading,
      channelsQuery.isFetching,
      channelsQuery.isFetchingNextPage,
      channelsQuery.hasNextPage,
      channelsQuery.isError,
      errorCode,
      error,
      effectiveCategoryId,
      loadMoreChannels,
      prefetchCategory,
      refetch,
    ]
  );
};
