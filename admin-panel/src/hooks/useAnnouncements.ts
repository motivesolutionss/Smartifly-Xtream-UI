import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '@/lib/api';
import type { Announcement, CreateAnnouncementDTO, UpdateAnnouncementDTO } from '@/types';

// Query keys for cache management
export const announcementKeys = {
    all: ['announcements'] as const,
    lists: () => [...announcementKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...announcementKeys.lists(), filters] as const,
    details: () => [...announcementKeys.all, 'detail'] as const,
    detail: (id: string) => [...announcementKeys.details(), id] as const,
};

/**
 * Hook to fetch all announcements (admin view)
 */
export function useAnnouncements() {
    return useQuery({
        queryKey: announcementKeys.lists(),
        queryFn: async () => {
            const response = await announcementsApi.getAll();
            return response.data as Announcement[];
        },
    });
}

/**
 * Hook to create an announcement
 */
export function useCreateAnnouncement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateAnnouncementDTO) => {
            const response = await announcementsApi.create(data);
            return response.data as Announcement;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
        },
    });
}

/**
 * Hook to update an announcement
 */
export function useUpdateAnnouncement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateAnnouncementDTO }) => {
            const response = await announcementsApi.update(id, data);
            return response.data as Announcement;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
        },
    });
}

/**
 * Hook to delete an announcement
 */
export function useDeleteAnnouncement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await announcementsApi.delete(id);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
        },
    });
}

/**
 * Hook to toggle announcement active status
 */
export function useToggleAnnouncement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const response = await announcementsApi.update(id, { isActive });
            return response.data as Announcement;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
        },
    });
}
