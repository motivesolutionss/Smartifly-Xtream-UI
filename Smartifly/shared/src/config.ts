/**
 * Smartifly App Configuration
 * 
 * Environment-based configuration for backend URLs and app settings.
 * Supports Android emulator, iOS simulator, and real device scenarios.
 */

// import { Platform } from 'react-native';

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Determine if running in development mode
 * __DEV__ is a React Native global that's true in dev builds
 */
const isDevelopment = __DEV__;



// =============================================================================
// BACKEND URLS
// =============================================================================

/**
 * Get the appropriate backend base URL based on environment and platform
 * 
 * - Android Emulator: 10.0.2.2 (special alias for host machine localhost)
 * - iOS Simulator: localhost works directly
 * - Physical devices: Use your actual server IP/domain
 */
const getBackendUrl = (): string => {
    // Xtream UI Backend — always use the production URL
    // (no local instance of this backend runs during development)
    return 'https://api.xtreamui.duckdns.org/api';
}
/**
 * Get the Master Backend URL (Portfolio/Father System)
 * Replicates logic from MasterService.ts for update checks
 */
const getMasterBackendUrl = (): string => {
    // Always use production master backend
    return 'https://api.smartifly-portfolio.duckdns.org/api';
};

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const config = {
    /**
     * Backend API configuration
     */
    api: {
        baseUrl: getBackendUrl(),
        masterBackendUrl: getMasterBackendUrl(),
        timeout: 10000, // 10 seconds
    },

    /**
     * Xtream API configuration
     */
    xtream: {
        timeout: 15000, // 15 seconds for content API calls
        retryCount: 1, // one fast retry for transient network failures
    },

    /**
     * Cache configuration
     */
    cache: {
        maxAgeMs: 6 * 60 * 60 * 1000, // 6 hours
        staleWhileRevalidateMs: 12 * 60 * 60 * 1000, // 12 hours
        // Persistent cache for content (MMKV + compression)
        persistent: {
            enabled: true,
            maxBytes: 6 * 1024 * 1024, // 6 MB compressed cap
            maxItemsPerDomain: 1500, // safety cap per domain
        },
        // Optional light prefetch mode: store only a subset initially
        prefetchMode: 'full' as 'full' | 'light',
        lightPrefetchLimit: 800, // per domain when light mode is enabled
    },

    /**
     * Large catalog behavior
     */
    catalog: {
        serverPagination: {
            enabled: true,
            threshold: 3500, // attempt server paging when domain/category is very large
            pageSize: 180, // requested page size for browse grids
        },
    },

    /**
     * App metadata
     */
    app: {
        name: 'Smartifly',
        version: '3.0.0',
        isDevelopment,
    },

    /**
     * Logging configuration
     * In production, all logs are disabled
     */
    logging: {
        enabled: isDevelopment,
        level: isDevelopment ? 'debug' : 'error',
    },
} as const;

// =============================================================================
// LOGGER UTILITY
// =============================================================================

/**
 * Production-safe logger
 * Only logs in development mode
 */
export const logger = {
    debug: (message: string, ...args: any[]) => {
        if (config.logging.enabled && config.logging.level === 'debug') {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    },
    info: (message: string, ...args: any[]) => {
        if (config.logging.enabled) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    warn: (message: string, ...args: any[]) => {
        if (config.logging.enabled) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    error: (message: string, ...args: any[]) => {
        // Errors are always logged, but could be sent to error tracking service
        if (config.logging.enabled) {
            console.error(`[ERROR] ${message}`, ...args);
        }
        // TODO: In production, send to error tracking service (Sentry, Bugsnag, etc.)
    },
};

export default config;
