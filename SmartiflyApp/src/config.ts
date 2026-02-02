/**
 * Smartifly App Configuration
 * 
 * Environment-based configuration for backend URLs and app settings.
 * Supports Android emulator, iOS simulator, and real device scenarios.
 */

import { Platform } from 'react-native';

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Determine if running in development mode
 * __DEV__ is a React Native global that's true in dev builds
 */
const isDevelopment = __DEV__;

/**
 * Determine if running on Android emulator
 * Note: This is a heuristic - may not be 100% reliable
 */
const isAndroidEmulator = Platform.OS === 'android' && __DEV__;

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
    // Universal Backend URL
    const BACKEND_URL = 'https://smartifly-xtream-ui-production-2d03.up.railway.app/api';

    return BACKEND_URL;
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
        timeout: 10000, // 10 seconds
    },

    /**
     * Xtream API configuration
     */
    xtream: {
        timeout: 15000, // 15 seconds for content API calls
    },

    /**
     * Cache configuration
     */
    cache: {
        maxAgeMs: 6 * 60 * 60 * 1000, // 6 hours
        staleWhileRevalidateMs: 12 * 60 * 60 * 1000, // 12 hours
    },

    /**
     * App metadata
     */
    app: {
        name: 'Smartifly',
        version: '1.0.0',
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
