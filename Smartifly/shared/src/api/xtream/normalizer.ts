import { logger } from '../../config';

/**
 * Hybrid response normalizer for Xtream servers.
 * Handles direct arrays, wrapped arrays, empty objects, auth/error objects,
 * numeric-keyed objects, and unknown malformed shapes.
 */
export const normalizeArrayResponse = <T>(data: any, possibleKeys: string[] = []): T[] => {
    // Case 1: Already an array - perfect.
    if (Array.isArray(data)) {
        return data;
    }

    // Case 2: Null, undefined, or empty string.
    if (data === null || data === undefined || data === '') {
        logger.warn('XtreamAPI: Received null/undefined/empty response, returning empty array');
        return [];
    }

    // Case 3: Empty object {}.
    if (typeof data === 'object' && Object.keys(data).length === 0) {
        logger.warn('XtreamAPI: Received empty object {}, returning empty array');
        return [];
    }

    // Case 4: Error-like object.
    if (typeof data === 'object') {
        if (data.user_info?.auth === 0 || data.auth === 0) {
            logger.error('XtreamAPI: Authentication failed in response', {
                message: data.user_info?.message || data.message,
            });
            return [];
        }

        if (data.user_info && data.server_info) {
            if (data.user_info.auth === 1) {
                logger.warn('XtreamAPI: Portal returned auth response instead of content data', {
                    username: data.user_info.username,
                    status: data.user_info.status,
                    message: 'This portal may use a non-standard API or account has no content assigned',
                });
            } else {
                logger.error('XtreamAPI: Portal returned auth response with failed auth', {
                    auth: data.user_info.auth,
                    message: data.user_info.message,
                });
            }
            return [];
        }

        if (data.error || data.Error || data.ERROR) {
            logger.error('XtreamAPI: Error in response', {
                error: data.error || data.Error || data.ERROR,
            });
            return [];
        }

        // Case 5: Wrapped array under common keys.
        const allKeys = [
            ...possibleKeys,
            'data',
            'items',
            'list',
            'streams',
            'channels',
            'live_streams',
            'vod_streams',
            'series',
            'movies',
            'result',
            'results',
        ];

        for (const key of allKeys) {
            if (Array.isArray(data[key])) {
                logger.info(`XtreamAPI: Extracted array from wrapped response key "${key}"`, {
                    count: data[key].length,
                });
                return data[key];
            }
        }

        // Case 6: Object with numeric keys.
        const numericKeys = Object.keys(data).filter((k) => !isNaN(Number(k)));
        if (numericKeys.length > 0 && numericKeys.length === Object.keys(data).length) {
            const extracted = Object.values(data) as T[];
            logger.info('XtreamAPI: Converted numeric-keyed object to array', { count: extracted.length });
            return extracted;
        }
    }

    // Case 7: Unknown format.
    logger.error('XtreamAPI: Unable to normalize response to array', {
        type: typeof data,
        isArray: Array.isArray(data),
        keys: typeof data === 'object' ? Object.keys(data).slice(0, 10) : undefined,
        sample: JSON.stringify(data).substring(0, 500),
    });

    return [];
};
