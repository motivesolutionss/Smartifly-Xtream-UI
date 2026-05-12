import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import type { UserListResponse, UserStats } from '@/types';

export const userKeys = {
    all: ['users'] as const,
    list: (params?: { page?: number; limit?: number; search?: string; status?: 'active' | 'suspended' | '' }) =>
        [...userKeys.all, 'list', params] as const,
    stats: () => [...userKeys.all, 'stats'] as const,
};

export function useUsers(params?: { page?: number; limit?: number; search?: string; status?: 'active' | 'suspended' | '' }) {
    return useQuery({
        queryKey: userKeys.list(params),
        queryFn: async () => {
            const response = await usersApi.getAll(params);
            return response.data as UserListResponse;
        },
        placeholderData: (prev) => prev,
    });
}

export function useUserStats() {
    return useQuery({
        queryKey: userKeys.stats(),
        queryFn: async () => {
            const response = await usersApi.getStats();
            return response.data as UserStats;
        },
        staleTime: 30 * 1000,
    });
}

export function useActivateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => usersApi.activate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}

export function useSuspendUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, reason }: { id: number; reason?: string }) => usersApi.suspend(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}
