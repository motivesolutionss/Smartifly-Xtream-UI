import { useQuery } from '@tanstack/react-query';
import { analyticsApi, portalsApi, ticketsApi, packagesApi, announcementsApi, notificationsApi } from '@/lib/api';
import { format } from 'date-fns';

// Types for analytics responses
export interface TrendData {
    value: number;
    isPositive: boolean;
}

export interface DashboardAnalytics {
    summary: {
        portals: number;
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
            const [portals, tickets, packages, announcements, devices] = await Promise.all([
                portalsApi.getAll().catch(() => ({ data: [] })),
                ticketsApi.getAll().catch(() => ({ data: [] })),
                packagesApi.getAll().catch(() => ({ data: [] })),
                announcementsApi.getAll().catch(() => ({ data: [] })),
                notificationsApi.devices().catch(() => ({ data: { total: 0 } })),
            ]);

            const ticketsData = tickets.data as Array<{ status: string }>;
            const openTickets = ticketsData.filter(
                (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
            ).length;

            return {
                portals: (portals.data as unknown[]).length,
                tickets: ticketsData.length,
                openTickets,
                packages: (packages.data as unknown[]).length,
                announcements: (announcements.data as unknown[]).length,
                devices: (devices.data as { total?: number }).total || 0,
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
        queryFn: async () => {
            const response = await analyticsApi.getDashboard(start, end);
            return response.data as DashboardAnalytics;
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
        queryFn: async () => {
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
        queryFn: async () => {
            const response = await analyticsApi.getPortals(start, end);
            return response.data as PortalAnalytics;
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
        queryFn: async () => {
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
        queryFn: async () => {
            const response = await analyticsApi.getAdminActivity(start, end);
            return response.data as HeatmapData;
        },
        staleTime: 30 * 1000,
    });
}
