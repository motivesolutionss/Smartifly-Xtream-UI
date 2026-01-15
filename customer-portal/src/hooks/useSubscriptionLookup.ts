import { useQuery } from "@tanstack/react-query";
import { lookupSubscription } from "@/lib/api";
import type { SubscriptionLookupResult } from "@/lib/api";

export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  lookups: () => [...subscriptionKeys.all, "lookup"] as const,
  lookup: (email: string) => [...subscriptionKeys.lookups(), email] as const,
};

export function useSubscriptionLookup(email: string | null) {
  return useQuery({
    queryKey: subscriptionKeys.lookup(email || ""),
    queryFn: () => lookupSubscription(email!),
    enabled: !!email && email.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 or 429 errors
      if (error?.status === 404 || error?.status === 429) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

