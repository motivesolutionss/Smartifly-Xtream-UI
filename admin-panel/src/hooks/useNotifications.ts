import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import type { Notification, DeviceStats, SendNotificationDTO } from '@/types';

// Keys
export const notificationKeys = {
    all: ['notifications'] as const,
    history: () => [...notificationKeys.all, 'history'] as const,
    devices: () => [...notificationKeys.all, 'devices'] as const,
    templates: () => [...notificationKeys.all, 'templates'] as const,
    segments: () => [...notificationKeys.all, 'segments'] as const,
    abTests: () => [...notificationKeys.all, 'abTests'] as const,
};

/**
 * Hook to fetch notification history
 */
export function useNotificationHistory() {
    return useQuery({
        queryKey: notificationKeys.history(),
        queryFn: async () => {
            const response = await notificationsApi.history();
            return response.data as Notification[];
        },
    });
}

/**
 * Hook to fetch device statistics
 */
export function useDeviceStats() {
    return useQuery({
        queryKey: notificationKeys.devices(),
        queryFn: async () => {
            const response = await notificationsApi.devices();
            return response.data as DeviceStats;
        },
    });
}

/**
 * Hook to send a notification
 */
export function useSendNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: SendNotificationDTO) => {
            const response = await notificationsApi.send(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.history() });
        },
    });
}

/**
 * Templates Hooks
 */
export function useNotificationTemplates() {
    return useQuery({
        queryKey: notificationKeys.templates(),
        queryFn: async () => {
            const response = await notificationsApi.getTemplates();
            return response.data as any[]; // Type properly in real generic usage or import Template type
        },
    });
}

export function useCreateTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await notificationsApi.createTemplate(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.templates() });
        },
    });
}

export function useUpdateTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await notificationsApi.updateTemplate(id, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.templates() });
        },
    });
}

export function useDeleteTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await notificationsApi.deleteTemplate(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.templates() });
        },
    });
}

/**
 * Segments Hooks
 */
export function useNotificationSegments() {
    return useQuery({
        queryKey: notificationKeys.segments(),
        queryFn: async () => {
            const response = await notificationsApi.getSegments();
            return response.data as any[];
        },
    });
}

export function useCreateSegment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await notificationsApi.createSegment(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.segments() });
        },
    });
}

export function useUpdateSegment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await notificationsApi.updateSegment(id, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.segments() });
        },
    });
}

export function useDeleteSegment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await notificationsApi.deleteSegment(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.segments() });
        },
    });
}

/**
 * A/B Test Hooks
 */
export function useABTests() {
    return useQuery({
        queryKey: notificationKeys.abTests(),
        queryFn: async () => {
            const response = await notificationsApi.getABTests();
            return response.data as any[];
        },
    });
}

export function useCreateABTest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await notificationsApi.createABTest(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.abTests() });
        },
    });
}

export function useUpdateABTest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await notificationsApi.updateABTest(id, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.abTests() });
        },
    });
}

export function useDeleteABTest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await notificationsApi.deleteABTest(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.abTests() });
        },
    });
}
