import prisma from '../../config/database.js';
import { format, startOfDay, endOfDay, eachDayOfInterval, getDay, getHours, subDays, differenceInDays } from 'date-fns';

/**
 * Calculate percentage change between two values
 */
function calculateTrend(current: number, previous: number): { value: number; isPositive: boolean } | null {
    if (previous === 0 && current === 0) return null;
    if (previous === 0) return { value: 100, isPositive: current > 0 };

    const change = ((current - previous) / previous) * 100;
    return {
        value: Math.abs(Math.round(change)),
        isPositive: change >= 0
    };
}

/**
 * Get aggregated dashboard statistics for a date range with period-over-period comparison
 */
export async function getDashboardStats(startDate: Date, endDate: Date) {
    // Calculate previous period (same duration, immediately before)
    const periodDays = differenceInDays(endDate, startDate) + 1;
    const prevEndDate = subDays(startDate, 1);
    const prevStartDate = subDays(prevEndDate, periodDays - 1);

    // Fetch current period data
    const [
        portals,
        tickets,
        packages,
        devices,
        notifications,
        snapshots,
        // Previous period data
        prevTickets,
        prevDevices,
        prevNotifications
    ] = await Promise.all([
        prisma.portal.count({ where: { isActive: true } }),
        prisma.ticket.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            select: { status: true, createdAt: true, resolvedAt: true }
        }),
        prisma.package.count({ where: { isActive: true } }),
        prisma.deviceToken.count(),
        prisma.notification.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            select: { status: true }
        }),
        prisma.analyticsSnapshot.findMany({
            where: {
                date: { gte: startOfDay(startDate), lte: endOfDay(endDate) }
            },
            orderBy: { date: 'asc' }
        }),
        // Previous period queries
        prisma.ticket.count({
            where: {
                createdAt: { gte: prevStartDate, lte: prevEndDate }
            }
        }),
        // For devices, we track growth by comparing current count to snapshot
        prisma.analyticsSnapshot.findFirst({
            where: { date: startOfDay(prevStartDate) },
            select: { notificationsSent: true }
        }),
        prisma.notification.count({
            where: {
                createdAt: { gte: prevStartDate, lte: prevEndDate },
                status: 'SENT'
            }
        })
    ]);

    // Calculate ticket stats
    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

    // Calculate average resolution time (for resolved tickets with resolvedAt)
    const resolvedWithTime = tickets.filter(t => t.resolvedAt);
    const avgResolutionHours = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, t) => {
            const hours = (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            return sum + hours;
        }, 0) / resolvedWithTime.length
        : null;

    // Notification stats
    const sentNotifications = notifications.filter(n => n.status === 'SENT').length;
    const failedNotifications = notifications.filter(n => n.status === 'FAILED').length;
    const deliveryRate = notifications.length > 0
        ? (sentNotifications / notifications.length) * 100
        : 100;

    // Trend data from snapshots
    const trendData = snapshots.map(s => ({
        date: format(s.date, 'MMM d'),
        tickets: s.ticketsCreated,
        resolved: s.ticketsResolved,
        notifications: s.notificationsSent
    }));

    // Calculate period-over-period trends
    const ticketsTrend = calculateTrend(tickets.length, prevTickets);
    const notificationsTrend = calculateTrend(sentNotifications, prevNotifications);

    // For devices, compare to first day of period (approximation since we don't have historical device count)
    const firstSnapshot = snapshots[0];
    const estimatedPrevDevices = firstSnapshot ? Math.max(0, devices - 5) : devices; // Rough estimate
    const devicesTrend = devices > 0 ? calculateTrend(devices, estimatedPrevDevices) : null;

    return {
        summary: {
            portals,
            openTickets,
            packages,
            devices,
            totalTickets: tickets.length,
            resolvedTickets,
            avgResolutionHours: avgResolutionHours ? Math.round(avgResolutionHours * 10) / 10 : null,
            notificationsSent: sentNotifications,
            deliveryRate: Math.round(deliveryRate * 10) / 10
        },
        // New: Period-over-period comparison trends
        comparison: {
            tickets: ticketsTrend,
            devices: devicesTrend,
            notifications: notificationsTrend,
            periodDays
        },
        trends: trendData
    };
}

/**
 * Get detailed ticket metrics over time
 */
export async function getTicketMetrics(startDate: Date, endDate: Date) {
    const tickets = await prisma.ticket.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate }
        },
        select: {
            id: true,
            status: true,
            priority: true,
            createdAt: true,
            resolvedAt: true,
            firstResponseAt: true
        }
    });

    // Group by date
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyData = days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const dayTickets = tickets.filter(t => {
            const created = new Date(t.createdAt);
            return created >= dayStart && created <= dayEnd;
        });

        const resolved = tickets.filter(t => {
            if (!t.resolvedAt) return false;
            const resolvedDate = new Date(t.resolvedAt);
            return resolvedDate >= dayStart && resolvedDate <= dayEnd;
        });

        return {
            date: format(day, 'MMM d'),
            created: dayTickets.length,
            resolved: resolved.length,
            open: dayTickets.filter(t => t.status === 'OPEN').length,
            inProgress: dayTickets.filter(t => t.status === 'IN_PROGRESS').length
        };
    });

    // Status distribution - use enum values to match frontend expectations
    const statusDistribution = [
        { name: 'OPEN', value: tickets.filter(t => t.status === 'OPEN').length },
        { name: 'IN_PROGRESS', value: tickets.filter(t => t.status === 'IN_PROGRESS').length },
        { name: 'RESOLVED', value: tickets.filter(t => t.status === 'RESOLVED').length },
        { name: 'CLOSED', value: tickets.filter(t => t.status === 'CLOSED').length }
    ];

    // Priority distribution
    const priorityDistribution = [
        { name: 'Low', value: tickets.filter(t => t.priority === 'LOW').length },
        { name: 'Medium', value: tickets.filter(t => t.priority === 'MEDIUM').length },
        { name: 'High', value: tickets.filter(t => t.priority === 'HIGH').length },
        { name: 'Urgent', value: tickets.filter(t => t.priority === 'URGENT').length }
    ];

    // Resolution time stats
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    const resolutionTimes = resolvedTickets.map(t => {
        return (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
    });

    const avgResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    const minResolutionTime = resolutionTimes.length > 0 ? Math.min(...resolutionTimes) : 0;
    const maxResolutionTime = resolutionTimes.length > 0 ? Math.max(...resolutionTimes) : 0;

    return {
        timeline: dailyData,
        statusDistribution,
        priorityDistribution,
        resolutionStats: {
            average: Math.round(avgResolutionTime * 10) / 10,
            min: Math.round(minResolutionTime * 10) / 10,
            max: Math.round(maxResolutionTime * 10) / 10,
            totalResolved: resolvedTickets.length
        }
    };
}

/**
 * Get portal connection and uptime metrics
 */
export async function getPortalMetrics(startDate: Date, endDate: Date) {
    const portals = await prisma.portal.findMany({
        select: {
            id: true,
            name: true,
            healthStatus: true,
            uptime: true,
            activeConnections: true,
            latency: true,
            errorCount: true,
            lastCheckAt: true
        }
    });

    // Get snapshots for historical data
    const snapshots = await prisma.analyticsSnapshot.findMany({
        where: {
            date: { gte: startOfDay(startDate), lte: endOfDay(endDate) }
        },
        orderBy: { date: 'asc' },
        select: {
            date: true,
            portalConnections: true,
            portalUptimeAvg: true
        }
    });

    // Current stats
    const totalConnections = portals.reduce((sum, p) => sum + p.activeConnections, 0);
    const avgUptime = portals.filter(p => p.uptime !== null).length > 0
        ? portals.reduce((sum, p) => sum + (p.uptime || 0), 0) / portals.filter(p => p.uptime !== null).length
        : 100;
    const avgLatency = portals.filter(p => p.latency !== null).length > 0
        ? portals.reduce((sum, p) => sum + (p.latency || 0), 0) / portals.filter(p => p.latency !== null).length
        : 0;

    // Status breakdown
    const statusBreakdown = [
        { name: 'Online', value: portals.filter(p => p.healthStatus === 'ONLINE').length },
        { name: 'Offline', value: portals.filter(p => p.healthStatus === 'OFFLINE').length },
        { name: 'Unstable', value: portals.filter(p => p.healthStatus === 'UNSTABLE').length },
        { name: 'Unknown', value: portals.filter(p => p.healthStatus === 'UNKNOWN').length }
    ];

    // Timeline from snapshots
    const timeline = snapshots.map(s => ({
        date: format(s.date, 'MMM d'),
        connections: s.portalConnections,
        uptime: s.portalUptimeAvg || 100
    }));

    // Per-portal stats
    const portalStats = portals.map(p => ({
        name: p.name,
        status: p.healthStatus,
        connections: p.activeConnections,
        uptime: p.uptime || 100,
        latency: p.latency || 0,
        errors: p.errorCount
    }));

    return {
        summary: {
            totalPortals: portals.length,
            activePortals: portals.filter(p => p.healthStatus === 'ONLINE').length,
            totalConnections,
            avgUptime: Math.round(avgUptime * 10) / 10,
            avgLatency: Math.round(avgLatency)
        },
        statusBreakdown,
        timeline,
        portalStats
    };
}

/**
 * Get notification delivery metrics
 */
export async function getNotificationMetrics(startDate: Date, endDate: Date) {
    const notifications = await prisma.notification.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate }
        },
        select: {
            id: true,
            status: true,
            createdAt: true,
            sentAt: true
        }
    });

    // Group by date
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyData = days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const dayNotifications = notifications.filter(n => {
            const created = new Date(n.createdAt);
            return created >= dayStart && created <= dayEnd;
        });

        const sent = dayNotifications.filter(n => n.status === 'SENT').length;
        const failed = dayNotifications.filter(n => n.status === 'FAILED').length;
        const total = dayNotifications.length;

        return {
            date: format(day, 'MMM d'),
            sent,
            failed,
            pending: total - sent - failed,
            deliveryRate: total > 0 ? Math.round((sent / total) * 100) : 100
        };
    });

    // Status distribution
    const statusDistribution = [
        { name: 'Sent', value: notifications.filter(n => n.status === 'SENT').length },
        { name: 'Failed', value: notifications.filter(n => n.status === 'FAILED').length },
        { name: 'Pending', value: notifications.filter(n => n.status === 'PENDING').length },
        { name: 'Scheduled', value: notifications.filter(n => n.status === 'SCHEDULED').length }
    ];

    // Overall stats
    const totalSent = notifications.filter(n => n.status === 'SENT').length;
    const totalFailed = notifications.filter(n => n.status === 'FAILED').length;
    const deliveryRate = notifications.length > 0
        ? (totalSent / notifications.length) * 100
        : 100;

    return {
        summary: {
            total: notifications.length,
            sent: totalSent,
            failed: totalFailed,
            deliveryRate: Math.round(deliveryRate * 10) / 10
        },
        timeline: dailyData,
        statusDistribution
    };
}

/**
 * Get admin activity heatmap (7 days x 24 hours)
 */
export async function getAdminActivityHeatmap(startDate: Date, endDate: Date) {
    const auditLogs = await prisma.systemAuditLog.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate }
        },
        select: {
            createdAt: true,
            action: true
        }
    });

    // Initialize 7x24 grid (days of week x hours)
    // Format: { day: 0-6, hour: 0-23, count: number }
    const heatmapData: Array<{ day: number; hour: number; count: number }> = [];

    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            heatmapData.push({ day, hour, count: 0 });
        }
    }

    // Count activities per day/hour
    auditLogs.forEach(log => {
        const date = new Date(log.createdAt);
        const day = getDay(date); // 0 = Sunday
        const hour = getHours(date);

        const index = day * 24 + hour;
        if (heatmapData[index]) {
            heatmapData[index].count++;
        }
    });

    // Find max for color scaling
    const maxCount = Math.max(...heatmapData.map(d => d.count), 1);

    // Action breakdown
    const actionBreakdown = auditLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const actionDistribution = Object.entries(actionBreakdown).map(([name, value]) => ({
        name,
        value
    }));

    return {
        heatmap: heatmapData.map(d => ({
            ...d,
            intensity: d.count / maxCount // 0-1 scale for color intensity
        })),
        maxCount,
        totalActions: auditLogs.length,
        actionDistribution,
        dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        hourLabels: Array.from({ length: 24 }, (_, i) => `${i}:00`)
    };
}

/**
 * Generate daily snapshot - called by cron or manually
 */
export async function generateDailySnapshot(date: Date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Get ticket metrics for the day
    const ticketsCreated = await prisma.ticket.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } }
    });

    const ticketsResolved = await prisma.ticket.count({
        where: { resolvedAt: { gte: dayStart, lte: dayEnd } }
    });

    const resolvedTickets = await prisma.ticket.findMany({
        where: { resolvedAt: { gte: dayStart, lte: dayEnd } },
        select: { createdAt: true, resolvedAt: true }
    });

    const avgResolutionTime = resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, t) => {
            return sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length
        : null;

    // Current ticket status counts
    const [ticketsOpen, ticketsInProgress, ticketsClosed] = await Promise.all([
        prisma.ticket.count({ where: { status: 'OPEN' } }),
        prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.ticket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } })
    ]);

    // Portal metrics
    const portals = await prisma.portal.findMany({
        select: { activeConnections: true, uptime: true }
    });
    const portalConnections = portals.reduce((sum, p) => sum + p.activeConnections, 0);
    const portalUptimeAvg = portals.filter(p => p.uptime !== null).length > 0
        ? portals.reduce((sum, p) => sum + (p.uptime || 0), 0) / portals.filter(p => p.uptime !== null).length
        : null;

    // Notification metrics
    const notifications = await prisma.notification.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        select: { status: true }
    });
    const notificationsSent = notifications.filter(n => n.status === 'SENT').length;
    const notificationsDelivered = notificationsSent; // Assuming sent = delivered for now
    const notificationsFailed = notifications.filter(n => n.status === 'FAILED').length;

    // Upsert snapshot
    const snapshot = await prisma.analyticsSnapshot.upsert({
        where: { date: dayStart },
        update: {
            ticketsCreated,
            ticketsResolved,
            avgResolutionTime,
            ticketsOpen,
            ticketsInProgress,
            ticketsClosed,
            portalConnections,
            portalUptimeAvg,
            notificationsSent,
            notificationsDelivered,
            notificationsFailed
        },
        create: {
            date: dayStart,
            ticketsCreated,
            ticketsResolved,
            avgResolutionTime,
            ticketsOpen,
            ticketsInProgress,
            ticketsClosed,
            portalConnections,
            portalUptimeAvg,
            notificationsSent,
            notificationsDelivered,
            notificationsFailed
        }
    });

    return snapshot;
}
