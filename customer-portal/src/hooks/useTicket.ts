import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTicket, replyTicket, uploadTicketAttachments } from "@/lib/api";
import type { Ticket, TicketAttachment } from "@/types";

export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  details: () => [...ticketKeys.all, "detail"] as const,
  detail: (ticketNo: string, email: string) => [...ticketKeys.details(), ticketNo, email] as const,
};

export function useTicket(ticketNo: string | null, email: string | null) {
  return useQuery({
    queryKey: ticketKeys.detail(ticketNo || "", email || ""),
    queryFn: () => fetchTicket(ticketNo!, email!),
    enabled: !!ticketNo && !!email,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useReplyTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketNo, email, message }: { ticketNo: string; email: string; message: string }) =>
      replyTicket(ticketNo, email, message),
    onSuccess: (_, { ticketNo, email }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketNo, email) });
    },
  });
}

export function useUploadAttachments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketNo, email, files }: { ticketNo: string; email: string; files: File[] }) =>
      uploadTicketAttachments(ticketNo, email, files),
    onSuccess: (_, { ticketNo, email }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketNo, email) });
    },
  });
}
