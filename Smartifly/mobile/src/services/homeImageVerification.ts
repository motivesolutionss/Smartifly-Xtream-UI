import FastImage from '@d11/react-native-fast-image';
import { logger } from '../config';
import { markImageWarm, normalizeImageUri } from '../utils/image';
import { getSafeMmkv } from '../utils/storage';

export type HomeImageVerificationStatus =
    | 'unknown'
    | 'verified_ok'
    | 'verified_failed'
    | 'rejected_pattern';

type HomeImageVerificationRecord = {
    status: HomeImageVerificationStatus;
    checkedAt: number;
    failCount: number;
};

const STORAGE_ID = 'smartifly-home-image-verification';
const STORAGE_KEY = 'smartifly-home-image-verification-v1';
const MAX_CACHE_ITEMS = 3000;
const KNOWN_BAD_PATTERNS = [
    /stareshare/i,
] as const;
const TRUSTED_CDN_PATTERNS = [
    /imagekit\.io/i,
    /ik\.imagekit\.io/i,
] as const;
const TRUSTED_CDN_FAILURE_THRESHOLD = 3;

let memoryCache: Record<string, HomeImageVerificationRecord> | null = null;
const inflightVerifications = new Map<string, Promise<HomeImageVerificationStatus>>();

const readCache = (): Record<string, HomeImageVerificationRecord> => {
    if (memoryCache) return memoryCache;

    const storage = getSafeMmkv(STORAGE_ID);
    const raw = storage?.getString(STORAGE_KEY);
    if (!raw) {
        memoryCache = {};
        return memoryCache;
    }

    try {
        memoryCache = JSON.parse(raw) as Record<string, HomeImageVerificationRecord>;
    } catch {
        memoryCache = {};
    }

    return memoryCache;
};

const persistCache = () => {
    const storage = getSafeMmkv(STORAGE_ID);
    if (!storage || !memoryCache) return;

    const trimmedEntries = Object.entries(memoryCache)
        .sort((a, b) => b[1].checkedAt - a[1].checkedAt)
        .slice(0, MAX_CACHE_ITEMS);

    memoryCache = Object.fromEntries(trimmedEntries);
    storage.set(STORAGE_KEY, JSON.stringify(memoryCache));
};

const getRejectedPatternStatus = (uri: string): HomeImageVerificationStatus | null => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return null;
    return KNOWN_BAD_PATTERNS.some((pattern) => pattern.test(normalized))
        ? 'rejected_pattern'
        : null;
};

const isTrustedCdnUri = (uri?: string | null): boolean => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return false;
    return TRUSTED_CDN_PATTERNS.some((pattern) => pattern.test(normalized));
};

export const getHomeImageVerificationStatus = (uri?: string | null): HomeImageVerificationStatus => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return 'unknown';

    const rejected = getRejectedPatternStatus(normalized);
    if (rejected) return rejected;

    const record = readCache()[normalized];
    if (!record) return 'unknown';

    if (
        record.status === 'verified_failed' &&
        isTrustedCdnUri(normalized) &&
        record.failCount < TRUSTED_CDN_FAILURE_THRESHOLD
    ) {
        return 'unknown';
    }

    return record.status;
};

export const setHomeImageVerificationStatus = (
    uri: string | undefined | null,
    status: HomeImageVerificationStatus
) => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return;

    const cache = readCache();
    const previous = cache[normalized];
    const nextFailCount = status === 'verified_failed'
        ? (previous?.failCount ?? 0) + 1
        : 0;

    cache[normalized] = {
        status,
        checkedAt: Date.now(),
        failCount: nextFailCount,
    };
    memoryCache = cache;
    persistCache();
};

export const markHomeImageVerifiedOk = (uri?: string | null) => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return;
    setHomeImageVerificationStatus(normalized, 'verified_ok');
    markImageWarm(normalized);
};

export const markHomeImageVerifiedFailed = (uri?: string | null) => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return;

    const cache = readCache();
    const previous = cache[normalized];
    const nextFailCount = (previous?.failCount ?? 0) + 1;

    if (isTrustedCdnUri(normalized) && nextFailCount < TRUSTED_CDN_FAILURE_THRESHOLD) {
        cache[normalized] = {
            status: 'unknown',
            checkedAt: Date.now(),
            failCount: nextFailCount,
        };
        memoryCache = cache;
        persistCache();
        return;
    }

    setHomeImageVerificationStatus(normalized, 'verified_failed');
};

export const shouldAllowHomeImageUri = (uri?: string | null): boolean => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return false;

    const record = readCache()[normalized];
    if (
        record?.status === 'verified_failed' &&
        isTrustedCdnUri(normalized) &&
        record.failCount < TRUSTED_CDN_FAILURE_THRESHOLD
    ) {
        return true;
    }

    const status = getHomeImageVerificationStatus(normalized);
    return status !== 'verified_failed' && status !== 'rejected_pattern';
};

export const verifyHomeImageUri = async (uri?: string | null): Promise<HomeImageVerificationStatus> => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return 'verified_failed';

    const knownStatus = getHomeImageVerificationStatus(normalized);
    if (knownStatus === 'verified_ok' || knownStatus === 'verified_failed' || knownStatus === 'rejected_pattern') {
        return knownStatus;
    }

    const existing = inflightVerifications.get(normalized);
    if (existing) return existing;

    const pending = (async () => {
        const rejected = getRejectedPatternStatus(normalized);
        if (rejected) {
            setHomeImageVerificationStatus(normalized, rejected);
            return rejected;
        }

        try {
            const result = (FastImage.preload as any)([{ uri: normalized, priority: FastImage.priority.high }]);
            if (result && typeof result.then === 'function') {
                await result;
            }
            markHomeImageVerifiedOk(normalized);
            return 'verified_ok' as const;
        } catch (error) {
            logger.warn('Home image verification failed', { uri: normalized, error });
            if (isTrustedCdnUri(normalized)) {
                markHomeImageVerifiedFailed(normalized);
                return getHomeImageVerificationStatus(normalized);
            }
            markHomeImageVerifiedFailed(normalized);
            return 'verified_failed' as const;
        } finally {
            inflightVerifications.delete(normalized);
        }
    })();

    inflightVerifications.set(normalized, pending);
    return pending;
};
