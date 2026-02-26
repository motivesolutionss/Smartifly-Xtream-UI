/**
 * Environment variable validation utility
 * Ensures critical variables are set in production
 */

import { logger } from "./logger";

/**
 * Validates and retrieves an environment variable.
 * In production, it throws an error if a critical variable is missing.
 * In development, it logs a warning and uses a fallback.
 */
export function getEnvVar(key: string, fallback: string | null = null, isRequired = true): string {
    const value = process.env[key];
    const isProd = process.env.NODE_ENV === 'production';

    if (!value) {
        if (isRequired && isProd) {
            const errorMsg = `CRITICAL ERROR: Missing required environment variable: ${key}`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        if (isRequired) {
            logger.warn(`Warning: Missing environment variable ${key}. Using fallback: ${fallback}`);
        }

        return fallback || '';
    }

    return value;
}

/**
 * Validated environment variables
 */
export const ENV = {
    // Explicit access is required for Next.js to inline the variable at build time
    BACKEND_URL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, ''),
    NODE_ENV: process.env.NODE_ENV || 'development',
};
