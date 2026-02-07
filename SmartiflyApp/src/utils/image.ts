import FastImage from '@d11/react-native-fast-image';

const PREFETCH_CACHE_LIMIT = 300;
const PREFETCH_CONCURRENCY = 4; // Increased for FastImage preload

const prefetchedUris = new Set<string>();
const prefetchOrder: string[] = [];
const prefetchQueue: string[] = [];
let activePrefetchCount = 0;

const isRemoteUri = (uri: string) => uri.startsWith('http://') || uri.startsWith('https://');

const trimPrefetchCache = () => {
    while (prefetchOrder.length > PREFETCH_CACHE_LIMIT) {
        const oldest = prefetchOrder.shift();
        if (oldest) {
            prefetchedUris.delete(oldest);
        }
    }
};

const schedulePrefetch = () => {
    while (activePrefetchCount < PREFETCH_CONCURRENCY && prefetchQueue.length > 0) {
        const uri = prefetchQueue.shift();
        if (!uri) return;

        activePrefetchCount += 1;

        // Use FastImage.preload for more efficient prefetching
        FastImage.preload([{ uri }])
        // FastImage.preload doesn't return a promise in all versions consistently, 
        // but we can assume it's starting. 
        // To keep the queue moving, we'll just treat it as background fire-and-forget 
        // or wrap it if necessary.

        // Simulating completion for the queue manager
        setTimeout(() => {
            activePrefetchCount -= 1;
            schedulePrefetch();
        }, 100);
    }
};

export const prefetchImage = (uri?: string) => {
    if (!uri || !isRemoteUri(uri) || prefetchedUris.has(uri)) return;
    prefetchedUris.add(uri);
    prefetchOrder.push(uri);
    trimPrefetchCache();
    prefetchQueue.push(uri);
    schedulePrefetch();
};

export const prefetchImages = (uris: Array<string | undefined>) => {
    const validUris = uris.filter(uri => uri && isRemoteUri(uri) && !prefetchedUris.has(uri)) as string[];
    if (validUris.length === 0) return;

    // FastImage can preload multiple at once
    const sources = validUris.map(uri => ({ uri }));
    FastImage.preload(sources);

    validUris.forEach(uri => {
        prefetchedUris.add(uri);
        prefetchOrder.push(uri);
    });
    trimPrefetchCache();
};
