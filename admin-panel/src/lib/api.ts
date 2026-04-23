import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '') + '/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// Add auth token to requests and standardize URLs
api.interceptors.request.use((config) => {
    // Strip leading slash from URL to ensure it appends correctly to baseURL (which has a trailing slash)
    if (config.url?.startsWith('/')) {
        config.url = config.url.substring(1);
    }

    if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle auth errors with refresh token logic
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Skip token refresh for login/refresh endpoints - let errors pass through
        if (originalRequest.url?.includes('auth/login') || originalRequest.url?.includes('auth/refresh')) {
            return Promise.reject(error);
        }

        // If 401 and not a retry, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue the request while refreshing
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                if (typeof window === 'undefined') {
                    throw new Error('Token refresh is only available in browser context');
                }
                const refreshToken = sessionStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Use the api instance to ensure correct baseURL and interceptors
                const response = await api.post('auth/refresh', { refreshToken });
                const { token: newToken, refreshToken: newRefreshToken } = response.data;

                sessionStorage.setItem('token', newToken);
                sessionStorage.setItem('refreshToken', newRefreshToken);

                processQueue(null, newToken);

                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);

                // Clear tokens and redirect to login
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    me: () => api.get('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
        api.put('/auth/password', { currentPassword, newPassword }),
    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),
    logout: (refreshToken: string) =>
        api.post('/auth/logout', { refreshToken }),
};

// Portals API
export const portalsApi = {
    getAll: () => api.get('/portals/admin'),
    getPublic: () => api.get('/portals'),
    create: (data: { name: string; url: string; username?: string; password?: string; category?: string; description?: string; serverIp?: string }) =>
        api.post('/portals', data),
    update: (id: string, data: Partial<{ name: string; url: string; isActive: boolean; order: number; category: string; serverIp: string }>) =>
        api.put(`/portals/${id}`, data),
    delete: (id: string) => api.delete(`/portals/${id}`),
    reorder: (orders: { id: string; order: number }[]) => api.put('/portals/reorder', { orders }),

    // Health & Bulk Actions
    checkHealth: (id: string) => api.post(`/portals/${id}/check-health`),
    bulkAction: (ids: string[], action: 'enable' | 'disable' | 'delete' | 'check-health') =>
        api.post('/portals/bulk-actions', { ids, action }),
    import: (portals: any[]) => api.post('/portals/import', { portals }),
};

// Tickets API
export const ticketsApi = {
    getAll: (params?: { status?: string; priority?: string; page?: number; limit?: number; search?: string }) =>
        api.get('/tickets/admin/all', { params }),
    getStats: () => api.get('/tickets/admin/stats'),
    reply: (id: string, message: string) =>
        api.post(`/tickets/admin/${id}/reply`, { message }),
    updateStatus: (id: string, status: string) =>
        api.put(`/tickets/admin/${id}/status`, { status }),
    updateTags: (id: string, tags: string[]) =>
        api.put(`/tickets/admin/${id}/tags`, { tags }),
    delete: (id: string) => api.delete(`/tickets/admin/${id}`),
    bulkAction: (ids: string[], action: 'close' | 'resolve' | 'delete') =>
        api.post('/tickets/admin/bulk-action', { ids, action }),
    export: () => api.get('/tickets/admin/export', { responseType: 'blob' }),
    downloadAttachment: (attachmentId: string) =>
        api.get(`/tickets/admin/attachments/${encodeURIComponent(attachmentId)}/download`, { responseType: 'blob' }),
    uploadAttachments: (id: string, formData: FormData) =>
        api.post(`/tickets/admin/${id}/attachments`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),

    // Templates
    getTemplates: () => api.get('/tickets/admin/templates'),
    createTemplate: (data: { name: string; content: string; category?: string }) =>
        api.post('/tickets/admin/templates', data),
    updateTemplate: (id: string, data: Partial<{ name: string; content: string; category: string; isActive: boolean }>) =>
        api.put(`/tickets/admin/templates/${id}`, data),
    deleteTemplate: (id: string) => api.delete(`/tickets/admin/templates/${id}`),
};

// Packages API
export const packagesApi = {
    getAll: () => api.get('/packages/admin'),
    getPublic: () => api.get('/packages'),
    create: (data: { name: string; description: string; duration: string; price: number; currency?: string; features: string[]; isPopular?: boolean; pricingTiers?: any[] }) =>
        api.post('/packages', data),
    update: (id: string, data: Partial<{ name: string; description: string; duration: string; price: number; currency: string; features: string[]; isPopular: boolean; isActive: boolean; order: number; pricingTiers?: any[] }>) =>
        api.put(`/packages/${id}`, data),
    delete: (id: string) => api.delete(`/packages/${id}`),
    duplicate: (id: string, name?: string) => api.post(`/packages/${id}/duplicate`, { name }),
    getAnalytics: () => api.get('/packages/analytics'),
    trackView: (id: string) => api.post(`/packages/${id}/analytics/view`),
    trackPurchase: (id: string, amount: number) => api.post(`/packages/${id}/analytics/purchase`, { amount }),

    // Pricing Tiers
    getTiers: (id: string) => api.get(`/packages/${id}/tiers`),
    createTier: (id: string, data: { minQuantity: number; maxQuantity?: number | null; price: number; discount?: number | null }) =>
        api.post(`/packages/${id}/tiers`, data),
    updateTier: (tierId: string, data: { minQuantity: number; maxQuantity?: number | null; price: number; discount?: number | null }) =>
        api.put(`/packages/tiers/${tierId}`, data),
    deleteTier: (tierId: string) => api.delete(`/packages/tiers/${tierId}`),

    // Feature Templates
    getFeatureTemplates: () => api.get('/packages/feature-templates'),
    createFeatureTemplate: (data: { name: string; description?: string; features: string[]; category?: string; isActive?: boolean }) =>
        api.post('/packages/feature-templates', data),
    updateFeatureTemplate: (id: string, data: Partial<{ name: string; description: string; features: string[]; category: string; isActive: boolean }>) =>
        api.put(`/packages/feature-templates/${id}`, data),
    deleteFeatureTemplate: (id: string) => api.delete(`/packages/feature-templates/${id}`),
};

// Announcements API
export const announcementsApi = {
    getAll: () => api.get('/announcements/admin'),
    create: (data: { title: string; content: string; type?: string }) =>
        api.post('/announcements', data),
    update: (id: string, data: any) =>
        api.patch(`/announcements/${id}`, data),
    delete: (id: string) => api.delete(`/announcements/${id}`),
};

// Settings API
export const settingsApi = {
    get: () => api.get('/settings/admin'),
    update: (data: Partial<{ maintenanceMode: boolean; latestVersion: string; forceUpdate: boolean }>) =>
        api.put('/settings', data),

    // Feature Flags
    getFlags: () => api.get('/settings/flags'),
    createFlag: (data: any) => api.post('/settings/flags', data),
    updateFlag: (id: string, data: any) => api.patch(`/settings/flags/${id}`, data),
    toggleFlag: (id: string) => api.post(`/settings/flags/${id}/toggle`),
    deleteFlag: (id: string) => api.delete(`/settings/flags/${id}`),

    // Maintenance Windows
    getMaintenanceWindows: () => api.get('/settings/maintenance-windows'),
    createMaintenanceWindow: (data: any) => api.post('/settings/maintenance-windows', data),
    updateMaintenanceStatus: (id: string, status: string) => api.patch(`/settings/maintenance-windows/${id}/status`, { status }),
    deleteMaintenanceWindow: (id: string) => api.delete(`/settings/maintenance-windows/${id}`),

    // Backups
    getBackups: () => api.get('/settings/backups'),
    createBackup: () => api.post('/settings/backups'),
    restoreBackup: (id: string) => api.post(`/settings/backups/${id}/restore`),
    downloadBackup: (filename: string) =>
        api.get(`/settings/backups/${encodeURIComponent(filename)}/download`, { responseType: 'blob' }),

    // Audit Logs
    getAuditLogs: (page = 1, limit = 20) => api.get(`/settings/audit-logs?page=${page}&limit=${limit}`),
};

// Notifications API
export const notificationsApi = {
    send: (data: any) =>
        api.post('/notifications/send', data),
    history: () => api.get('/notifications/history'),
    devices: () => api.get('/notifications/devices'),

    // Templates
    getTemplates: () => api.get('/notifications/templates'),
    createTemplate: (data: any) => api.post('/notifications/templates', data),
    updateTemplate: (id: string, data: any) => api.patch(`/notifications/templates/${id}`, data),
    deleteTemplate: (id: string) => api.delete(`/notifications/templates/${id}`),

    // Segments
    getSegments: () => api.get('/notifications/segments'),
    createSegment: (data: any) => api.post('/notifications/segments', data),
    updateSegment: (id: string, data: any) => api.patch(`/notifications/segments/${id}`, data),
    deleteSegment: (id: string) => api.delete(`/notifications/segments/${id}`),

    // A/B Tests
    getABTests: () => api.get('/notifications/ab-tests'),
    createABTest: (data: any) => api.post('/notifications/ab-tests', data),
    updateABTest: (id: string, data: any) => api.patch(`/notifications/ab-tests/${id}`, data),
    deleteABTest: (id: string) => api.delete(`/notifications/ab-tests/${id}`),

    // Scheduler
    runScheduler: () => api.post('/notifications/scheduler/run'),
};

// Analytics API
export const analyticsApi = {
    getDashboard: (startDate?: string, endDate?: string) =>
        api.get('/analytics/dashboard', { params: { startDate, endDate } }),
    getTickets: (startDate?: string, endDate?: string) =>
        api.get('/analytics/tickets', { params: { startDate, endDate } }),
    getPortals: (startDate?: string, endDate?: string) =>
        api.get('/analytics/portals', { params: { startDate, endDate } }),
    getNotifications: (startDate?: string, endDate?: string) =>
        api.get('/analytics/notifications', { params: { startDate, endDate } }),
    getAdminActivity: (startDate?: string, endDate?: string) =>
        api.get('/analytics/admin-activity', { params: { startDate, endDate } }),
    generateSnapshot: (date?: string) =>
        api.post('/analytics/snapshot', { date }),
};

export default api;

