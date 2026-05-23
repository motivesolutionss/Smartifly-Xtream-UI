import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppCategory, AppMovie, AppMovieDetails } from "../../../types/appModels";
import { getUserFriendlyErrorMessage } from "../../../utils/errorMapper";

const EMPTY_CATEGORIES: AppCategory[] = [];
const EMPTY_MOVIES: AppMovie[] = [];

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
  const error = categoriesQuery.error ?? moviesQuery.error;

  const refetch = useCallback(() => {
    void categoriesQuery.refetch();
    void moviesQuery.refetch();
  }, [categoriesQuery, moviesQuery]);

  return useMemo(() => ({
    categories: categoriesQuery.data ?? EMPTY_CATEGORIES,
    movies: moviesQuery.data ?? EMPTY_MOVIES,
    isLoading: categoriesQuery.isLoading || moviesQuery.isLoading,
    isFetchingMovies: moviesQuery.isFetching,
    isError: categoriesQuery.isError || moviesQuery.isError,
    errorMessage: error ? getUserFriendlyErrorMessage(error) : null,
    refetch,
  }), [
    categoriesQuery.data,
    categoriesQuery.isLoading,
    categoriesQuery.isError,
    moviesQuery.data,
    moviesQuery.isLoading,
    moviesQuery.isFetching,
    moviesQuery.isError,
    error,
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
