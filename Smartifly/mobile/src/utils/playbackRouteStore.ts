import { logger } from '../config';
import { getSafeMmkv } from './storage';

export type PlaybackPlayer = 'vlc' | 'native';
export type StoredPlaybackEngine = 'native' | 'ios_vlc' | 'ios_alt_engine';

export interface LearnedPlaybackRoute {
    player: PlaybackPlayer;
    engine?: StoredPlaybackEngine;
    extension?: string;
    host?: string;
    hostPinnedAt?: number;
    timeoutProfile?: 'default' | 'vlc';
    lastSuccessAt: number;
    consecutiveFailures?: number;
    lastFailureAt?: number;
    failedEngine?: StoredPlaybackEngine;
    consecutiveEngineFailures?: number;
    lastEngineFailureAt?: number;
}

const STORAGE_ID = 'smartifly-playback-routes-v1';
const KEY_PREFIX = 'route:';
const ROUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HOST_PIN_TTL_MS = 10 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 30 * 60 * 1000;
const ENGINE_FAILURE_COOLDOWN_MS = 20 * 60 * 1000;
const MAX_CONSECUTIVE_FAILURES = 2;
const MAX_CONSECUTIVE_ENGINE_FAILURES = 2;

const deriveEngineFromPlayer = (player: PlaybackPlayer): StoredPlaybackEngine => (
    player === 'vlc' ? 'ios_vlc' : 'native'
);

const getStore = () => getSafeMmkv(STORAGE_ID);

const makeRouteKey = (
    scope: string,
    type: 'movie' | 'series',
    streamId: string | number
): string => `${KEY_PREFIX}${scope}|${type}|${String(streamId)}`;

export const getLearnedPlaybackRoute = (
    scope: string,
    type: 'movie' | 'series',
    streamId: string | number
): LearnedPlaybackRoute | null => {
    const mmkv = getStore();
    if (!mmkv) return null;
    try {
        const raw = mmkv.getString(makeRouteKey(scope, type, streamId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LearnedPlaybackRoute;
        if (!parsed?.player || !parsed?.lastSuccessAt) return null;
        if (!parsed.engine) {
            parsed.engine = deriveEngineFromPlayer(parsed.player);
        }
        const ageMs = Date.now() - Number(parsed.lastSuccessAt);
        if (ageMs > ROUTE_TTL_MS) return null;
        const failures = Number(parsed.consecutiveFailures || 0);
        const lastFailureAt = Number(parsed.lastFailureAt || 0);
        if (
            failures >= MAX_CONSECUTIVE_FAILURES
            && lastFailureAt > 0
            && Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS
        ) {
            return null;
        }
        return parsed;
    } catch (error) {
        logger.warn('PlaybackRouteStore: read failed', error);
        return null;
    }
};

export const saveLearnedPlaybackRoute = (
    scope: string,
    type: 'movie' | 'series',
    streamId: string | number,
    route: Omit<LearnedPlaybackRoute, 'lastSuccessAt'>
): void => {
    const mmkv = getStore();
    if (!mmkv) return;
    try {
        const payload: LearnedPlaybackRoute = {
            ...route,
            engine: route.engine || deriveEngineFromPlayer(route.player),
            hostPinnedAt: route.host ? Date.now() : undefined,
            lastSuccessAt: Date.now(),
            consecutiveFailures: 0,
            lastFailureAt: undefined,
            failedEngine: undefined,
            consecutiveEngineFailures: 0,
            lastEngineFailureAt: undefined,
        };
        mmkv.set(makeRouteKey(scope, type, streamId), JSON.stringify(payload));
    } catch (error) {
        logger.warn('PlaybackRouteStore: write failed', error);
    }
};

export const markLearnedPlaybackRouteFailure = (
    scope: string,
    type: 'movie' | 'series',
    streamId: string | number
): void => {
    const mmkv = getStore();
    if (!mmkv) return;
    const key = makeRouteKey(scope, type, streamId);
    try {
        const raw = mmkv.getString(key);
        if (!raw) return;
        const parsed = JSON.parse(raw) as LearnedPlaybackRoute;
        if (!parsed?.player || !parsed?.lastSuccessAt) return;
        const failures = Number(parsed.consecutiveFailures || 0) + 1;
        const payload: LearnedPlaybackRoute = {
            ...parsed,
            consecutiveFailures: failures,
            lastFailureAt: Date.now(),
        };
        mmkv.set(key, JSON.stringify(payload));
    } catch (error) {
        logger.warn('PlaybackRouteStore: mark failure failed', error);
    }
};

export const markLearnedPlaybackEngineFailure = (
    scope: string,
    type: 'movie' | 'series',
    streamId: string | number,
    engine: StoredPlaybackEngine
): void => {
    const mmkv = getStore();
    if (!mmkv) return;
    const key = makeRouteKey(scope, type, streamId);
    try {
        const raw = mmkv.getString(key);
        if (!raw) return;
        const parsed = JSON.parse(raw) as LearnedPlaybackRoute;
        if (!parsed?.player || !parsed?.lastSuccessAt) return;
        const previousFailedEngine = parsed.failedEngine;
        const nextFailures = previousFailedEngine === engine
            ? Number(parsed.consecutiveEngineFailures || 0) + 1
            : 1;
        const payload: LearnedPlaybackRoute = {
            ...parsed,
            failedEngine: engine,
            consecutiveEngineFailures: nextFailures,
            lastEngineFailureAt: Date.now(),
        };
        mmkv.set(key, JSON.stringify(payload));
    } catch (error) {
        logger.warn('PlaybackRouteStore: mark engine failure failed', error);
    }
};

export const isLearnedPlaybackEngineCoolingDown = (
    route: LearnedPlaybackRoute | null | undefined,
    engine: StoredPlaybackEngine | null | undefined
): boolean => {
    if (!route || !engine) return false;
    if (route.failedEngine !== engine) return false;
    const failures = Number(route.consecutiveEngineFailures || 0);
    const lastFailureAt = Number(route.lastEngineFailureAt || 0);
    if (failures < MAX_CONSECUTIVE_ENGINE_FAILURES) return false;
    if (!lastFailureAt) return false;
    return Date.now() - lastFailureAt < ENGINE_FAILURE_COOLDOWN_MS;
};

export const getPinnedPlaybackHost = (
    scope: string,
    type: 'movie' | 'series',
    streamId: string | number
): string | null => {
    const route = getLearnedPlaybackRoute(scope, type, streamId);
    if (!route?.host) return null;
    const pinnedAt = Number(route.hostPinnedAt || route.lastSuccessAt || 0);
    if (!pinnedAt) return null;
    if (Date.now() - pinnedAt > HOST_PIN_TTL_MS) return null;
    return route.host;
};
