import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppCategory, AppMovie, AppMovieDetails } from "../../../types/appModels";
import { getUserFriendlyErrorMessage } from "../../../utils/errorMapper";
import { shouldPrefetchCategory } from "../../../utils/categoryPrefetchPolicy";

const EMPTY_CATEGORIES: AppCategory[] = [];
const EMPTY_MOVIES: AppMovie[] = [];
const MAX_CONCURRENT_PREFETCHES = 2;
const PREFETCH_DEBOUNCE_MS = 300;
const VOD_CONTENT_PAGE_SIZE = 60;
const VOD_CONTENT_STALE_TIME_MS = 60 * 60 * 1000;
type PagedMovies = AppMovie[];

const getSortableName = (name: string) => {
  return name.replace(/^[^a-zA-Z0-9]+/, "").trim().toLowerCase();
};

export const useVodContent = (selectedCategoryId?: string) => {
  const categoriesQuery = useQuery<AppCategory[]>({
    queryKey: ["vod-categories"],
    queryFn: () => services.content.getVodCategories(),
    retry: 2,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });

  const moviesQuery = useInfiniteQuery({
    queryKey: ["vod-movies", selectedCategoryId, VOD_CONTENT_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      services.content.getVodStreams(selectedCategoryId, {
        limit: VOD_CONTENT_PAGE_SIZE,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: PagedMovies,
      _allPages: PagedMovies[],
      lastPageParam: number
    ) =>
      lastPage.length < VOD_CONTENT_PAGE_SIZE ? undefined : lastPageParam + 1,
    retry: 2,
    enabled:
      categoriesQuery.status === "success" &&
      (!!selectedCategoryId || (categoriesQuery.data?.length ?? 0) === 0),
    staleTime: VOD_CONTENT_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
  const queryClient = useQueryClient();
  const error = categoriesQuery.error ?? moviesQuery.error;
  const activePrefetchesRef = useRef(0);
  const prefetchTimersRef = useRef<Map<string, number>>(new Map());

  const prefetchCategory = useCallback(
    (categoryId?: string) => {
      if (!categoryId) return;
      const queryKey = ["vod-movies", categoryId, VOD_CONTENT_PAGE_SIZE] as const;

      if (
        !shouldPrefetchCategory({
          categoryId,
          activeCategoryId: selectedCategoryId,
          queryState: queryClient.getQueryState(queryKey),
          hasPendingTimer: prefetchTimersRef.current.has(categoryId),
          activePrefetchCount: activePrefetchesRef.current,
          maxConcurrentPrefetches: MAX_CONCURRENT_PREFETCHES,
          staleTimeMs: VOD_CONTENT_STALE_TIME_MS,
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
            staleTimeMs: VOD_CONTENT_STALE_TIME_MS,
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
              services.content.getVodStreams(categoryId, {
                limit: VOD_CONTENT_PAGE_SIZE,
                page: pageParam,
              }),
            initialPageParam: 1,
            getNextPageParam: (
              lastPage: PagedMovies,
              _allPages: PagedMovies[],
              lastPageParam: number
            ) =>
              lastPage.length < VOD_CONTENT_PAGE_SIZE ? undefined : lastPageParam + 1,
            staleTime: VOD_CONTENT_STALE_TIME_MS,
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
    void moviesQuery.refetch();
  }, [categoriesQuery, moviesQuery]);

  const loadMoreMovies = useCallback(async () => {
    if (!moviesQuery.hasNextPage || moviesQuery.isFetchingNextPage) {
      return;
    }

    await moviesQuery.fetchNextPage();
  }, [moviesQuery]);

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

  const movies = useMemo(
    () => moviesQuery.data?.pages.flatMap((page) => page) ?? EMPTY_MOVIES,
    [moviesQuery.data]
  );

  return useMemo(() => ({
    categories: sortedCategories,
    movies,
    isLoading: categoriesQuery.isLoading || moviesQuery.isLoading,
    isFetchingMovies: moviesQuery.isFetching && !moviesQuery.isFetchingNextPage,
    isFetchingMoreMovies: moviesQuery.isFetchingNextPage,
    hasMoreMovies: moviesQuery.hasNextPage ?? false,
    isError: categoriesQuery.isError || moviesQuery.isError,
    errorMessage: error ? getUserFriendlyErrorMessage(error) : null,
    loadMoreMovies,
    prefetchCategory,
    refetch,
  }), [
    sortedCategories,
    movies,
    categoriesQuery.isLoading,
    categoriesQuery.isError,
    moviesQuery.isLoading,
    moviesQuery.isFetching,
    moviesQuery.isFetchingNextPage,
    moviesQuery.hasNextPage,
    moviesQuery.isError,
    error,
    loadMoreMovies,
    prefetchCategory,
    refetch,
  ]);
};

export const useMovieDetails = (movieId: string) => {
  return useQuery<AppMovieDetails>({
    queryKey: ["movie-details", movieId],
    queryFn: () => services.content.getVodInfo(movieId),
    enabled: !!movieId,
    retry: 2,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};
