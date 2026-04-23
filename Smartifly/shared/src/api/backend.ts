import axios from 'axios';
import { config, logger } from '../config';
import { recordRequestMetric } from '../utils/requestMetrics';

// Backend API client using centralized config
const backendApi = axios.create({
    baseURL: config.api.baseUrl,
    timeout: config.api.timeout,
});

backendApi.interceptors.request.use((request) => {
    (request as any).__requestStartedAt = Date.now();
    return request;
});

backendApi.interceptors.response.use(
    (response) => {
        const startedAt = Number((response.config as any).__requestStartedAt || Date.now());
        recordRequestMetric({
            scope: 'backend',
            method: String(response.config.method || 'GET').toUpperCase(),
            endpoint: response.config.url || 'unknown',
            durationMs: Math.max(0, Date.now() - startedAt),
            status: response.status,
            success: true,
        });
        return response;
    },
    (error) => {
        const configRef = error?.config || {};
        const startedAt = Number((configRef as any).__requestStartedAt || Date.now());
        recordRequestMetric({
            scope: 'backend',
            method: String(configRef.method || 'GET').toUpperCase(),
            endpoint: String(configRef.url || 'unknown'),
            durationMs: Math.max(0, Date.now() - startedAt),
            status: error?.response?.status,
            success: false,
        });
        return Promise.reject(error);
    }
);

// Get portals from backend
export const getPortals = async () => {
    try {
        const response = await backendApi.get('/portals');
        return response.data;
    } catch (error) {
        logger.error('Failed to fetch portals', error);
        throw error;
    }
};

// Get announcements
export const getAnnouncements = async (
    params?: { status?: string; type?: string },
    options?: { silent?: boolean }
) => {
    try {
        const response = await backendApi.get('/announcements', { params });
        return response.data;
    } catch (error) {
        if (!options?.silent) {
            logger.error('Failed to fetch announcements', error);
        }
        throw error;
    }
};

// Get app settings (maintenance mode, version)
export const getAppSettings = async () => {
    try {
        const response = await backendApi.get('/settings');
        return response.data;
    } catch (error) {
        logger.error('Failed to fetch app settings', error);
        throw error;
    }
};

// Register device for push notifications
export const registerDevice = async (token: string, platform: string) => {
    try {
        const response = await backendApi.post('/notifications/register', { token, platform });
        return response.data;
    } catch (error) {
        logger.error('Failed to register device', error);
        throw error;
    }
};

export default backendApi;

