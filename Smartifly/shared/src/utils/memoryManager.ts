/**
 * Memory Manager
 *
 * Centralized utility for managing memory when the app transitions between
 * foreground and background states. On low-end devices, aggressive memory
 * trimming can prevent OOM kills.
 *
 * Usage: Call `setupMemoryManager()` once in the root navigator.
 */

import { AppState, AppStateStatus } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { getPerfProfile } from './perf';
import { logger } from '../config';

// Track current app state to avoid duplicate transitions
let currentAppState: AppStateStatus = AppState.currentState;
let subscription: ReturnType<typeof AppState.addEventListener> | null = null;

/**
 * Called when the app moves to background.
 * Aggressiveness depends on the device tier.
 */
const onBackground = async () => {
    try {
        const perf = await getPerfProfile();

        logger.debug(`[MemoryManager] App backgrounded, tier: ${perf.tier}`);

        // 1. Clear FastImage disk cache on low-tier (aggressive)
        if (perf.tier === 'low') {
            FastImage.clearMemoryCache();
            logger.debug('[MemoryManager] Cleared FastImage memory cache (low tier)');
        }

        // 2. Cleanup expired downloads (safe, doesn't delete valid data)
        try {
            const { default: useDownloadStore } = require('../store/downloadStore');
            useDownloadStore.getState().cleanupExpired();
            logger.debug('[MemoryManager] Cleaned up expired downloads');
        } catch {
            // downloadStore may not be available in all builds
        }

        // 3. Prune watch history to keep it within limits
        try {
            const { useWatchHistoryStore } = require('../store/watchHistoryStore');
            const history = useWatchHistoryStore.getState().history;
            const entries = Object.keys(history);
            if (entries.length > 500) {
                logger.debug(`[MemoryManager] Watch history has ${entries.length} entries, pruning not needed (handled by store)`);
            }
        } catch {
            // watchHistoryStore may not be available
        }

    } catch (err) {
        logger.warn('[MemoryManager] Error during background cleanup:', err);
    }
};

/**
 * Called when the app returns to foreground.
 * Light cleanup and state refresh.
 */
const onForeground = async () => {
    try {
        logger.debug('[MemoryManager] App returned to foreground');
        // The navigator already calls refreshCacheIfNeeded() on foreground,
        // so we don't duplicate that here.
    } catch (err) {
        logger.warn('[MemoryManager] Error during foreground restore:', err);
    }
};

/**
 * Sets up the AppState listener for memory management.
 * Call once from the root navigator. Returns a cleanup function.
 */
export const setupMemoryManager = (): (() => void) => {
    // Prevent double-setup
    if (subscription) {
        return () => { };
    }

    subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
        if (currentAppState === 'active' && nextState.match(/inactive|background/)) {
            onBackground();
        }
        if (currentAppState.match(/inactive|background/) && nextState === 'active') {
            onForeground();
        }
        currentAppState = nextState;
    });

    logger.debug('[MemoryManager] Initialized');

    return () => {
        if (subscription) {
            subscription.remove();
            subscription = null;
            logger.debug('[MemoryManager] Cleaned up');
        }
    };
};
