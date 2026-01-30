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
    data?: any;
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique ID for watch progress.
 * Always uses just type + streamId for simplicity and cross-provider safety.
 * For series: streamId should be the episode's stream_id (globally unique).
 */
const generateId = (
    type: WatchContentType,
    streamId: number
): string => `${type}-${streamId}`;

/**
 * Check if content is considered completed (>90% progress)
 */
const isCompleted = (progress: number): boolean => progress >= 90;

// =============================================================================
// STORE
// =============================================================================

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
                const items = Object.values(get().history)
                    // Exclude completed items
                    .filter((item) => !item.completed && item.progress > 0)
                    // Sort by most recent
                    .sort((a, b) => b.lastWatched - a.lastWatched)
                    // Limit
                    .slice(0, limit);

                return items;
            },

            getRecentlyWatched: (limit = 20) => {
                const items = Object.values(get().history)
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
                    const { [id]: removed, ...rest } = state.history;
                    return { history: rest };
                });
            },

            clearHistory: () => {
                set({ history: {} });
            },
        }),
        {
            name: 'smartifly-watch-history',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist the history object
            partialize: (state) => ({ history: state.history }),
        }
    )
);

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Hook to track watch progress (call from player)
 */
export const useTrackProgress = () => {
    const updateProgress = useWatchHistoryStore((state) => state.updateProgress);

    return {
        /**
         * Track movie progress
         */
        trackMovie: (
            streamId: number,
            title: string,
            position: number,
            duration: number,
            thumbnail?: string,
            data?: any
        ) => {
            if (duration <= 0) return;

            updateProgress({
                type: 'movie',
                streamId,
                title,
                position,
                duration,
                progress: Math.round((position / duration) * 100),
                thumbnail,
                data,
            });
        },

        /**
         * Track series episode progress
         * @param episodeStreamId - The episode's stream_id (used as unique ID)
         * @param seriesId - The parent series ID (metadata only)
         */
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
            if (duration <= 0) return;

            updateProgress({
                type: 'series',
                streamId: episodeStreamId, // Episode stream_id is the unique ID
                seriesId,
                title: seriesTitle,
                episodeTitle,
                seasonNumber,
                episodeNumber,
                position,
                duration,
                progress: Math.round((position / duration) * 100),
                thumbnail,
                data,
            });
        },

        /**
         * Track live channel view (just last watched, no progress)
         */
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
                progress: 0, // Live doesn't have progress
                thumbnail,
                data,
            });
        },
    };
};

export default useWatchHistoryStore;
