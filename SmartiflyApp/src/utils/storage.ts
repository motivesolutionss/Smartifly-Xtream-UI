import AsyncStorage from '@react-native-async-storage/async-storage';

type PendingWrite = { key: string; value: string };

export const createDebouncedStorage = (
    storage: typeof AsyncStorage,
    delayMs: number
) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let pending: PendingWrite | null = null;

    const flush = async () => {
        if (!pending) return;
        const { key, value } = pending;
        pending = null;
        await storage.setItem(key, value);
    };

    return {
        getItem: (name: string) => storage.getItem(name),
        setItem: (name: string, value: string) => {
            pending = { key: name, value };
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                flush().catch(() => { });
            }, delayMs);
            return Promise.resolve();
        },
        removeItem: (name: string) => {
            pending = null;
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            return storage.removeItem(name);
        },
    };
};
