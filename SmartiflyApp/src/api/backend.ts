import axios from 'axios';
import { config, logger } from '../config';

// Backend API client using centralized config
const backendApi = axios.create({
    baseURL: config.api.baseUrl,
    timeout: config.api.timeout,
});

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
export const getAnnouncements = async (params?: { status?: string; type?: string }) => {
    try {
        const response = await backendApi.get('/announcements', { params });
        return response.data;
    } catch (error) {
        logger.error('Failed to fetch announcements', error);
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

