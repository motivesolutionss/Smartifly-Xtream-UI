import type { AppEpgItem } from "../../types/appModels";
import { services } from "../../services";
import { parseTimestampToSeconds } from "./epgTime";

export const EPG_STALE_TIME_MS = 5 * 60 * 1000;
export const EPG_GC_TIME_MS = 15 * 60 * 1000;
export const EPG_REFETCH_INTERVAL_MS = 5 * 60 * 1000;
export const EPG_WINDOW_ITEM_LIMIT = 14;

export const getShortEpgQueryOptions = (streamId: string) => ({
  queryKey: ["epg", streamId] as const,
  queryFn: () => services.content.getShortEpg(streamId),
  enabled: !!streamId,
  retry: 1,
  staleTime: EPG_STALE_TIME_MS,
  gcTime: EPG_GC_TIME_MS,
  refetchInterval: EPG_REFETCH_INTERVAL_MS,
  placeholderData: (previousData: AppEpgItem[] | undefined) => previousData,
});

export const sliceShortEpgToWindow = (
  items: AppEpgItem[],
  windowStartMs: number,
  windowEndMs: number,
  limit = EPG_WINDOW_ITEM_LIMIT
): AppEpgItem[] => {
  const inWindow = items
    .filter((item) => {
      const startSeconds = parseTimestampToSeconds(item.start);
      const endSeconds = parseTimestampToSeconds(item.end);

      if (startSeconds <= 0 || endSeconds <= startSeconds) {
        return false;
      }

      const startMs = startSeconds * 1000;
      const endMs = endSeconds * 1000;

      return endMs > windowStartMs && startMs < windowEndMs;
    })
    .sort(
      (a, b) =>
        parseTimestampToSeconds(a.start) - parseTimestampToSeconds(b.start)
    );

  return inWindow.slice(0, limit);
};
