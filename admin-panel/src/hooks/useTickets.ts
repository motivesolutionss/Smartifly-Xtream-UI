import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import type { Ticket, TicketStatus, TicketFilters, TicketTemplate } from '@/types';

// Query keys for cache management
export const ticketKeys = {
    all: ['tickets'] as const,
    lists: () => [...ticketKeys.all, 'list'] as const,
    list: (filters: TicketFilters) => [...ticketKeys.lists(), filters] as const,
    details: () => [...ticketKeys.all, 'detail'] as const,
    detail: (id: string) => [...ticketKeys.details(), id] as const,
    templates: ['ticket-templates'] as const,
    stats: () => [...ticketKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch ticket stats (counts by status) for all tickets
 */
export function useTicketStats() {
    return useQuery({
        queryKey: ticketKeys.stats(),
        queryFn: async () => {
            const response = await ticketsApi.getStats();
            return response.data as {
                statusDistribution: Array<{ name: string; value: number }>;
                total: number;
            };
        },
        staleTime: 10 * 1000, // 10 seconds
    });
}

/**
 * Hook to fetch all tickets with optional filters
 */
/**
 * Hook to fetch all tickets with optional filters
 * Supports both generic list and paginated response
 */
export function useTickets(filters?: TicketFilters & { page?: number; limit?: number }) {
    return useQuery({
        queryKey: ticketKeys.list(filters ?? {}),
        queryFn: async () => {
            const response = await ticketsApi.getAll(filters);
            return response.data; // Data is either Ticket[] or { data: Ticket[], pagination: ... }
        },
    });
}

/**
 * Hook specifically for paginated tickets
 */
export function usePaginatedTickets(page = 1, limit = 10, filters?: TicketFilters) {
    return useQuery({
        queryKey: ticketKeys.list({ ...filters, page, limit } as any),
        queryFn: async () => {
            const params = { ...filters, page, limit };
            const response = await ticketsApi.getAll(params);
            // Cast to formatted response
            return response.data as unknown as {
                data: Ticket[];
                pagination: {
                    total: number;
                    totalPages: number;
                    page: number;
                    limit: number;
                }
            };
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });
}

/**
 * Hook to reply to a ticket
 */
export function useReplyTicket() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, message }: { id: string; message: string }) => {
            const response = await ticketsApi.reply(id, message);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        },
    });
}

/**
 * Hook to update ticket status
 */
export function useUpdateTicketStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
            const response = await ticketsApi.updateStatus(id, status);
            return response.data;
        },
        onMutate: async ({ id, status }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ticketKeys.lists() });

            // Snapshot the previous value
            const previousTickets = queryClient.getQueryData(ticketKeys.lists());

            // Optimistically update to the new value
            queryClient.setQueryData(ticketKeys.lists(), (old: Ticket[] = []) => {
                return old.map((t) => (t.id === id ? { ...t, status } : t));
            });

            // Return a context object with the snapshotted value
            return { previousTickets };
        },
        onError: (err, newTodo, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(ticketKeys.lists(), context?.previousTickets);
        },
        onSettled: () => {
            // Always refetch after error or success:
            queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        },
    });
}

/**
 * Hook to delete a ticket
 */
export function useDeleteTicket() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await ticketsApi.delete(id);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        },
    });
}

/**
 * Hook to fetch ticket templates
 */
export function useTicketTemplates() {
    return useQuery({
        queryKey: ticketKeys.templates,
        queryFn: async () => {
            const response = await ticketsApi.getTemplates();
            return response.data as TicketTemplate[];
        },
    });
}

/**
 * Hook to update ticket tags
 */
export function useUpdateTicketTags() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
            const response = await ticketsApi.updateTags(id, tags);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        },
    });
}

/**
 * Hook to upload attachments
 */
export function useUploadAttachments() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
            const response = await ticketsApi.uploadAttachments(id, formData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        },
    });
}
