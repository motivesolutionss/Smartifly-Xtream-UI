import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalsApi } from '@/lib/api';
import type { Portal, CreatePortalDTO, UpdatePortalDTO } from '@/types';

// Query keys for cache management
export const portalKeys = {
    all: ['portals'] as const,
    lists: () => [...portalKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...portalKeys.lists(), filters] as const,
    details: () => [...portalKeys.all, 'detail'] as const,
    detail: (id: string) => [...portalKeys.details(), id] as const,
};

/**
 * Hook to fetch all portals (admin view)
 */
export function usePortals() {
    return useQuery({
        queryKey: portalKeys.lists(),
        queryFn: async () => {
            const response = await portalsApi.getAll();
            return response.data as Portal[];
        },
    });
}

/**
 * Hook to fetch public portals
 */
export function usePublicPortals() {
    return useQuery({
        queryKey: [...portalKeys.all, 'public'],
        queryFn: async () => {
            const response = await portalsApi.getPublic();
            return response.data as Portal[];
        },
    });
}

/**
 * Hook to create a portal
 */
export function useCreatePortal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePortalDTO) => {
            const response = await portalsApi.create(data);
            return response.data as Portal;
        },
        onSuccess: () => {
            // Invalidate and refetch portals list
            queryClient.invalidateQueries({ queryKey: portalKeys.lists() });
        },
    });
}

/**
 * Hook to update a portal
 */
export function useUpdatePortal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdatePortalDTO }) => {
            const response = await portalsApi.update(id, data);
            return response.data as Portal;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: portalKeys.lists() });
        },
    });
}

/**
 * Hook to delete a portal
 */
export function useDeletePortal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await portalsApi.delete(id);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: portalKeys.lists() });
        },
    });
}

/**
 * Hook to toggle portal active status
 */
export function useTogglePortal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const response = await portalsApi.update(id, { isActive });
            return response.data as Portal;
        },
        onMutate: async ({ id, isActive }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: portalKeys.lists() });

            // Snapshot previous value
            const previousPortals = queryClient.getQueryData(portalKeys.lists());

            // Optimistically update
            queryClient.setQueryData(portalKeys.lists(), (old: Portal[] = []) => {
                return old.map((p) => (p.id === id ? { ...p, isActive } : p));
            });

            // Return context
            return { previousPortals };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(portalKeys.lists(), context?.previousPortals);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: portalKeys.lists() });
        },
    });
}
