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
  completed: boolean;
  data?: any;
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

export const useWatchHistoryStore = create<WatchHistoryStore>()(
  persist(
    (set, get) => ({
      history: {},

      updateProgress: (progress) => {
        const id = generateWatchHistoryId(progress.type, progress.streamId);
        const completed = isCompleted(progress.progress);

        set((state) => {
          const currentHistory = normalizeHistory(state.history);
          return {
            history: {
              ...currentHistory,
              [id]: {
                ...progress,
                id,
                lastWatched: Date.now(),
                completed,
              },
            },
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
          .slice(0, limit);
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
      storage: watchHistoryStorage,
      partialize: (state) => ({
        history: state.history,
      }),
    }
  )
);

export const useTrackProgress = () => {
  const updateProgress = useWatchHistoryStore((state) => state.updateProgress);

  return {
    trackMovie: (
      streamId: number,
      title: string,
      position: number,
      duration: number,
      thumbnail?: string,
      data?: any
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
        data,
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
      data?: any
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
        data,
      });
    },

    trackLive: (
      streamId: number,
      title: string,
      thumbnail?: string,
      data?: any
    ) => {
      updateProgress({
        type: 'live',
        streamId,
        title,
        position: 0,
        duration: 0,
        progress: 0,
        thumbnail,
        data,
      });
    },
  };
};

export default useWatchHistoryStore;
