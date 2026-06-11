import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAppStore } from './appStore';

export type WatchContentType = 'live' | 'movie' | 'series';

export interface WatchProgress {
  /** Unique namespaced key: `${portalCode}::${username}::${profileId}::${type}::${streamId}` */
  id: string;
  type: WatchContentType;
  streamId: number;
  seriesId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  progress: number; // 0-100
  position: number; // in seconds
  duration: number; // in seconds
  lastWatched: number; // timestamp
  title: string;
  episodeTitle?: string;
  thumbnail?: string;
  description?: string;
  playbackId?: string;
  containerExtension?: string;
  completed: boolean;
}

type WatchHistoryState = {
  history: Record<string, WatchProgress>;
};

type WatchHistoryActions = {
  updateProgress: (progress: Omit<WatchProgress, 'id' | 'lastWatched' | 'completed'>) => void;
  getProgress: (type: WatchContentType, streamId: number) => WatchProgress | null;
  getContinueWatching: (limit?: number) => WatchProgress[];
  markCompleted: (id: string) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
};

type WatchHistoryStore = WatchHistoryState & WatchHistoryActions;

export const buildWatchHistoryScope = (
  portalCode?: string | null,
  username?: string | null,
  profileId?: string | null
): string => {
  const pCode = portalCode || 'default';
  const uName = username || 'guest';
  const pId = profileId || 'primary';
  return `${pCode}::${uName.trim().toLowerCase()}::${pId}`;
};

export const generateWatchHistoryId = (
  type: WatchContentType,
  streamId: number
): string => {
  const state = useAppStore.getState();
  const scope = buildWatchHistoryScope(
    state.session?.portalCode,
    state.session?.username,
    state.selectedProfile?.id
  );
  return `${scope}::${type}::${streamId}`;
};

const safeStorage = {
  getItem(name: string) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string) {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Ignore
    }
  },
  removeItem(name: string) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore
    }
  }
};

const watchHistoryStorage = createJSONStorage(() => safeStorage);

function normalizeHistory(history: unknown): Record<string, WatchProgress> {
  return history && typeof history === 'object' ? (history as Record<string, WatchProgress>) : {};
}

const isCompleted = (progress: number): boolean => progress >= 90;
const MAX_HISTORY_ITEMS = 20;

function getScopeFromHistoryId(id: string) {
  const parts = id.split('::');
  if (parts.length < 5) {
    return '';
  }

  return parts.slice(0, 3).join('::');
}

export const useWatchHistoryStore = create<WatchHistoryStore>()(
  persist(
    (set, get) => ({
      history: {},

      updateProgress: (progress) => {
        const id = generateWatchHistoryId(progress.type, progress.streamId);
        const completed = isCompleted(progress.progress);
        const scope = getScopeFromHistoryId(id);

        set((state) => {
          const currentHistory = normalizeHistory(state.history);
          const nextHistory = {
            ...currentHistory,
            [id]: {
              ...progress,
              id,
              lastWatched: Date.now(),
              completed,
            },
          };

          const scopedEntries = Object.values(nextHistory)
            .filter((item) => getScopeFromHistoryId(item.id) === scope)
            .sort((a, b) => b.lastWatched - a.lastWatched);

          const trimmedHistory = { ...nextHistory };
          for (const item of scopedEntries.slice(MAX_HISTORY_ITEMS)) {
            delete trimmedHistory[item.id];
          }

          return {
            history: trimmedHistory,
          };
        });
      },

      getProgress: (type, streamId) => {
        const id = generateWatchHistoryId(type, streamId);
        const currentHistory = normalizeHistory(get().history);
        return currentHistory[id] || null;
      },

      getContinueWatching: (limit = 10) => {
        const state = useAppStore.getState();
        const scope = buildWatchHistoryScope(
          state.session?.portalCode,
          state.session?.username,
          state.selectedProfile?.id
        );

        const currentHistory = normalizeHistory(get().history);
        return Object.values(currentHistory)
          .filter((item) => item.id.startsWith(scope))
          .filter((item) => !item.completed && item.progress > 0)
          .sort((a, b) => b.lastWatched - a.lastWatched)
          .slice(0, Math.min(limit, MAX_HISTORY_ITEMS));
      },

      markCompleted: (id) => {
        set((state) => {
          const currentHistory = normalizeHistory(state.history);
          if (!currentHistory[id]) {
            return state;
          }
          return {
            history: {
              ...currentHistory,
              [id]: {
                ...currentHistory[id],
                completed: true,
                progress: 100,
              },
            },
          };
        });
      },

      removeFromHistory: (id) => {
        set((state) => {
          const currentHistory = { ...normalizeHistory(state.history) };
          delete currentHistory[id];
          return { history: currentHistory };
        });
      },

      clearHistory: () => {
        set({ history: {} });
      },
    }),
    {
      name: 'smartifly-lg-watch-history-v1',
      version: 2,
      storage: watchHistoryStorage,
      partialize: (state) => ({
        history: Object.fromEntries(
          Object.entries(state.history)
            .map(([id, item]) => [id, {
              id: item.id,
              type: item.type,
              streamId: item.streamId,
              seriesId: item.seriesId,
              seasonNumber: item.seasonNumber,
              episodeNumber: item.episodeNumber,
              progress: item.progress,
              position: item.position,
              duration: item.duration,
              lastWatched: item.lastWatched,
              title: item.title,
              episodeTitle: item.episodeTitle,
              thumbnail: item.thumbnail,
              description: item.description,
              playbackId: item.playbackId,
              containerExtension: item.containerExtension,
              completed: item.completed
            }])
        ),
      }),
    }
  )
);

export const useTrackProgress = () => {
  const updateProgress = useWatchHistoryStore((state) => state.updateProgress);
  type ProgressMetadata = {
    description?: string;
    playbackId?: string;
    containerExtension?: string;
  };

    return {
      trackMovie: (
        streamId: number,
        title: string,
        position: number,
        duration: number,
        thumbnail?: string,
        metadata?: ProgressMetadata
      ) => {
      const progress = duration > 0 ? Math.round((position / duration) * 100) : 1;

        updateProgress({
          type: 'movie',
          streamId,
          title,
          position,
          duration,
          progress: Math.min(Math.max(progress, 1), 100),
          thumbnail,
          description: metadata?.description,
          playbackId: metadata?.playbackId,
          containerExtension: metadata?.containerExtension
        });
      },

    trackEpisode: (
      episodeStreamId: number,
      seriesId: number,
      seriesTitle: string,
      episodeTitle: string,
      seasonNumber: number,
      episodeNumber: number,
      position: number,
      duration: number,
      thumbnail?: string,
      metadata?: ProgressMetadata
    ) => {
      const progress = duration > 0 ? Math.round((position / duration) * 100) : 1;

        updateProgress({
          type: 'series',
          streamId: episodeStreamId,
          seriesId,
          title: seriesTitle,
        episodeTitle,
        seasonNumber,
        episodeNumber,
        position,
        duration,
        progress: Math.min(Math.max(progress, 1), 100),
        thumbnail,
        description: metadata?.description,
        playbackId: metadata?.playbackId,
        containerExtension: metadata?.containerExtension
        });
      },

    trackLive: (
      streamId: number,
      title: string,
      thumbnail?: string,
      _data?: any
    ) => {
        updateProgress({
          type: 'live',
          streamId,
          title,
          position: 0,
          duration: 0,
          progress: 0,
          thumbnail
        });
      },
  };
};

export default useWatchHistoryStore;
