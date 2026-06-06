import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { heroBannersApi } from '@/lib/api';
import type { CreateHeroBannerDTO, HeroBanner, UpdateHeroBannerDTO } from '@/types';

export const heroBannerKeys = {
  all: ['hero-banners'] as const,
  lists: () => [...heroBannerKeys.all, 'list'] as const,
};

export function useHeroBanners() {
  return useQuery({
    queryKey: heroBannerKeys.lists(),
    queryFn: async () => {
      const response = await heroBannersApi.getAll();
      return response.data as HeroBanner[];
    },
  });
}

export function useCreateHeroBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateHeroBannerDTO) => {
      const response = await heroBannersApi.create(data);
      return response.data as HeroBanner;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: heroBannerKeys.lists() }),
  });
}

export function useUpdateHeroBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateHeroBannerDTO }) => {
      const response = await heroBannersApi.update(id, data);
      return response.data as HeroBanner;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: heroBannerKeys.lists() }),
  });
}

export function useDeleteHeroBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await heroBannersApi.delete(id);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: heroBannerKeys.lists() }),
  });
}
