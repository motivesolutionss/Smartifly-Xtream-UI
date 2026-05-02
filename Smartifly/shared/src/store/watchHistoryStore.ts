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
import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfileStore } from './profileStore';

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
    const profileState = useProfileStore.getState();
    const fallbackProfileId = profileState.profiles?.[0]?.id;
    const pId = profileId || profileState.activeProfileId || fallbackProfileId || 'default';
    return `${pId}-${type}-${streamId}`;
};

/**
 * Get current profile ID for watch history operations.
 */
const getCurrentProfileId = (): string => {
    const profileState = useProfileStore.getState();
    return profileState.activeProfileId || profileState.profiles?.[0]?.id || 'default';
};

const isCompleted = (progress: number): boolean => progress >= 90;
const MAX_CONTINUE_WATCHING_ITEMS = 10;

const getContinueIdentity = (item: WatchProgress): string => {
    if (item.type === 'series') {
        // Collapse multiple episode stream variants into one series-level continue card when seriesId exists.
        if (typeof item.seriesId === 'number' && Number.isFinite(item.seriesId) && item.seriesId > 0) {
            return `series-${item.seriesId}`;
        }
        return `series-${item.streamId}`;
    }
    return `${item.type}-${item.streamId}`;
};

// =============================================================================
// PERSISTENCE
// =============================================================================
// Watch history should survive quick reloads and restarts.
// Prefer MMKV (sync writes) with AsyncStorage fallback.
const isJsiAvailable = (): boolean => {
    return typeof (globalThis as any)?.nativeCallSyncHook === 'function';
};

let watchMmkv: MMKV | null = null;
const getWatchMmkv = (): MMKV | null => {
    if (!isJsiAvailable()) return null;
    if (watchMmkv) return watchMmkv;
    try {
        watchMmkv = new MMKV({ id: 'smartifly-watch-history-v2' });
        return watchMmkv;
    } catch {
        return null;
    }
};

const watchStorageBackend: StateStorage = {
    getItem: (name: string) => {
        const mmkv = getWatchMmkv();
        if (mmkv) {
            const mmkvValue = mmkv.getString(name);
            if (mmkvValue != null) return mmkvValue;
            return AsyncStorage.getItem(name).then((fallback) => {
                if (fallback != null) {
                    mmkv.set(name, fallback);
                }
                return fallback;
            });
        }
        return AsyncStorage.getItem(name);
    },
    setItem: (name: string, value: string) => {
        const mmkv = getWatchMmkv();
        if (mmkv) {
            mmkv.set(name, value);
            return;
        }
        return AsyncStorage.setItem(name, value);
    },
    removeItem: (name: string) => {
        const mmkv = getWatchMmkv();
        if (mmkv) {
            mmkv.delete(name);
            return;
        }
        return AsyncStorage.removeItem(name);
    },
};

const watchHistoryStorage = createJSONStorage(() => watchStorageBackend);

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
                    history: (() => {
                        const nextHistory: Record<string, WatchProgress> = {
                            ...state.history,
                            [id]: {
                                ...progress,
                                id,
                                lastWatched: Date.now(),
                                completed,
                                source: 'xtream', // Default source
                            },
                        };

                        // Keep only latest N in-progress items to avoid rail bloat across reloads/sessions.
                        const inProgress = Object.values(nextHistory)
                            .filter((item) => !item.completed && item.progress > 0)
                            .sort((a, b) => b.lastWatched - a.lastWatched);

                        if (inProgress.length > MAX_CONTINUE_WATCHING_ITEMS) {
                            const keepIds = new Set(
                                inProgress
                                    .slice(0, MAX_CONTINUE_WATCHING_ITEMS)
                                    .map((item) => item.id)
                            );

                            for (const [key, value] of Object.entries(nextHistory)) {
                                if (!value.completed && value.progress > 0 && !keepIds.has(key)) {
                                    delete nextHistory[key];
                                }
                            }
                        }

                        return nextHistory;
                    })(),
                }));
            },

            getProgress: (type, streamId) => {
                const id = generateId(type, streamId);
                return get().history[id] || null;
            },

            getContinueWatching: (limit = 10) => {
                const items = Object.values(get().history)
                    .filter((item) => !item.completed && item.progress > 0)
                    .sort((a, b) => b.lastWatched - a.lastWatched);

                // Deduplicate repeated cards (same movie/live/series identity), keep most recent.
                const seen = new Set<string>();
                const deduped: WatchProgress[] = [];
                for (const item of items) {
                    const identity = getContinueIdentity(item);
                    if (seen.has(identity)) continue;
                    seen.add(identity);
                    deduped.push(item);
                    if (deduped.length >= limit) break;
                }

                return deduped;
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
