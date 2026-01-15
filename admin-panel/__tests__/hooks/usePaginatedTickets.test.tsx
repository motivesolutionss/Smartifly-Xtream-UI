import { renderHook, waitFor } from '@testing-library/react';
import { usePaginatedTickets } from '@/hooks/useTickets';
import { createWrapper } from '@/lib/test-utils';
import { ticketsApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
    ticketsApi: {
        getAll: jest.fn(),
    },
}));

describe('usePaginatedTickets', () => {
    it('fetches and returns paginated data', async () => {
        const mockData = {
            data: [{ id: '1', ticketNo: 'T-1' }],
            pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        };
        (ticketsApi.getAll as jest.Mock).mockResolvedValue({ data: mockData });

        const { result } = renderHook(() => usePaginatedTickets(1, 10), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockData);
        expect(ticketsApi.getAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 }));
    });
});
