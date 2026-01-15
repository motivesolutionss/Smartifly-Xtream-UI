import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTicket, replyTicket, uploadTicketAttachments } from "@/lib/api";
import type { Ticket, TicketAttachment } from "@/types";

export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  details: () => [...ticketKeys.all, "detail"] as const,
  detail: (ticketNo: string) => [...ticketKeys.details(), ticketNo] as const,
};

export function useTicket(ticketNo: string | null) {
  return useQuery({
    queryKey: ticketKeys.detail(ticketNo || ""),
    queryFn: () => fetchTicket(ticketNo!),
    enabled: !!ticketNo,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useReplyTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketNo, message }: { ticketNo: string; message: string }) =>
      replyTicket(ticketNo, message),
    onSuccess: (_, { ticketNo }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketNo) });
    },
  });
}

export function useUploadAttachments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketNo, files }: { ticketNo: string; files: File[] }) =>
      uploadTicketAttachments(ticketNo, files),
    onSuccess: (_, { ticketNo }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketNo) });
    },
  });
}
