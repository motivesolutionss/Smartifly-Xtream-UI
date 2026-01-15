/**
 * Production-safe logger utility
 * Only logs in development mode to prevent exposing internal data
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
    /**
     * Log information (only in development)
     */
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Log warnings (only in development)
     */
    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    /**
     * Log errors (always logged, even in production)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Log debugging information (only in development)
     */
    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },
};
