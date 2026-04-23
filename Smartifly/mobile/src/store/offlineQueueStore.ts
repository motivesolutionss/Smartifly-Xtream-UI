import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../config';

export type OfflineActionType =
    | 'refresh_content'
    | 'refresh_announcements'
    | 'retry_download';

export interface OfflineActionPayloadMap {
    refresh_content: Record<string, never> | undefined;
    refresh_announcements: Record<string, never> | undefined;
    retry_download: {
        id: string;
        url: string;
        filename: string;
    };
}

export interface OfflineAction<T extends OfflineActionType = OfflineActionType> {
    id: string;
    type: T;
    payload?: OfflineActionPayloadMap[T];
    createdAt: number;
    attempts: number;
    maxAttempts: number;
    lastAttemptAt?: number;
    lastError?: string;
}

interface OfflineQueueState {
    queue: OfflineAction[];
    isProcessing: boolean;
    lastProcessedAt: number | null;
}

interface OfflineQueueActions {
    enqueueAction: <T extends OfflineActionType>(
        type: T,
        payload?: OfflineActionPayloadMap[T],
        options?: { maxAttempts?: number }
    ) => string;
    removeAction: (id: string) => void;
    clearQueue: () => void;
    processQueue: () => Promise<void>;
}

type OfflineQueueStore = OfflineQueueState & OfflineQueueActions;

const DEFAULT_MAX_ATTEMPTS = 3;

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const stablePayload = (payload: unknown) => JSON.stringify(payload ?? {});
const actionKey = (type: OfflineActionType, payload: unknown) => `${type}|${stablePayload(payload)}`;

const executeAction = async (action: OfflineAction): Promise<boolean> => {
    switch (action.type) {
        case 'refresh_content': {
            const useContentStore = (await import('./contentStore')).default;
            return useContentStore.getState().forceRefresh();
        }
        case 'refresh_announcements': {
            const useAppStatusStore = (await import('./appStatusStore')).default;
            return useAppStatusStore.getState().fetchAnnouncements({ force: true });
        }
        case 'retry_download': {
            const payload = action.payload as OfflineActionPayloadMap['retry_download'] | undefined;
            if (!payload?.id || !payload?.url || !payload?.filename) {
                return true;
            }
            const downloadService = (await import('../services/downloadService')).default;
            return downloadService.startDownload(payload.id, payload.url, payload.filename);
        }
        default:
            return true;
    }
};

const useOfflineQueueStore = create<OfflineQueueStore>()(
    persist(
        (set, get) => ({
            queue: [],
            isProcessing: false,
            lastProcessedAt: null,

            enqueueAction: (type, payload, options) => {
                const maxAttempts = Math.max(1, options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
                const key = actionKey(type, payload);
                const existing = get().queue.find((item) => actionKey(item.type, item.payload) === key);

                if (existing) {
                    return existing.id;
                }

                const action: OfflineAction = {
                    id: generateId(),
                    type,
                    payload: payload as any,
                    createdAt: Date.now(),
                    attempts: 0,
                    maxAttempts,
                };

                set((state) => ({ queue: [...state.queue, action] }));
                logger.info('Offline queue: action enqueued', { type });
                return action.id;
            },

            removeAction: (id) => {
                set((state) => ({
                    queue: state.queue.filter((item) => item.id !== id),
                }));
            },

            clearQueue: () => {
                set({ queue: [] });
            },

            processQueue: async () => {
                if (get().isProcessing) return;
                const pending = get().queue;
                if (pending.length === 0) return;

                set({ isProcessing: true });
                const nextQueue: OfflineAction[] = [];

                try {
                    for (const action of pending) {
                        if (action.attempts >= action.maxAttempts) {
                            logger.warn('Offline queue: dropping action after max attempts', { type: action.type, id: action.id });
                            continue;
                        }

                        try {
                            const success = await executeAction(action);
                            if (!success) {
                                nextQueue.push({
                                    ...action,
                                    attempts: action.attempts + 1,
                                    lastAttemptAt: Date.now(),
                                    lastError: 'Action failed',
                                });
                            }
                        } catch (error: unknown) {
                            const message = error instanceof Error ? error.message : 'Unknown offline action error';
                            nextQueue.push({
                                ...action,
                                attempts: action.attempts + 1,
                                lastAttemptAt: Date.now(),
                                lastError: message,
                            });
                        }
                    }
                } finally {
                    set({
                        queue: nextQueue,
                        isProcessing: false,
                        lastProcessedAt: Date.now(),
                    });
                }
            },
        }),
        {
            name: 'smartifly-offline-queue-v1',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                queue: state.queue,
                lastProcessedAt: state.lastProcessedAt,
            }),
        }
    )
);

export default useOfflineQueueStore;
export { useOfflineQueueStore };
