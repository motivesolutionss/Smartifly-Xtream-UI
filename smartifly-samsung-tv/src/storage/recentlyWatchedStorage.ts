import { localStorageService } from "./localStorageService";
import { playlistStorage } from "./playlistStorage";
import { profileStorage } from "./profileStorage";

type RecentlyWatchedListener = () => void;
const recentlyWatchedListeners = new Set<RecentlyWatchedListener>();
let recentlyWatchedRevision = 0;

const emitRecentlyWatchedChange = () => {
  recentlyWatchedRevision += 1;
  recentlyWatchedListeners.forEach((listener) => listener());
};

const getHistoryKey = (): string | null => {
  const playlistId = playlistStorage.getActivePlaylistId();
  const profileId = profileStorage.getActiveProfileId();
  if (!playlistId || !profileId) return null;
  return `smartifly_history_${playlistId}_${profileId}`;
};
const MAX_HISTORY = 50;
const HISTORY_WRITE_DELAY_MS = 800;

export type PlaybackContentType = "live" | "vod" | "series";

export interface RecentlyWatchedItem {
  id: string;
  type: PlaybackContentType;
  title: string;
  imageUrl?: string;
  backdropUrl?: string;
  watchedAt: string;
  positionSeconds?: number;
  durationSeconds?: number;
  seriesId?: string;
  metadata?: {
    seasonNumber?: number;
    episodeNumber?: number;
    episodeId?: string;
  };
  nextItem?: {
    id: string;
    title: string;
    imageUrl?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  };
}

export type HistoryItem = RecentlyWatchedItem;

const hasNumber = (value?: number): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toMillis = (iso: string | undefined) => {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mergeHistoryItems = (
  existing: RecentlyWatchedItem,
  incoming: RecentlyWatchedItem
): RecentlyWatchedItem => {
  const incomingWatchedAtMs = toMillis(incoming.watchedAt);
  const existingWatchedAtMs = toMillis(existing.watchedAt);
  const incomingIsNewer = incomingWatchedAtMs >= existingWatchedAtMs;

  const mergedPosition = hasNumber(incoming.positionSeconds)
    ? incomingIsNewer || !hasNumber(existing.positionSeconds)
      ? incoming.positionSeconds
      : existing.positionSeconds
    : existing.positionSeconds;

  const mergedDuration =
    incomingIsNewer
      ? incoming.durationSeconds ?? existing.durationSeconds ?? undefined
      : existing.durationSeconds ?? incoming.durationSeconds ?? undefined;

  const mergedMetadata =
    existing.metadata || incoming.metadata
      ? {
          seasonNumber:
            incoming.metadata?.seasonNumber ??
            existing.metadata?.seasonNumber ??
            undefined,
          episodeNumber:
            incoming.metadata?.episodeNumber ??
            existing.metadata?.episodeNumber ??
            undefined,
          episodeId:
            incoming.metadata?.episodeId ??
            existing.metadata?.episodeId ??
            undefined,
        }
      : undefined;

  const watchedAt =
    incomingIsNewer
      ? incoming.watchedAt
      : existing.watchedAt;

  return {
    ...existing,
    ...incoming,
    title: incoming.title || existing.title,
    imageUrl: incoming.imageUrl || existing.imageUrl,
    backdropUrl: incoming.backdropUrl || existing.backdropUrl,
    positionSeconds: mergedPosition,
    durationSeconds: mergedDuration,
    seriesId: incoming.seriesId || existing.seriesId,
    metadata: mergedMetadata,
    nextItem: incoming.nextItem || existing.nextItem,
    watchedAt,
  };
};

export const recentlyWatchedStorage = {
  getItems: (): RecentlyWatchedItem[] => {
    const key = getHistoryKey();
    if (!key) return [];
    return localStorageService.get<RecentlyWatchedItem[]>(key) || [];
  },

  saveItem: (item: RecentlyWatchedItem): void => {
    const history = recentlyWatchedStorage.getItems();
    const existing = history.find(
      (entry) => entry.id === item.id && entry.type === item.type
    );
    const merged = existing ? mergeHistoryItems(existing, item) : item;
    const filteredHistory = history.filter(
      (entry) => entry.id !== merged.id || entry.type !== merged.type
    );

    const key = getHistoryKey();
    if (!key) return;
    localStorageService.setDeferred(
      key,
      [merged, ...filteredHistory].slice(0, MAX_HISTORY),
      HISTORY_WRITE_DELAY_MS
    );
    emitRecentlyWatchedChange();
  },

  getHistory: (): HistoryItem[] => {
    return recentlyWatchedStorage.getItems();
  },

  addEntry: (item: Omit<HistoryItem, "watchedAt">) => {
    const newEntry: RecentlyWatchedItem = {
      ...item,
      watchedAt: new Date().toISOString(),
    };

    recentlyWatchedStorage.saveItem(newEntry);
  },

  getContinueWatching: (): RecentlyWatchedItem[] => {
    return recentlyWatchedStorage
      .getItems()
      .filter(
        (item) =>
          item.type !== "live" && (item.positionSeconds === undefined || item.positionSeconds >= 30)
      )
      .slice(0, 20);
  },

  removeItem: (id: string, type: RecentlyWatchedItem["type"]): void => {
    const history = recentlyWatchedStorage
      .getItems()
      .filter((item) => !(item.id === id && item.type === type));
    const key = getHistoryKey();
    if (!key) return;
    localStorageService.setDeferred(key, history, HISTORY_WRITE_DELAY_MS);
    emitRecentlyWatchedChange();
  },

  clearHistory: () => {
    const key = getHistoryKey();
    if (!key) return;
    localStorageService.setDeferred(key, [], HISTORY_WRITE_DELAY_MS);
    emitRecentlyWatchedChange();
  },

  subscribe: (listener: RecentlyWatchedListener) => {
    recentlyWatchedListeners.add(listener);
    return () => {
      recentlyWatchedListeners.delete(listener);
    };
  },

  getRevision: () => recentlyWatchedRevision,
};
