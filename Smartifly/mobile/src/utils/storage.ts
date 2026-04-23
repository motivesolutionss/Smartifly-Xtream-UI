import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';
import { logger } from '../config';

/**
 * Checks if the JSI (JavaScript Interface) is available.
 * MMKV requires JSI to function.
 */
export const isJsiAvailable = (): boolean => {
    return typeof (globalThis as any)?.nativeCallSyncHook === 'function';
};

/**
 * MMKV Instance Cache
 */
const mmkvInstances: Record<string, MMKV> = {};

/**
 * Safely creates or retrieves an MMKV instance.
 * Falls back to null if JSI is not available or initialization fails.
 */
export const getSafeMmkv = (id: string): MMKV | null => {
    if (!isJsiAvailable()) return null;
    if (mmkvInstances[id]) return mmkvInstances[id];

    try {
        mmkvInstances[id] = new MMKV({ id });
        return mmkvInstances[id];
    } catch (e) {
        logger.warn(`Storage: Failed to init MMKV ${id}`, e);
        return null;
    }
};

/**
 * Standard Perf Storage Adapter for Zustand
 * Lazily picks between MMKV and AsyncStorage
 */
export const createPerfStorage = (id: string, debounceMs?: number): StateStorage => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let pendingWrite: { key: string; value: string } | null = null;

    const flush = async () => {
        if (!pendingWrite) return;
        const { key, value } = pendingWrite;
        pendingWrite = null;
        await AsyncStorage.setItem(key, value);
    };

    return {
        getItem: (name: string) => {
            const mmkv = getSafeMmkv(id);
            if (mmkv) return mmkv.getString(name) ?? null;
            return AsyncStorage.getItem(name);
        },
        setItem: (name: string, value: string) => {
            const mmkv = getSafeMmkv(id);
            if (mmkv) {
                mmkv.set(name, value);
                return;
            }

            // If AsyncStorage, apply debouncing if requested
            if (debounceMs) {
                pendingWrite = { key: name, value };
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(() => {
                    flush().catch(() => { });
                }, debounceMs);
                return Promise.resolve();
            }

            return AsyncStorage.setItem(name, value);
        },
        removeItem: (name: string) => {
            const mmkv = getSafeMmkv(id);
            if (mmkv) {
                mmkv.delete(name);
                return;
            }

            pendingWrite = null;
            if (timeout) clearTimeout(timeout);
            return AsyncStorage.removeItem(name);
        },
    };
};

/**
 * Debounced storage wrapper (AsyncStorage / StateStorage compatible).
 * Used for low-frequency writes (watch history, downloads) to reduce IO.
 */
export const createDebouncedStorage = (
    storage: Pick<StateStorage, 'getItem' | 'setItem' | 'removeItem'>,
    debounceMs: number = 500
): StateStorage => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let pendingWrite: { key: string; value: string } | null = null;

    const flush = async () => {
        if (!pendingWrite) return;
        const { key, value } = pendingWrite;
        pendingWrite = null;
        await storage.setItem(key, value);
    };

    return {
        getItem: (name: string) => storage.getItem(name),
        setItem: (name: string, value: string) => {
            pendingWrite = { key: name, value };
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                flush().catch(() => { });
            }, debounceMs);
            return Promise.resolve();
        },
        removeItem: (name: string) => {
            pendingWrite = null;
            if (timeout) clearTimeout(timeout);
            return storage.removeItem(name);
        },
    };
};
