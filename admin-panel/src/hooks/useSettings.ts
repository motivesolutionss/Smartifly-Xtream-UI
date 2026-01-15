
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import type { AppSettings, UpdateSettingsDTO, FeatureFlag, MaintenanceWindow, Backup, AuditLogResponse } from '@/types';

// Query keys for cache management
export const settingsKeys = {
    all: ['settings'] as const,
    detail: () => [...settingsKeys.all, 'detail'] as const,
    flags: () => [...settingsKeys.all, 'flags'] as const,
    maintenance: () => [...settingsKeys.all, 'maintenance'] as const,
    backups: () => [...settingsKeys.all, 'backups'] as const,
    auditLogs: (page: number, limit: number) => [...settingsKeys.all, 'auditLogs', page, limit] as const,
};

/**
 * Hook to fetch app settings
 */
export function useSettings() {
    return useQuery({
        queryKey: settingsKeys.detail(),
        queryFn: async () => {
            const response = await settingsApi.get();
            return response.data as AppSettings;
        },
        // Settings don't change often, longer stale time
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to update app settings
 */
export function useUpdateSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateSettingsDTO) => {
            const response = await settingsApi.update(data);
            return response.data as AppSettings;
        },
        onSuccess: (data) => {
            // Update cache directly with new data
            queryClient.setQueryData(settingsKeys.detail(), data);
        },
    });
}

// FEATURE FLAGS HOOKS
export function useFeatureFlags() {
    return useQuery({
        queryKey: settingsKeys.flags(),
        queryFn: async () => {
            const response = await settingsApi.getFlags();
            return response.data as FeatureFlag[];
        }
    });
}

export function useCreateFeatureFlag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.createFlag,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.flags() })
    });
}

export function useUpdateFeatureFlag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => settingsApi.updateFlag(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.flags() })
    });
}

export function useToggleFeatureFlag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.toggleFlag,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.flags() })
    });
}

export function useDeleteFeatureFlag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.deleteFlag,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.flags() })
    });
}

// MAINTENANCE HOOKS
export function useMaintenanceWindows() {
    return useQuery({
        queryKey: settingsKeys.maintenance(),
        queryFn: async () => {
            const response = await settingsApi.getMaintenanceWindows();
            return response.data as MaintenanceWindow[];
        }
    });
}

export function useCreateMaintenanceWindow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.createMaintenanceWindow,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.maintenance() })
    });
}

export function useUpdateMaintenanceStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => settingsApi.updateMaintenanceStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.maintenance() })
    });
}

export function useDeleteMaintenanceWindow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.deleteMaintenanceWindow,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.maintenance() })
    });
}

// BACKUPS HOOKS
export function useBackups() {
    return useQuery({
        queryKey: settingsKeys.backups(),
        queryFn: async () => {
            const response = await settingsApi.getBackups();
            return response.data as Backup[];
        }
    });
}

export function useCreateBackup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.createBackup,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.backups() })
    });
}

export function useRestoreBackup() {
    return useMutation({
        mutationFn: settingsApi.restoreBackup,
    });
}

// AUDIT LOGS HOOKS
export function useAuditLogs(page = 1, limit = 20) {
    return useQuery({
        queryKey: settingsKeys.auditLogs(page, limit),
        queryFn: async () => {
            const response = await settingsApi.getAuditLogs(page, limit);
            return response.data as AuditLogResponse;
        },
        placeholderData: (keepPreviousData) => keepPreviousData,
    });
}
