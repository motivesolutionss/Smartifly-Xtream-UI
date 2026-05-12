import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './constants';

// Create axios instance
const apiBaseUrl = API_BASE_URL.replace(/\/+$/, '');

const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests and standardize URLs
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle auth errors in a deterministic way.
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig;
        const isAuthEndpoint = originalRequest?.url?.includes('/v1/admin/auth/login');
        if (error.response?.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('refreshToken');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/v1/admin/auth/login', { email, password }),
    me: () => api.get('/v1/admin/auth/profile'),
    logout: (refreshToken: string) =>
        api.post('/v1/admin/auth/logout', { refreshToken }),
};

// Portals API
export const portalsApi = {
    getAll: () => api.get('/v1/admin/servers'),
    getPublic: () => api.get('/v1/admin/servers'),
    create: (data: { name: string; url: string; serverIdentity?: string; username?: string; password?: string; category?: string; description?: string; serverIp?: string }) =>
        api.post('/v1/admin/servers', {
            name: data.name,
            url: data.url,
            serverIdentity: data.serverIdentity,
            isActive: true,
        }),
    update: (id: string, data: Partial<{ name: string; url: string; serverIdentity: string; isActive: boolean; order: number; category: string; serverIp: string }>) =>
        api.patch(`/v1/admin/servers/${id}`, {
            name: data.name,
            url: data.url,
            serverIdentity: data.serverIdentity,
            isActive: data.isActive,
        }),
    delete: (id: string) => api.delete(`/v1/admin/servers/${id}`),
    reorder: (orders: { id: string; order: number }[]) =>
        api.post('/v1/admin/servers/reorder', { orders }),

    // Health & Bulk Actions
    checkHealth: (id: string) => api.get(`/v1/admin/servers/${id}/health`),
    bulkAction: async (ids: string[], action: 'enable' | 'disable' | 'delete' | 'check-health') => {
        if (action === 'delete') {
            await Promise.all(ids.map((id) => api.delete(`/v1/admin/servers/${id}`)));
            return { data: { success: true } };
        }
        if (action === 'enable' || action === 'disable') {
            const isActive = action === 'enable';
            await Promise.all(ids.map((id) => api.patch(`/v1/admin/servers/${id}`, { isActive })));
            return { data: { success: true } };
        }
        return { data: { success: true } };
    },
    import: async (portals: any[]) => {
        await Promise.all(
            portals.map((portal) =>
                api.post('/v1/admin/servers', {
                    name: portal.name,
                    url: portal.url,
                    serverIdentity: portal.serverIdentity,
                    isActive: portal.isActive ?? true,
                })
            )
        );
        return { data: { success: true } };
    },
};

// Tickets API
export const ticketsApi = {
    getAll: (params?: { status?: string; priority?: string; page?: number; limit?: number; search?: string }) =>
        api.get('/v1/admin/tickets/all', { params }),
    getStats: () => api.get('/v1/admin/tickets/stats'),
    reply: (id: string, message: string) =>
        api.post(`/v1/admin/tickets/${id}/reply`, { message }),
    updateStatus: (id: string, status: string) =>
        api.put(`/v1/admin/tickets/${id}/status`, { status }),
    updateTags: (id: string, tags: string[]) =>
        api.put(`/v1/admin/tickets/${id}/tags`, { tags }),
    delete: (id: string) => api.delete(`/v1/admin/tickets/${id}`),
    bulkAction: (ids: string[], action: 'close' | 'resolve' | 'delete') =>
        api.post('/v1/admin/tickets/bulk-action', { ids, action }),
    approvePayment: (id: string, data?: { packageId?: string; userId?: number; serverId?: number; amount?: number; currency?: string; plan?: string }) =>
        api.post(`/v1/admin/tickets/${id}/approve-payment`, data ?? {}),
    export: () => api.get('/v1/admin/tickets/export', { responseType: 'blob' }),
    downloadAttachment: (attachmentId: string) =>
        api.get(`/v1/admin/tickets/attachments/${encodeURIComponent(attachmentId)}/download`, { responseType: 'blob' }),
    uploadAttachments: (id: string, formData: FormData) =>
        api.post(`/v1/admin/tickets/${id}/attachments`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),

    // Templates
    getTemplates: () => api.get('/v1/admin/tickets/templates'),
    createTemplate: (data: { name: string; content: string; category?: string }) =>
        api.post('/v1/admin/tickets/templates', data),
    updateTemplate: (id: string, data: Partial<{ name: string; content: string; category: string; isActive: boolean }>) =>
        api.put(`/v1/admin/tickets/templates/${id}`, data),
    deleteTemplate: (id: string) => api.delete(`/v1/admin/tickets/templates/${id}`),
};

// Packages API
export const packagesApi = {
    getAll: () => api.get('/v1/admin/packages/admin'),
    getPublic: () => api.get('/v1/admin/packages'),
    create: (data: { name: string; description: string; duration: string; price: number; currency?: string; features: string[]; isPopular?: boolean; pricingTiers?: any[] }) =>
        api.post('/v1/admin/packages', data),
    update: (id: string, data: Partial<{ name: string; description: string; duration: string; price: number; currency: string; features: string[]; isPopular: boolean; isActive: boolean; order: number; pricingTiers?: any[] }>) =>
        api.put(`/v1/admin/packages/${id}`, data),
    delete: (id: string) => api.delete(`/v1/admin/packages/${id}`),
    duplicate: (id: string, name?: string) => api.post(`/v1/admin/packages/${id}/duplicate`, { name }),
    getAnalytics: () => api.get('/v1/admin/packages/analytics'),
    trackView: (id: string) => api.post(`/v1/admin/packages/${id}/analytics/view`),
    trackPurchase: (id: string, amount: number) => api.post(`/v1/admin/packages/${id}/analytics/purchase`, { amount }),

    // Pricing Tiers
    getTiers: (id: string) => api.get(`/v1/admin/packages/${id}/tiers`),
    createTier: (id: string, data: { minQuantity: number; maxQuantity?: number | null; price: number; discount?: number | null }) =>
        api.post(`/v1/admin/packages/${id}/tiers`, data),
    updateTier: (tierId: string, data: { minQuantity: number; maxQuantity?: number | null; price: number; discount?: number | null }) =>
        api.put(`/v1/admin/packages/tiers/${tierId}`, data),
    deleteTier: (tierId: string) => api.delete(`/v1/admin/packages/tiers/${tierId}`),

    // Feature Templates
    getFeatureTemplates: () => api.get('/v1/admin/packages/feature-templates'),
    createFeatureTemplate: (data: { name: string; description?: string; features: string[]; category?: string; isActive?: boolean }) =>
        api.post('/v1/admin/packages/feature-templates', data),
    updateFeatureTemplate: (id: string, data: Partial<{ name: string; description: string; features: string[]; category: string; isActive: boolean }>) =>
        api.put(`/v1/admin/packages/feature-templates/${id}`, data),
    deleteFeatureTemplate: (id: string) => api.delete(`/v1/admin/packages/feature-templates/${id}`),
};

// Announcements API
export const announcementsApi = {
    getAll: () => api.get('/v1/admin/announcements/admin'),
    create: (data: { title: string; content: string; type?: string }) =>
        api.post('/v1/admin/announcements', data),
    update: (id: string, data: any) =>
        api.patch(`/v1/admin/announcements/${id}`, data),
    delete: (id: string) => api.delete(`/v1/admin/announcements/${id}`),
};

// Settings API
export const settingsApi = {
    get: () => api.get('/v1/admin/settings/admin'),
    update: (data: Partial<{ maintenanceMode: boolean; latestVersion: string; forceUpdate: boolean }>) =>
        api.put('/v1/admin/settings', data),

    // Feature Flags
    getFlags: () => api.get('/v1/admin/settings/flags'),
    createFlag: (data: any) => api.post('/v1/admin/settings/flags', data),
    updateFlag: (id: string, data: any) => api.patch(`/v1/admin/settings/flags/${id}`, data),
    toggleFlag: (id: string) => api.post(`/v1/admin/settings/flags/${id}/toggle`),
    deleteFlag: (id: string) => api.delete(`/v1/admin/settings/flags/${id}`),

    // Maintenance Windows
    getMaintenanceWindows: () => api.get('/v1/admin/settings/maintenance-windows'),
    createMaintenanceWindow: (data: any) => api.post('/v1/admin/settings/maintenance-windows', data),
    updateMaintenanceStatus: (id: string, status: string) => api.patch(`/v1/admin/settings/maintenance-windows/${id}/status`, { status }),
    deleteMaintenanceWindow: (id: string) => api.delete(`/v1/admin/settings/maintenance-windows/${id}`),

    // Backups
    getBackups: () => api.get('/v1/admin/settings/backups'),
    createBackup: () => api.post('/v1/admin/settings/backups'),
    restoreBackup: (id: string) => api.post(`/v1/admin/settings/backups/${id}/restore`),
    downloadBackup: (filename: string) =>
        api.get(`/v1/admin/settings/backups/${encodeURIComponent(filename)}/download`, { responseType: 'blob' }),

    // Audit Logs
    getAuditLogs: (page = 1, limit = 20) => api.get(`/v1/admin/settings/audit-logs?page=${page}&limit=${limit}`),
};

// Notifications API
export const notificationsApi = {
    send: (data: any) =>
        api.post('/v1/admin/notifications/send', data),
    history: () => api.get('/v1/admin/notifications/history'),
    devices: () => api.get('/v1/admin/notifications/devices'),

    // Templates
    getTemplates: () => api.get('/v1/admin/notifications/templates'),
    createTemplate: (data: any) => api.post('/v1/admin/notifications/templates', data),
    updateTemplate: (id: string, data: any) => api.patch(`/v1/admin/notifications/templates/${id}`, data),
    deleteTemplate: (id: string) => api.delete(`/v1/admin/notifications/templates/${id}`),

    // Segments
    getSegments: () => api.get('/v1/admin/notifications/segments'),
    createSegment: (data: any) => api.post('/v1/admin/notifications/segments', data),
    updateSegment: (id: string, data: any) => api.patch(`/v1/admin/notifications/segments/${id}`, data),
    deleteSegment: (id: string) => api.delete(`/v1/admin/notifications/segments/${id}`),

    // A/B Tests
    getABTests: () => api.get('/v1/admin/notifications/ab-tests'),
    createABTest: (data: any) => api.post('/v1/admin/notifications/ab-tests', data),
    updateABTest: (id: string, data: any) => api.patch(`/v1/admin/notifications/ab-tests/${id}`, data),
    deleteABTest: (id: string) => api.delete(`/v1/admin/notifications/ab-tests/${id}`),

    // Scheduler
    runScheduler: () => api.post('/v1/admin/notifications/scheduler/run'),
};

// Users API
export const usersApi = {
    getStats: () => api.get('/v1/admin/users/stats'),
    getAll: (params?: { page?: number; limit?: number; search?: string; status?: 'active' | 'suspended' | '' }) =>
        api.get('/v1/admin/users', { params }),
    activate: (id: number) => api.post(`/v1/admin/users/${id}/activate`),
    suspend: (id: number, reason?: string) => api.post(`/v1/admin/users/${id}/suspend`, { reason }),
    unlock: (id: number) => api.post(`/v1/admin/users/${id}/unlock`),
    revokeSessions: (id: number) => api.post(`/v1/admin/users/${id}/revoke-sessions`),
    delete: (id: number) => api.delete(`/v1/admin/users/${id}`),
    restore: (id: number) => api.post(`/v1/admin/users/${id}/restore`),
    devices: (id: number) => api.get(`/v1/admin/users/${id}/devices`),
};

// Finance API
export const financeApi = {
    getSummary: () => api.get('/v1/admin/finance/summary'),
    getEntries: (params?: { page?: number; limit?: number; type?: string }) => api.get('/v1/admin/finance/entries', { params }),
    createEntry: (data: { type: string; amount: number; currency: string; userId?: number; licenseId?: number; note?: string }) =>
        api.post('/v1/admin/finance/entries', data),
};

// Analytics API
export const analyticsApi = {
    getDashboard: (startDate?: string, endDate?: string) =>
        api.get('/v1/admin/dashboard/metrics', { params: { startDate, endDate } }),
    getTickets: (startDate?: string, endDate?: string) =>
        api.get('/v1/admin/dashboard/tickets', { params: { startDate, endDate } }),
    getPortals: (startDate?: string, endDate?: string) =>
        api.get('/v1/admin/dashboard/metrics', { params: { startDate, endDate } }),
    getNotifications: (startDate?: string, endDate?: string) =>
        api.get('/v1/admin/dashboard/notifications', { params: { startDate, endDate } }),
    getAdminActivity: (startDate?: string, endDate?: string) =>
        api.get('/v1/admin/dashboard/admin-activity', { params: { startDate, endDate } }),
    generateSnapshot: (date?: string) =>
        api.post('/v1/admin/dashboard/metrics', { date }),
};

export default api;

