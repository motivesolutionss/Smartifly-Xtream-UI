/**
 * Watch History Store
 * 
 * Netflix-grade watch progress tracking.
 * Persists to AsyncStorage for offline access.
 * 
 * Features:
 * - Track movie, series episode, and live channel progress
 * - Resume position for VOD content
 * - Recently watched ordering
 * - Progress percentage for UI
 * - Xtream stream_id based tracking
 * 
 * @enterprise-grade
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfileStore } from './profileStore';
import { createDebouncedStorage } from '../utils/storage';

// =============================================================================
// TYPES
// =============================================================================

export type WatchContentType = 'live' | 'movie' | 'series';

export interface WatchProgress {
    /** Unique key: `${type}-${streamId}` - always uses stream_id (episode stream_id for series) */
    id: string;
    /** Content type */
    type: WatchContentType;
    /** Xtream stream_id (for series: episode stream_id) */
    streamId: number;
    /** For series: series_id (metadata only, not used for ID) */
    seriesId?: number;
    /** Season number (for series) */
    seasonNumber?: number;
    /** Episode number (for series) */
    episodeNumber?: number;
    /** Progress percentage 0-100 */
    progress: number;
    /** Current position in seconds */
    position: number;
    /** Total duration in seconds */
    duration: number;
    /** Last watched timestamp */
    lastWatched: number;
    /** Content title */
    title: string;
    /** Episode title (for series) */
    episodeTitle?: string;
    /** Thumbnail/poster URL */
    thumbnail?: string;
    /** Whether content was completed (>90%) */
    completed: boolean;
    /** Full data object for navigation */
    data?: unknown;
    /** Source provider (for future multi-provider support) */
    source?: 'xtream' | 'stalker' | 'm3u';
}

interface WatchHistoryState {
    /** All watch history entries */
    history: Record<string, WatchProgress>;

    /** Add or update watch progress */
    updateProgress: (progress: Omit<WatchProgress, 'id' | 'lastWatched' | 'completed'>) => void;

    /** Get progress for a specific item */
    getProgress: (type: WatchContentType, streamId: number) => WatchProgress | null;

    /** Get continue watching items (sorted by lastWatched, excludes completed) */
    getContinueWatching: (limit?: number) => WatchProgress[];

    /** Get recently watched (all items, sorted) */
    getRecentlyWatched: (limit?: number) => WatchProgress[];

    /** Mark as completed */
    markCompleted: (id: string) => void;

    /** Remove from history */
    removeFromHistory: (id: string) => void;

    /** Clear all history */
    clearHistory: () => void;
}

/**
 * Generate a unique watch history ID namespaced by profile.
 * Format: `${profileId}-${type}-${streamId}`
 */
const generateId = (
    type: WatchContentType,
    streamId: number,
    profileId?: string
): string => {
    const pId = profileId || useProfileStore.getState().activeProfileId || 'default';
    return `${pId}-${type}-${streamId}`;
};

/**
 * Get current profile ID for watch history operations.
 */
const getCurrentProfileId = (): string => {
    return useProfileStore.getState().activeProfileId || 'default';
};

const isCompleted = (progress: number): boolean => progress >= 90;

// =============================================================================
// PERSISTENCE OPTIMIZATIONS
// =============================================================================

const WATCH_HISTORY_DEBOUNCE_MS = 1000;

const watchHistoryStorage = createJSONStorage(() =>
    createDebouncedStorage(AsyncStorage, WATCH_HISTORY_DEBOUNCE_MS)
);

const sanitizeHistoryForStorage = (
    history: Record<string, WatchProgress>
): Record<string, WatchProgress> => {
    const sanitized: Record<string, WatchProgress> = {};
    for (const [id, item] of Object.entries(history)) {
        sanitized[id] = {
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
            completed: item.completed,
            source: item.source,
        };
    }
    return sanitized;
};

export const useWatchHistoryStore = create<WatchHistoryState>()(
    persist(
        (set, get) => ({
            history: {},

            updateProgress: (progress) => {
                const id = generateId(progress.type, progress.streamId);

                const completed = isCompleted(progress.progress);

                set((state) => ({
                    history: {
                        ...state.history,
                        [id]: {
                            ...progress,
                            id,
                            lastWatched: Date.now(),
                            completed,
                            source: 'xtream', // Default source
                        },
                    },
                }));
            },

            getProgress: (type, streamId) => {
                const id = generateId(type, streamId);
                return get().history[id] || null;
            },

            getContinueWatching: (limit = 10) => {
                const profileId = getCurrentProfileId();
                const items = Object.values(get().history)
                    // Filter by current profile (entries start with profileId)
                    .filter((item) => item.id.startsWith(profileId))
                    .filter((item) => !item.completed && item.progress > 0)
                    .sort((a, b) => b.lastWatched - a.lastWatched)
                    .slice(0, limit);

                return items;
            },

            getRecentlyWatched: (limit = 20) => {
                const profileId = getCurrentProfileId();
                const items = Object.values(get().history)
                    // Filter by current profile (entries start with profileId)
                    .filter((item) => item.id.startsWith(profileId))
                    .sort((a, b) => b.lastWatched - a.lastWatched)
                    .slice(0, limit);

                return items;
            },

            markCompleted: (id) => {
                set((state) => {
                    if (!state.history[id]) return state;
                    return {
                        history: {
                            ...state.history,
                            [id]: {
                                ...state.history[id],
                                completed: true,
                                progress: 100,
                            },
                        },
                    };
                });
            },

            removeFromHistory: (id) => {
                set((state) => {
                    const nextHistory = { ...state.history };
                    delete nextHistory[id];
                    return { history: nextHistory };
                });
            },

            clearHistory: () => {
                set({ history: {} });
            },
        }),
        {
            name: 'smartifly-watch-history',
            storage: watchHistoryStorage,
            partialize: (state) => ({
                history: sanitizeHistoryForStorage(state.history),
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
            data?: unknown
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
            data?: unknown
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
            data?: unknown
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
