import FastImage from '@d11/react-native-fast-image';

let PREFETCH_CACHE_LIMIT = 300;
let PREFETCH_CONCURRENCY = 4;

const queuedUris = new Set<string>();
const warmUris = new Set<string>();
const prefetchOrder: string[] = [];
const prefetchQueue: string[] = [];
let activePrefetchCount = 0;

/**
 * Configure image prefetching based on device performance tier.
 * Called once after perf profile is resolved.
 */
export const configurePrefetch = (opts: {
    cacheLimit: number;
    concurrency: number;
}) => {
    PREFETCH_CACHE_LIMIT = opts.cacheLimit;
    PREFETCH_CONCURRENCY = opts.concurrency;
    // Trim if the cache is already above the new limit.
    trimPrefetchCache();
};

export const normalizeImageUri = (uri?: string | null) => {
    if (!uri || typeof uri !== 'string') return '';
    const trimmed = uri.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
    }
    if (/^http:\/\/(www\.)?lyngsat\.com\//i.test(trimmed)) {
        return trimmed.replace(/^http:\/\//i, 'https://');
    }
    return trimmed;
};

export const isRemoteImageUri = (uri?: string | null) => {
    const normalized = normalizeImageUri(uri);
    return normalized.startsWith('http://') || normalized.startsWith('https://');
};

const trimPrefetchCache = () => {
    while (prefetchOrder.length > PREFETCH_CACHE_LIMIT) {
        const oldest = prefetchOrder.shift();
        if (oldest) {
            warmUris.delete(oldest);
        }
    }
};

const trackWarmUri = (uri: string) => {
    if (!uri || warmUris.has(uri)) return;
    queuedUris.delete(uri);
    warmUris.add(uri);
    prefetchOrder.push(uri);
    trimPrefetchCache();
};

/**
 * Processes the prefetch queue with async tracking.
 * Uses FastImage.preload and active request counting to honor concurrency.
 */
const schedulePrefetch = () => {
    while (activePrefetchCount < PREFETCH_CONCURRENCY && prefetchQueue.length > 0) {
        const uri = prefetchQueue.shift();
        if (!uri) return;

        activePrefetchCount += 1;

        // FastImage.preload may or may not return a Promise depending on version.
        const preloadPromise: any = FastImage.preload([{ uri }]);

        const onComplete = () => {
            queuedUris.delete(uri);
            activePrefetchCount -= 1;
            schedulePrefetch();
        };

        if (preloadPromise && typeof preloadPromise.then === 'function') {
            preloadPromise
                .then(() => {
                    trackWarmUri(uri);
                    onComplete();
                })
                .catch(onComplete);
        } else {
            // Fallback for versions where preload does not return a Promise.
            // Do not mark warm here because completion cannot be verified.
            setTimeout(onComplete, 200);
        }
    }
};

export const prefetchImage = (uri?: string) => {
    const normalized = normalizeImageUri(uri);
    if (!normalized || !isRemoteImageUri(normalized) || warmUris.has(normalized) || queuedUris.has(normalized)) return;

    queuedUris.add(normalized);
    prefetchQueue.push(normalized);
    schedulePrefetch();
};

/**
 * Batch prefetch multiple images using FastImage.preload native batching.
 */
export const prefetchImages = (uris: Array<string | undefined>) => {
    uris.forEach((uri) => prefetchImage(uri));
};

/**
 * Marks a URI as already warm in memory/disk cache.
 * Call from image onLoad handlers to avoid future loader flashes.
 */
export const markImageWarm = (uri?: string) => {
    const normalized = normalizeImageUri(uri);
    if (!normalized || !isRemoteImageUri(normalized)) return;
    trackWarmUri(normalized);
};

/**
 * Returns true when the URI was prefetched or previously loaded.
 */
export const isImageWarm = (uri?: string) => {
    const normalized = normalizeImageUri(uri);
    return Boolean(normalized && warmUris.has(normalized));
};
