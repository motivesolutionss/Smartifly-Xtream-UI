import { getSafeMmkv } from '../utils/storage';
import { normalizeImageUri } from '../utils/image';

const STORAGE_ID = 'smartifly-persisted-image-state';
const HOME_OVERRIDES_KEY = 'home-overrides-v1';
const BROWSE_OVERRIDES_KEY = 'browse-overrides-v1';
const BROWSE_WARM_KEY = 'browse-warm-v1';
const DETAIL_BACKDROPS_KEY = 'detail-backdrops-v1';
const EPISODE_THUMBS_KEY = 'episode-thumbs-v1';
const EPISODE_WARM_KEY = 'episode-warm-v1';
const MAX_ITEMS = 3000;

type StringMap = Record<string, string>;
type WarmMap = Record<string, number>;

let homeOverridesCache: StringMap | null = null;
let browseOverridesCache: StringMap | null = null;
let browseWarmCache: WarmMap | null = null;
let detailBackdropsCache: StringMap | null = null;
let episodeThumbsCache: StringMap | null = null;
let episodeWarmCache: WarmMap | null = null;

const readStringMap = (key: string, cacheRef: { current: StringMap | null }): StringMap => {
    if (cacheRef.current) return cacheRef.current;
    const storage = getSafeMmkv(STORAGE_ID);
    const raw = storage?.getString(key);
    if (!raw) {
        cacheRef.current = {};
        return cacheRef.current;
    }
    try {
        cacheRef.current = JSON.parse(raw) as StringMap;
    } catch {
        cacheRef.current = {};
    }
    return cacheRef.current;
};

const readWarmMap = (key: string, cacheRef: { current: WarmMap | null }): WarmMap => {
    if (cacheRef.current) return cacheRef.current;
    const storage = getSafeMmkv(STORAGE_ID);
    const raw = storage?.getString(key);
    if (!raw) {
        cacheRef.current = {};
        return cacheRef.current;
    }
    try {
        cacheRef.current = JSON.parse(raw) as WarmMap;
    } catch {
        cacheRef.current = {};
    }
    return cacheRef.current;
};

const trimStringMap = (input: StringMap): StringMap => {
    const entries = Object.entries(input);
    if (entries.length <= MAX_ITEMS) return input;
    return Object.fromEntries(entries.slice(entries.length - MAX_ITEMS));
};

const trimWarmMap = (input: WarmMap): WarmMap => {
    const entries = Object.entries(input)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_ITEMS);
    return Object.fromEntries(entries);
};

const persistStringMap = (key: string, value: StringMap) => {
    const storage = getSafeMmkv(STORAGE_ID);
    if (!storage) return;
    storage.set(key, JSON.stringify(trimStringMap(value)));
};

const persistWarmMap = (key: string, value: WarmMap) => {
    const storage = getSafeMmkv(STORAGE_ID);
    if (!storage) return;
    storage.set(key, JSON.stringify(trimWarmMap(value)));
};

const homeOverridesRef = { current: homeOverridesCache };
const browseOverridesRef = { current: browseOverridesCache };
const browseWarmRef = { current: browseWarmCache };
const detailBackdropsRef = { current: detailBackdropsCache };
const episodeThumbsRef = { current: episodeThumbsCache };
const episodeWarmRef = { current: episodeWarmCache };

const setRefCaches = () => {
    homeOverridesCache = homeOverridesRef.current;
    browseOverridesCache = browseOverridesRef.current;
    browseWarmCache = browseWarmRef.current;
    detailBackdropsCache = detailBackdropsRef.current;
    episodeThumbsCache = episodeThumbsRef.current;
    episodeWarmCache = episodeWarmRef.current;
};

export const getPersistedHomeImageOverrides = (): StringMap => {
    const map = readStringMap(HOME_OVERRIDES_KEY, homeOverridesRef);
    setRefCaches();
    return map;
};

export const setPersistedHomeImageOverride = (key: string, uri?: string | null) => {
    const normalized = normalizeImageUri(uri);
    if (!key || !normalized) return;
    const map = readStringMap(HOME_OVERRIDES_KEY, homeOverridesRef);
    if (map[key] === normalized) return;
    map[key] = normalized;
    homeOverridesRef.current = map;
    setRefCaches();
    persistStringMap(HOME_OVERRIDES_KEY, map);
};

export const getPersistedBrowseImageOverrides = (): StringMap => {
    const map = readStringMap(BROWSE_OVERRIDES_KEY, browseOverridesRef);
    setRefCaches();
    return map;
};

export const setPersistedBrowseImageOverride = (key: string, uri?: string | null) => {
    const normalized = normalizeImageUri(uri);
    if (!key || !normalized) return;
    const map = readStringMap(BROWSE_OVERRIDES_KEY, browseOverridesRef);
    if (map[key] === normalized) return;
    map[key] = normalized;
    browseOverridesRef.current = map;
    setRefCaches();
    persistStringMap(BROWSE_OVERRIDES_KEY, map);
};

export const isPersistedBrowseImageWarm = (key: string): boolean => {
    const map = readWarmMap(BROWSE_WARM_KEY, browseWarmRef);
    setRefCaches();
    return Boolean(map[key]);
};

export const markPersistedBrowseImageWarm = (key: string) => {
    if (!key) return;
    const map = readWarmMap(BROWSE_WARM_KEY, browseWarmRef);
    map[key] = Date.now();
    browseWarmRef.current = map;
    setRefCaches();
    persistWarmMap(BROWSE_WARM_KEY, map);
};

const buildDetailKey = (type: 'movie' | 'series', id: string | number) => `${type}:${String(id)}`;

export const getPersistedDetailBackdropOverride = (
    type: 'movie' | 'series',
    id: string | number
): string => {
    const map = readStringMap(DETAIL_BACKDROPS_KEY, detailBackdropsRef);
    setRefCaches();
    return map[buildDetailKey(type, id)] || '';
};

export const setPersistedDetailBackdropOverride = (
    type: 'movie' | 'series',
    id: string | number,
    uri?: string | null
) => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return;
    const map = readStringMap(DETAIL_BACKDROPS_KEY, detailBackdropsRef);
    const key = buildDetailKey(type, id);
    if (map[key] === normalized) return;
    map[key] = normalized;
    detailBackdropsRef.current = map;
    setRefCaches();
    persistStringMap(DETAIL_BACKDROPS_KEY, map);
};

const buildEpisodeKey = (seriesId: string | number, episodeId: string | number) =>
    `${String(seriesId)}:${String(episodeId)}`;

export const getPersistedEpisodeThumbnailOverride = (
    seriesId: string | number,
    episodeId: string | number
): string => {
    const map = readStringMap(EPISODE_THUMBS_KEY, episodeThumbsRef);
    setRefCaches();
    return map[buildEpisodeKey(seriesId, episodeId)] || '';
};

export const setPersistedEpisodeThumbnailOverride = (
    seriesId: string | number,
    episodeId: string | number,
    uri?: string | null
) => {
    const normalized = normalizeImageUri(uri);
    if (!normalized) return;
    const map = readStringMap(EPISODE_THUMBS_KEY, episodeThumbsRef);
    const key = buildEpisodeKey(seriesId, episodeId);
    if (map[key] === normalized) return;
    map[key] = normalized;
    episodeThumbsRef.current = map;
    setRefCaches();
    persistStringMap(EPISODE_THUMBS_KEY, map);
};

export const isPersistedEpisodeThumbnailWarm = (
    seriesId: string | number,
    episodeId: string | number
): boolean => {
    const map = readWarmMap(EPISODE_WARM_KEY, episodeWarmRef);
    setRefCaches();
    return Boolean(map[buildEpisodeKey(seriesId, episodeId)]);
};

export const markPersistedEpisodeThumbnailWarm = (
    seriesId: string | number,
    episodeId: string | number
) => {
    const map = readWarmMap(EPISODE_WARM_KEY, episodeWarmRef);
    map[buildEpisodeKey(seriesId, episodeId)] = Date.now();
    episodeWarmRef.current = map;
    setRefCaches();
    persistWarmMap(EPISODE_WARM_KEY, map);
};
