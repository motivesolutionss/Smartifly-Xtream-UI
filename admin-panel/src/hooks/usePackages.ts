import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packagesApi } from '@/lib/api';
import type { Package, CreatePackageDTO, UpdatePackageDTO } from '@/types';

// Query keys for cache management
export const packageKeys = {
    all: ['packages'] as const,
    lists: () => [...packageKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...packageKeys.lists(), filters] as const,
    details: () => [...packageKeys.all, 'detail'] as const,
    detail: (id: string) => [...packageKeys.details(), id] as const,
};

/**
 * Hook to fetch all packages (admin view)
 */
export function usePackages() {
    return useQuery({
        queryKey: packageKeys.lists(),
        queryFn: async () => {
            const response = await packagesApi.getAll();
            return response.data as Package[];
        },
    });
}

/**
 * Hook to fetch public packages
 */
export function usePublicPackages() {
    return useQuery({
        queryKey: [...packageKeys.all, 'public'],
        queryFn: async () => {
            const response = await packagesApi.getPublic();
            return response.data as Package[];
        },
    });
}

/**
 * Hook to create a package
 */
export function useCreatePackage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePackageDTO) => {
            const response = await packagesApi.create(data);
            return response.data as Package;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
        },
    });
}

/**
 * Hook to update a package
 */
export function useUpdatePackage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdatePackageDTO }) => {
            const response = await packagesApi.update(id, data);
            return response.data as Package;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
        },
    });
}

/**
 * Hook to delete a package
 */
export function useDeletePackage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await packagesApi.delete(id);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
        },
    });
}

/**
 * Hook to toggle package active status
 */
export function useTogglePackage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const response = await packagesApi.update(id, { isActive });
            return response.data as Package;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
        },
    });
}

/**
 * Hook to duplicate a package
 */
export function useDuplicatePackage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, name }: { id: string; name?: string }) => {
            const response = await packagesApi.duplicate(id, name);
            return response.data as Package;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
        },
    });
}

/**
 * Hook to fetch package analytics
 */
export function usePackageAnalytics() {
    return useQuery({
        queryKey: [...packageKeys.all, 'analytics'],
        queryFn: async () => {
            const response = await packagesApi.getAnalytics();
            return response.data;
        },
    });
}

/**
 * Hook to fetch feature templates
 */
export function useFeatureTemplates() {
    return useQuery({
        queryKey: [...packageKeys.all, 'feature-templates'],
        queryFn: async () => {
            const response = await packagesApi.getFeatureTemplates();
            return response.data;
        },
    });
}

/**
 * Hook to create feature template
 */
export function useCreateFeatureTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { name: string; description?: string; features: string[]; category?: string }) => {
            const response = await packagesApi.createFeatureTemplate(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...packageKeys.all, 'feature-templates'] });
        },
    });
}

/**
 * Hook to track package view
 */
export function useTrackPackageView() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await packagesApi.trackView(id);
        },
        onSuccess: () => {
            // Invalidate analytics queries to show updated stats
            queryClient.invalidateQueries({ queryKey: [...packageKeys.all, 'analytics'] });
        },
    });
}

/**
 * Hook to track package purchase
 */
export function useTrackPackagePurchase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
            await packagesApi.trackPurchase(id, amount);
        },
        onSuccess: () => {
            // Invalidate analytics queries to show updated revenue
            queryClient.invalidateQueries({ queryKey: [...packageKeys.all, 'analytics'] });
        },
    });
}