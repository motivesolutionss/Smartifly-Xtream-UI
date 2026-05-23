import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppCategory, AppSeries, AppSeriesDetails } from "../../../types/appModels";
import { getUserFriendlyErrorMessage } from "../../../utils/errorMapper";

const EMPTY_CATEGORIES: AppCategory[] = [];
const EMPTY_SERIES: AppSeries[] = [];

export const useSeriesContent = (selectedCategoryId?: string) => {
  const categoriesQuery = useQuery<AppCategory[]>({
    queryKey: ["series-categories"],
    queryFn: () => services.content.getSeriesCategories(),
    retry: 2,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });

  const seriesQuery = useQuery<AppSeries[]>({
    queryKey: ["series-list", selectedCategoryId],
    queryFn: () => services.content.getSeries(selectedCategoryId),
    retry: 2,
    enabled:
      categoriesQuery.status === "success" &&
      (!!selectedCategoryId || (categoriesQuery.data?.length ?? 0) === 0),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
  const error = categoriesQuery.error ?? seriesQuery.error;

  const refetch = useCallback(() => {
    void categoriesQuery.refetch();
    void seriesQuery.refetch();
  }, [categoriesQuery, seriesQuery]);

  return useMemo(() => ({
    categories: categoriesQuery.data ?? EMPTY_CATEGORIES,
    series: seriesQuery.data ?? EMPTY_SERIES,
    isLoading: categoriesQuery.isLoading || seriesQuery.isLoading,
    isFetchingSeries: seriesQuery.isFetching,
    isError: categoriesQuery.isError || seriesQuery.isError,
    errorMessage: error ? getUserFriendlyErrorMessage(error) : null,
    refetch,
  }), [
    categoriesQuery.data,
    categoriesQuery.isLoading,
    categoriesQuery.isError,
    seriesQuery.data,
    seriesQuery.isLoading,
    seriesQuery.isFetching,
    seriesQuery.isError,
    error,
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
