import FastImage from '@d11/react-native-fast-image';

let PREFETCH_CACHE_LIMIT = 300;
let PREFETCH_CONCURRENCY = 4;

const prefetchedUris = new Set<string>();
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
    return uri.trim();
};

export const isRemoteImageUri = (uri?: string | null) => {
    const normalized = normalizeImageUri(uri);
    return normalized.startsWith('http://') || normalized.startsWith('https://');
};

const trimPrefetchCache = () => {
    while (prefetchOrder.length > PREFETCH_CACHE_LIMIT) {
        const oldest = prefetchOrder.shift();
        if (oldest) {
            prefetchedUris.delete(oldest);
        }
    }
};

const trackWarmUri = (uri: string) => {
    if (!uri || prefetchedUris.has(uri)) return;
    prefetchedUris.add(uri);
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
            activePrefetchCount -= 1;
            schedulePrefetch();
        };

        if (preloadPromise && typeof preloadPromise.then === 'function') {
            preloadPromise.then(onComplete).catch(onComplete);
        } else {
            // Fallback for versions where preload does not return a Promise.
            setTimeout(onComplete, 200);
        }
    }
};

export const prefetchImage = (uri?: string) => {
    const normalized = normalizeImageUri(uri);
    if (!normalized || !isRemoteImageUri(normalized) || prefetchedUris.has(normalized)) return;

    trackWarmUri(normalized);
    prefetchQueue.push(normalized);
    schedulePrefetch();
};

/**
 * Batch prefetch multiple images using FastImage.preload native batching.
 */
export const prefetchImages = (uris: Array<string | undefined>) => {
    const validUris = uris
        .map((uri) => normalizeImageUri(uri))
        .filter((uri) => uri && isRemoteImageUri(uri) && !prefetchedUris.has(uri));

    if (validUris.length === 0) return;

    // Respect the concurrency limit by batching into chunks.
    const batchSize = Math.max(PREFETCH_CONCURRENCY, 4);
    for (let i = 0; i < validUris.length; i += batchSize) {
        const batch = validUris.slice(i, i + batchSize);
        const sources = batch.map((uri) => ({ uri }));

        // Stagger batches to avoid flooding the network.
        if (i === 0) {
            FastImage.preload(sources);
        } else {
            setTimeout(() => FastImage.preload(sources), Math.floor(i / batchSize) * 150);
        }
    }

    validUris.forEach((uri) => trackWarmUri(uri));
};

/**
 * Best-effort warmup that resolves when preload batches have had a chance to finish.
 * Useful for short UI gates where we want to wait briefly for the first image chunk.
 */
export const prefetchImagesReady = async (uris: Array<string | undefined>) => {
    const validUris = uris
        .map((uri) => normalizeImageUri(uri))
        .filter((uri) => uri && isRemoteImageUri(uri));

    if (validUris.length === 0) return;

    const uniqueUris = Array.from(new Set(validUris));
    const batchSize = Math.max(PREFETCH_CONCURRENCY, 4);
    const pending: Promise<unknown>[] = [];

    for (let i = 0; i < uniqueUris.length; i += batchSize) {
        const batch = uniqueUris.slice(i, i + batchSize);
        const sources = batch.map((uri) => ({ uri }));
        const preloadResult: any = FastImage.preload(sources);

        if (preloadResult && typeof preloadResult.then === 'function') {
            pending.push(preloadResult.catch(() => undefined));
        } else {
            pending.push(new Promise((resolve) => setTimeout(resolve, 180)));
        }

        batch.forEach((uri) => trackWarmUri(uri));
    }

    await Promise.all(pending);
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
    return Boolean(normalized && prefetchedUris.has(normalized));
};
