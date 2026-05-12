import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '@/lib/api';
import type { FinanceSummary, LedgerListResponse } from '@/types';

export const financeKeys = {
    all: ['finance'] as const,
    summary: () => [...financeKeys.all, 'summary'] as const,
    entries: (params?: { page?: number; limit?: number; type?: string }) => [...financeKeys.all, 'entries', params] as const,
};

export function useFinanceSummary() {
    return useQuery({
        queryKey: financeKeys.summary(),
        queryFn: async () => {
            const response = await financeApi.getSummary();
            return response.data as FinanceSummary;
        },
        staleTime: 20 * 1000,
    });
}

export function useLedgerEntries(params?: { page?: number; limit?: number; type?: string }) {
    return useQuery({
        queryKey: financeKeys.entries(params),
        queryFn: async () => {
            const response = await financeApi.getEntries(params);
            return response.data as LedgerListResponse;
        },
        placeholderData: (prev) => prev,
    });
}

export function useCreateLedgerEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { type: string; amount: number; currency: string; userId?: number; licenseId?: number; note?: string }) => {
            const response = await financeApi.createEntry(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: financeKeys.all });
        },
    });
}
