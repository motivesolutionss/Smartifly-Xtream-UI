import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config, logger } from '../../config';
import { recordRequestMetric } from '../../utils/requestMetrics';

export const validateXtreamCredentials = (serverUrl: string, username: string, password: string) => {
    logger.info('XtreamAPI constructor called with:', {
        serverUrl,
        serverUrlType: typeof serverUrl,
        serverUrlLength: serverUrl?.length,
        username,
        usernameType: typeof username,
        hasPassword: !!password,
    });

    if (serverUrl === undefined) {
        const error = new Error('XtreamAPI: serverUrl is undefined');
        logger.error(error.message);
        throw error;
    }

    if (serverUrl === null) {
        const error = new Error('XtreamAPI: serverUrl is null');
        logger.error(error.message);
        throw error;
    }

    if (typeof serverUrl !== 'string') {
        const error = new Error(`XtreamAPI: serverUrl must be string, got ${typeof serverUrl}`);
        logger.error(error.message);
        throw error;
    }

    if (serverUrl.trim() === '') {
        const error = new Error('XtreamAPI: serverUrl is empty string');
        logger.error(error.message);
        throw error;
    }

    if (!username || typeof username !== 'string' || username.trim() === '') {
        const error = new Error(`XtreamAPI: username is invalid: "${username}"`);
        logger.error(error.message);
        throw error;
    }

    if (!password) {
        const error = new Error('XtreamAPI: password is required');
        logger.error(error.message);
        throw error;
    }
};

const repairXtreamResponse = (response: AxiosResponse) => {
    // Case 1: Already parsed by Axios.
    if (typeof response.data !== 'string') {
        if (Array.isArray(response.data)) {
            logger.debug('Xtream: Valid array response', { length: response.data.length });
        }
        return response;
    }

    // Case 2: String response.
    const rawData = response.data.trim();

    if (!rawData) {
        logger.warn('Xtream: Empty response');
        response.data = [];
        return response;
    }

    // Normal parse first.
    try {
        response.data = JSON.parse(rawData);
        logger.debug('Xtream: Parsed string response successfully');
        return response;
    } catch {
        logger.debug('Xtream: JSON parse failed, attempting repair...', {
            length: rawData.length,
            start: rawData.substring(0, 100),
            end: rawData.substring(rawData.length - 50),
        });
    }

    try {
        const isArray = rawData.startsWith('[');
        const isObject = rawData.startsWith('{');

        if (isArray) {
            const repairs = [
                rawData + ']',
                rawData + '}]',
                rawData + '"}]',
                rawData + '"}]',
            ];

            for (const attempt of repairs) {
                try {
                    response.data = JSON.parse(attempt);
                    logger.info('Xtream: Repaired truncated array response');
                    return response;
                } catch {
                    // Continue repairs.
                }
            }
        } else if (isObject) {
            const repairs = [
                rawData + '}',
                rawData + '"}',
                rawData + '"}}',
            ];

            for (const attempt of repairs) {
                try {
                    response.data = JSON.parse(attempt);
                    logger.info('Xtream: Repaired truncated object response');
                    return response;
                } catch {
                    // Continue repairs.
                }
            }
        }

        logger.error('Xtream: JSON repair failed', {
            url: response.config.url,
            length: rawData.length,
            start: rawData.substring(0, 200),
            end: rawData.substring(rawData.length - 100),
        });

        throw new Error(`Xtream returned invalid JSON (${rawData.length} chars, unrepairable)`);
    } catch (repairError: any) {
        logger.error('Xtream: Fatal JSON error', { message: repairError.message });
        throw repairError;
    }
};

export const createXtreamClient = (baseUrl: string): AxiosInstance => {
    const client = axios.create({
        baseURL: baseUrl,
        timeout: config.xtream.timeout ?? 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        decompress: true,
    });

    client.interceptors.request.use((request) => {
        (request as any).__requestStartedAt = Date.now();
        return request;
    });

    client.interceptors.response.use(
        (response: AxiosResponse) => {
            const startedAt = Number((response.config as any).__requestStartedAt || Date.now());
            recordRequestMetric({
                scope: 'xtream',
                method: String(response.config.method || 'GET').toUpperCase(),
                endpoint: response.config.url || 'unknown',
                durationMs: Math.max(0, Date.now() - startedAt),
                status: response.status,
                success: true,
            });

            logger.debug('Xtream response received', {
                url: response.config.url,
                status: response.status,
                dataType: typeof response.data,
                isArray: Array.isArray(response.data),
                rawLength: typeof response.data === 'string' ? response.data.length : undefined,
            });

            return repairXtreamResponse(response);
        },
        (error: any) => {
            const configRef = error?.config || {};
            const startedAt = Number((configRef as any).__requestStartedAt || Date.now());
            recordRequestMetric({
                scope: 'xtream',
                method: String(configRef.method || 'GET').toUpperCase(),
                endpoint: String(configRef.url || 'unknown'),
                durationMs: Math.max(0, Date.now() - startedAt),
                status: error?.response?.status,
                success: false,
            });

            logger.error('Xtream API request failed', {
                message: error.message,
                url: error.config?.url,
                status: error.response?.status,
            });
            throw error;
        }
    );

    return client;
};
