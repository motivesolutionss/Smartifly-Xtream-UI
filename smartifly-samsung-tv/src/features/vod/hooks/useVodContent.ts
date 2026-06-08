import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppCategory, AppMovie, AppMovieDetails } from "../../../types/appModels";
import { getUserFriendlyErrorMessage } from "../../../utils/errorMapper";

const EMPTY_CATEGORIES: AppCategory[] = [];
const EMPTY_MOVIES: AppMovie[] = [];
const MAX_CONCURRENT_PREFETCHES = 2;
const PREFETCH_DEBOUNCE_MS = 300;

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

  const moviesQuery = useQuery<AppMovie[]>({
    queryKey: ["vod-movies", selectedCategoryId],
    queryFn: () => services.content.getVodStreams(selectedCategoryId),
    retry: 2,
    enabled:
      categoriesQuery.status === "success" &&
      (!!selectedCategoryId || (categoriesQuery.data?.length ?? 0) === 0),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
  const queryClient = useQueryClient();
  const error = categoriesQuery.error ?? moviesQuery.error;
  const activePrefetchesRef = useRef(0);
  const prefetchTimersRef = useRef<Map<string, number>>(new Map());

  const prefetchCategory = useCallback(
    (categoryId?: string) => {
      if (!categoryId) return;

      const existing = prefetchTimersRef.current.get(categoryId);
      if (existing !== undefined) {
        window.clearTimeout(existing);
      }

      const timerId = window.setTimeout(() => {
        prefetchTimersRef.current.delete(categoryId);

        if (activePrefetchesRef.current >= MAX_CONCURRENT_PREFETCHES) return;

        activePrefetchesRef.current += 1;
        void queryClient
          .prefetchQuery({
            queryKey: ["vod-movies", categoryId],
            queryFn: () => services.content.getVodStreams(categoryId),
            staleTime: 60 * 60 * 1000,
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
    void moviesQuery.refetch();
  }, [categoriesQuery, moviesQuery]);

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

  return useMemo(() => ({
    categories: sortedCategories,
    movies: moviesQuery.data ?? EMPTY_MOVIES,
    isLoading: categoriesQuery.isLoading || moviesQuery.isLoading,
    isFetchingMovies: moviesQuery.isFetching,
    isError: categoriesQuery.isError || moviesQuery.isError,
    errorMessage: error ? getUserFriendlyErrorMessage(error) : null,
    prefetchCategory,
    refetch,
  }), [
    sortedCategories,
    categoriesQuery.isLoading,
    categoriesQuery.isError,
    moviesQuery.data,
    moviesQuery.isLoading,
    moviesQuery.isFetching,
    moviesQuery.isError,
    error,
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
