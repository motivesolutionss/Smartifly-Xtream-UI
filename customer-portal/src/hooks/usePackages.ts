import { useQuery } from "@tanstack/react-query";
import { fetchPackages } from "@/lib/api";
import type { Package } from "@/types";

export const packageKeys = {
  all: ["packages"] as const,
  lists: () => [...packageKeys.all, "list"] as const,
};

export function usePackages() {
  return useQuery({
    queryKey: packageKeys.lists(),
    queryFn: fetchPackages,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

