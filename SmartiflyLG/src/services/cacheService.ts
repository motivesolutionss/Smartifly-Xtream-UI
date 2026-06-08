export type CacheEntry<T> = {
  version: number;
  savedAt: number;
  ttlMs: number;
  value: T;
};

const CACHE_NAMESPACE = 'smartifly-lg-cache';
const CACHE_VERSION = 1;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function buildCacheKey(...parts: Array<string | number | null | undefined>) {
  return [CACHE_NAMESPACE, `v${CACHE_VERSION}`, ...parts.map((part) => String(part ?? ''))].join(':');
}

export function readCacheEntry<T>(key: string): CacheEntry<T> | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CacheEntry<T>>;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.version !== 'number' ||
      typeof parsed.savedAt !== 'number' ||
      typeof parsed.ttlMs !== 'number' ||
      !('value' in parsed)
    ) {
      return null;
    }

    return parsed as CacheEntry<T>;
  } catch {
    return null;
  }
}

export function readFreshCacheEntry<T>(key: string): CacheEntry<T> | null {
  const entry = readCacheEntry<T>(key);
  if (!entry) {
    return null;
  }

  if (!Number.isFinite(entry.ttlMs) || entry.ttlMs <= 0) {
    return entry;
  }

  if (Date.now() - entry.savedAt > entry.ttlMs) {
    return null;
  }

  return entry;
}

export function readFreshCacheValue<T>(key: string): T | null {
  return readFreshCacheEntry<T>(key)?.value ?? null;
}

export function writeCacheValue<T>(key: string, value: T, ttlMs: number) {
  if (!canUseStorage()) {
    return;
  }

  try {
    const entry: CacheEntry<T> = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      ttlMs,
      value
    };

    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage failures on restricted browsers or private modes.
  }
}

export function removeCacheValue(key: string) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures on restricted browsers or private modes.
  }
}

export function clearCacheByPrefix(prefix: string) {
  if (!canUseStorage()) {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures on restricted browsers or private modes.
  }
}

export const HOME_BOOTSTRAP_CACHE_TTL_MS = 15 * 60 * 1000;
export const DETAILS_CACHE_TTL_MS = 15 * 60 * 1000;
export const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;

export function buildHomeBootstrapCacheKey(portalCode: string, username: string, profileId: string) {
  return buildCacheKey('home-bootstrap', portalCode.trim().toUpperCase(), username.trim().toLowerCase(), profileId.trim());
}

export function buildMovieInfoCacheKey(portalCode: string, username: string, streamId: number) {
  return buildCacheKey('movie-info', portalCode.trim().toUpperCase(), username.trim().toLowerCase(), streamId);
}

export function buildSeriesInfoCacheKey(portalCode: string, username: string, seriesId: number) {
  return buildCacheKey('series-info', portalCode.trim().toUpperCase(), username.trim().toLowerCase(), seriesId);
}
