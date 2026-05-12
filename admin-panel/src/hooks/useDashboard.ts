import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { format } from 'date-fns';

// Types for analytics responses
export interface TrendData {
    value: number;
    isPositive: boolean;
}

export interface DashboardAnalytics {
    summary: {
        portals: number;
        users: number;
        activeLicenses: number;
        openTickets: number;
        packages: number;
        devices: number;
        totalTickets: number;
        resolvedTickets: number;
        avgResolutionHours: number | null;
        notificationsSent: number;
        deliveryRate: number;
    };
    comparison: {
        tickets: TrendData | null;
        devices: TrendData | null;
        notifications: TrendData | null;
        periodDays: number;
    };
    trends: Array<{
        date: string;
        tickets: number;
        resolved: number;
        notifications: number;
    }>;
}

export interface TicketAnalytics {
    timeline: Array<{
        date: string;
        created: number;
        resolved: number;
        open: number;
        inProgress: number;
    }>;
    statusDistribution: Array<{ name: string; value: number }>;
    priorityDistribution: Array<{ name: string; value: number }>;
    resolutionStats: {
        average: number;
        min: number;
        max: number;
        totalResolved: number;
    };
}

export interface PortalAnalytics {
    summary: {
        totalPortals: number;
        activePortals: number;
        totalConnections: number;
        avgUptime: number;
        avgLatency: number;
    };
    statusBreakdown: Array<{ name: string; value: number }>;
    timeline: Array<{
        date: string;
        connections: number;
        uptime: number;
    }>;
    portalStats: Array<{
        name: string;
        status: string;
        connections: number;
        uptime: number;
        latency: number;
        errors: number;
    }>;
}

export interface NotificationAnalytics {
    summary: {
        total: number;
        sent: number;
        failed: number;
        deliveryRate: number;
    };
    timeline: Array<{
        date: string;
        sent: number;
        failed: number;
        pending: number;
        deliveryRate: number;
    }>;
    statusDistribution: Array<{ name: string; value: number }>;
}

export interface HeatmapData {
    heatmap: Array<{
        day: number;
        hour: number;
        count: number;
        intensity: number;
    }>;
    maxCount: number;
    totalActions: number;
    actionDistribution: Array<{ name: string; value: number }>;
    dayLabels: string[];
    hourLabels: string[];
}

// Legacy DashboardStats type (for backward compatibility)
export interface DashboardStats {
    portals: number;
    tickets: number;
    openTickets: number;
    packages: number;
    announcements: number;
    devices: number;
}

// Query keys
export const dashboardKeys = {
    all: ['dashboard'] as const,
    stats: () => [...dashboardKeys.all, 'stats'] as const,
    analytics: (startDate?: string, endDate?: string) =>
        [...dashboardKeys.all, 'analytics', startDate, endDate] as const,
    tickets: (startDate?: string, endDate?: string) =>
        [...dashboardKeys.all, 'tickets', startDate, endDate] as const,
    portals: (startDate?: string, endDate?: string) =>
        [...dashboardKeys.all, 'portals', startDate, endDate] as const,
    notifications: (startDate?: string, endDate?: string) =>
        [...dashboardKeys.all, 'notifications', startDate, endDate] as const,
    adminActivity: (startDate?: string, endDate?: string) =>
        [...dashboardKeys.all, 'adminActivity', startDate, endDate] as const,
};

// Format date for API
function formatDateParam(date: Date | undefined): string | undefined {
    return date ? format(date, 'yyyy-MM-dd') : undefined;
}

/**
 * Legacy hook for basic dashboard stats (counts only)
 * @deprecated Use useDashboardAnalytics for date-filtered analytics
 */
export function useDashboardStats() {
    return useQuery({
        queryKey: dashboardKeys.stats(),
        queryFn: async (): Promise<DashboardStats> => {
            const metrics = await analyticsApi.getDashboard().catch(() => null);
            const stats = metrics?.data?.stats as
                | { activeLicenses?: number; totalDevices?: number; totalServers?: number }
                | undefined;

            return {
                portals: stats?.totalServers ?? 0,
                tickets: stats?.activeLicenses ?? 0,
                openTickets: stats?.activeLicenses ?? 0,
                packages: 0,
                announcements: 0,
                devices: stats?.totalDevices ?? 0,
            };
        },
        refetchInterval: 30 * 1000,
    });
}

/**
 * Primary hook for dashboard analytics with date range support
 */
export function useDashboardAnalytics(startDate?: Date, endDate?: Date) {
    const start = formatDateParam(startDate);
    const end = formatDateParam(endDate);

    return useQuery({
        queryKey: dashboardKeys.analytics(start, end),
        queryFn: async (): Promise<DashboardAnalytics> => {
            const response = await analyticsApi.getDashboard(start, end);
            const stats = response.data?.stats ?? {};
            const growth = Array.isArray(response.data?.charts?.licenseGrowth)
                ? response.data.charts.licenseGrowth
                : [];

            return {
                summary: {
                    portals: Number(stats.totalServers ?? 0),
                    users: Number(stats.totalUsers ?? 0),
                    activeLicenses: Number(stats.activeLicenses ?? 0),
                    openTickets: Number(stats.totalTickets ?? 0) - Number(stats.resolvedTickets ?? 0),
                    packages: Number(stats.totalPackages ?? 0),
                    devices: Number(stats.totalDevices ?? 0),
                    totalTickets: Number(stats.totalTickets ?? 0),
                    resolvedTickets: Number(stats.resolvedTickets ?? 0),
                    avgResolutionHours: null,
                    notificationsSent: Number(stats.notificationsSent ?? 0),
                    deliveryRate: 100,
                },
                comparison: {
                    tickets: null,
                    devices: null,
                    notifications: null,
                    periodDays: 7,
                },
                trends: growth.map((g: { date?: string; count?: number }) => ({
                    date: g.date ?? '',
                    tickets: Number(g.count ?? 0),
                    resolved: 0,
                    notifications: 0,
                })),
            };
        },
        staleTime: 30 * 1000,
    });
}

/**
 * Hook to fetch ticket analytics
 */
export function useTicketAnalytics(startDate?: Date, endDate?: Date) {
    const start = formatDateParam(startDate);
    const end = formatDateParam(endDate);

    return useQuery({
        queryKey: dashboardKeys.tickets(start, end),
        queryFn: async (): Promise<TicketAnalytics> => {
            const response = await analyticsApi.getTickets(start, end);
            return response.data as TicketAnalytics;
        },
        staleTime: 30 * 1000,
    });
}

/**
 * Hook to fetch portal analytics
 */
export function usePortalAnalytics(startDate?: Date, endDate?: Date) {
    const start = formatDateParam(startDate);
    const end = formatDateParam(endDate);

    return useQuery({
        queryKey: dashboardKeys.portals(start, end),
        queryFn: async (): Promise<PortalAnalytics> => {
            return {
                summary: {
                    totalPortals: 0,
                    activePortals: 0,
                    totalConnections: 0,
                    avgUptime: 0,
                    avgLatency: 0,
                },
                statusBreakdown: [],
                timeline: [],
                portalStats: [],
            };
        },
        staleTime: 30 * 1000,
    });
}

/**
 * Hook to fetch notification analytics
 */
export function useNotificationAnalytics(startDate?: Date, endDate?: Date) {
    const start = formatDateParam(startDate);
    const end = formatDateParam(endDate);

    return useQuery({
        queryKey: dashboardKeys.notifications(start, end),
        queryFn: async (): Promise<NotificationAnalytics> => {
            const response = await analyticsApi.getNotifications(start, end);
            return response.data as NotificationAnalytics;
        },
        staleTime: 30 * 1000,
    });
}

/**
 * Hook to fetch admin activity heatmap
 */
export function useAdminActivityHeatmap(startDate?: Date, endDate?: Date) {
    const start = formatDateParam(startDate);
    const end = formatDateParam(endDate);

    return useQuery({
        queryKey: dashboardKeys.adminActivity(start, end),
        queryFn: async (): Promise<HeatmapData> => {
            const response = await analyticsApi.getAdminActivity(start, end);
            return response.data as HeatmapData;
        },
        staleTime: 30 * 1000,
    });
}
