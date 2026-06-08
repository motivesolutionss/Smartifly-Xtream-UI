import type { AppEpgItem } from "../../types/appModels";
import { services } from "../../services";
import { parseTimestampToSeconds } from "./epgTime";

export const EPG_STALE_TIME_MS = 5 * 60 * 1000;
export const EPG_GC_TIME_MS = 15 * 60 * 1000;
export const EPG_REFETCH_INTERVAL_MS = 5 * 60 * 1000;
export const EPG_WINDOW_ITEM_LIMIT = 14;

export type ParsedShortEpgItem = AppEpgItem & {
  startMs: number;
  endMs: number;
};

export const parseShortEpgItems = (
  items: AppEpgItem[]
): ParsedShortEpgItem[] => {
  return items
    .map((item) => {
      const startSeconds = parseTimestampToSeconds(item.start);
      const endSeconds = parseTimestampToSeconds(item.end);

      if (startSeconds <= 0 || endSeconds <= startSeconds) {
        return null;
      }

      return {
        ...item,
        title: item.title || "No Program Info",
        startMs: startSeconds * 1000,
        endMs: endSeconds * 1000,
      };
    })
    .filter((item): item is ParsedShortEpgItem => item !== null)
    .sort((a, b) => a.startMs - b.startMs);
};

export const getShortEpgQueryOptions = (streamId: string) => ({
  queryKey: ["epg", streamId] as const,
  queryFn: async () => parseShortEpgItems(await services.content.getShortEpg(streamId)),
  enabled: !!streamId,
  retry: 1,
  staleTime: EPG_STALE_TIME_MS,
  gcTime: EPG_GC_TIME_MS,
  refetchInterval: EPG_REFETCH_INTERVAL_MS,
  placeholderData: (previousData: ParsedShortEpgItem[] | undefined) => previousData,
});

type ShortEpgQueryOverrides = {
  enabled?: boolean;
  refetchInterval?: number | false;
};

export const getShortEpgQueryOptionsWithOverrides = (
  streamId: string,
  overrides: ShortEpgQueryOverrides = {}
) => ({
  ...getShortEpgQueryOptions(streamId),
  enabled: overrides.enabled ?? !!streamId,
  refetchInterval:
    overrides.refetchInterval === undefined
      ? EPG_REFETCH_INTERVAL_MS
      : overrides.refetchInterval,
});

export const sliceShortEpgToWindow = (
  items: ParsedShortEpgItem[],
  windowStartMs: number,
  windowEndMs: number,
  limit = EPG_WINDOW_ITEM_LIMIT
): ParsedShortEpgItem[] => {
  return items
    .filter((item) => item.endMs > windowStartMs && item.startMs < windowEndMs)
    .slice(0, limit);
};
