// src/controllers/admin/dashboard.controller.ts
import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';
import { getOpsState } from '../../storage/adminOps.store';
import { listPackages } from '../../storage/adminContent.store';
import { listTickets } from '../../storage/adminTickets.store';
import { assertProviderHealthSchemaReady } from '../../startup/providerHealthSchemaCheck';

function parseDateRange(req: Request): { start?: Date; end?: Date } {
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : undefined;
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : undefined;
  return {
    start: start && !Number.isNaN(start.getTime()) ? start : undefined,
    end: end && !Number.isNaN(end.getTime()) ? end : undefined,
  };
}

function isWithinRange(dateValue: string | Date | undefined, start?: Date, end?: Date): boolean {
  if (!dateValue) return false;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function buildDateSeries(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export const AdminDashboardController = {
  async metrics(_req: Request, res: Response) {
    try {
      const readiness = await (async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          await assertProviderHealthSchemaReady();
          return { ready: true, message: 'System ready' };
        } catch (error) {
          return {
            ready: false,
            message: error instanceof Error ? error.message : 'System readiness check failed',
          };
        }
      })();

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [
        activeLicenses,
        expiredLicenses,
        totalUsers,
        suspendedUsers,
        totalDevices,
        onlineDevices,
        totalServers,
        totalPackages,
        totalTickets,
        resolvedTickets,
        notificationsSent,
      ] = await Promise.all([
        prisma.license.count({ where: { status: 'ACTIVE', deletedAt: null } }),
        prisma.license.count({ where: { status: 'EXPIRED', deletedAt: null } }),
        prisma.user.count({ where: { role: 'USER', deletedAt: null } }),
        prisma.user.count({ where: { role: 'USER', isActive: false, deletedAt: null } }),
        prisma.deviceUser.count({ where: { deletedAt: null } }),
        prisma.deviceUser.count({ where: { lastSeenAt: { gte: weekAgo }, deletedAt: null } }),
        prisma.xtreamServer.count({ where: { isActive: true } }),
        listPackages().then((items) => items.length),
        listTickets().then((items) => items.length),
        listTickets().then((items) => items.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length),
        getOpsState().then((s) => s.notificationHistory.length),
      ]);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentLicenses = await prisma.license.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
        select: { createdAt: true },
      });

      const licenseGrowthMap = new Map<string, number>();
      for (let i = 29; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        licenseGrowthMap.set(d.toISOString().split('T')[0], 0);
      }

      recentLicenses.forEach((license) => {
        const date = license.createdAt.toISOString().split('T')[0];
        licenseGrowthMap.set(date, (licenseGrowthMap.get(date) ?? 0) + 1);
      });

      const licenseGrowth = Array.from(licenseGrowthMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return res.json({
        success: true,
        readiness,
        stats: {
          activeLicenses,
          expiredLicenses,
          totalUsers,
          suspendedUsers,
          totalDevices,
          onlineDevices,
          totalServers,
          totalPackages,
          totalTickets,
          resolvedTickets,
          notificationsSent,
        },
        charts: {
          licenseGrowth
        }
      });
    } catch (err) {
      console.error('[AdminDashboard.metrics] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }
  ,
  async snapshot(req: Request, res: Response) {
    const date = typeof req.body?.date === 'string' ? req.body.date : new Date().toISOString();
    return res.json({ success: true, generatedAt: new Date().toISOString(), date });
  },
  async ticketAnalytics(req: Request, res: Response) {
    try {
      const { start, end } = parseDateRange(req);
      const allTickets = await listTickets();
      const filtered = allTickets.filter((ticket) => isWithinRange((ticket.createdAt as string | undefined) ?? (ticket.updatedAt as string | undefined), start, end));

      const statusCounts = new Map<string, number>();
      const priorityCounts = new Map<string, number>();
      const timelineMap = new Map<string, { created: number; resolved: number; open: number; inProgress: number }>();

      const effectiveStart = start ?? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const effectiveEnd = end ?? new Date();
      buildDateSeries(effectiveStart, effectiveEnd).forEach((d) => {
        timelineMap.set(d, { created: 0, resolved: 0, open: 0, inProgress: 0 });
      });

      let totalResolved = 0;
      let resolvedDurationsHours: number[] = [];
      filtered.forEach((ticket: Record<string, unknown>) => {
        const status = String(ticket.status ?? 'OPEN');
        const priority = String(ticket.priority ?? 'MEDIUM');
        statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
        priorityCounts.set(priority, (priorityCounts.get(priority) ?? 0) + 1);

        const createdAt = typeof ticket.createdAt === 'string' ? new Date(ticket.createdAt) : undefined;
        if (createdAt && !Number.isNaN(createdAt.getTime())) {
          const key = createdAt.toISOString().split('T')[0];
          const row = timelineMap.get(key);
          if (row) row.created += 1;
        }

        if (status === 'RESOLVED' || status === 'CLOSED') {
          totalResolved += 1;
          const resolvedAtRaw = typeof ticket.updatedAt === 'string' ? new Date(ticket.updatedAt) : undefined;
          if (createdAt && resolvedAtRaw && !Number.isNaN(resolvedAtRaw.getTime())) {
            resolvedDurationsHours.push(Math.max(0, (resolvedAtRaw.getTime() - createdAt.getTime()) / (1000 * 60 * 60)));
            const key = resolvedAtRaw.toISOString().split('T')[0];
            const row = timelineMap.get(key);
            if (row) row.resolved += 1;
          }
        }

        const statusKey = status === 'IN_PROGRESS' ? 'inProgress' : status === 'OPEN' ? 'open' : undefined;
        if (statusKey && createdAt) {
          const key = createdAt.toISOString().split('T')[0];
          const row = timelineMap.get(key);
          if (row) row[statusKey] += 1;
        }
      });

      resolvedDurationsHours = resolvedDurationsHours.sort((a, b) => a - b);
      const average = resolvedDurationsHours.length ? Number((resolvedDurationsHours.reduce((a, b) => a + b, 0) / resolvedDurationsHours.length).toFixed(2)) : 0;
      const min = resolvedDurationsHours.length ? Number(resolvedDurationsHours[0].toFixed(2)) : 0;
      const max = resolvedDurationsHours.length ? Number(resolvedDurationsHours[resolvedDurationsHours.length - 1].toFixed(2)) : 0;

      return res.json({
        timeline: Array.from(timelineMap.entries()).map(([date, values]) => ({ date, ...values })),
        statusDistribution: Array.from(statusCounts.entries()).map(([name, value]) => ({ name, value })),
        priorityDistribution: Array.from(priorityCounts.entries()).map(([name, value]) => ({ name, value })),
        resolutionStats: { average, min, max, totalResolved },
      });
    } catch (err) {
      console.error('[AdminDashboard.ticketAnalytics] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch ticket analytics' });
    }
  },
  async notificationAnalytics(req: Request, res: Response) {
    try {
      const { start, end } = parseDateRange(req);
      const ops = await getOpsState();
      const filtered = ops.notificationHistory.filter((item: Record<string, unknown>) =>
        isWithinRange((item.sentAt as string | undefined) ?? (item.createdAt as string | undefined), start, end)
      );

      const statusCounts = new Map<string, number>();
      const timelineMap = new Map<string, { sent: number; failed: number; pending: number; deliveryRate: number }>();

      const effectiveStart = start ?? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const effectiveEnd = end ?? new Date();
      buildDateSeries(effectiveStart, effectiveEnd).forEach((d) => {
        timelineMap.set(d, { sent: 0, failed: 0, pending: 0, deliveryRate: 100 });
      });

      filtered.forEach((item: Record<string, unknown>) => {
        const status = String(item.status ?? 'SENT');
        statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
        const sentAt = typeof item.sentAt === 'string' ? new Date(item.sentAt) : undefined;
        if (!sentAt || Number.isNaN(sentAt.getTime())) return;
        const key = sentAt.toISOString().split('T')[0];
        const row = timelineMap.get(key);
        if (!row) return;
        if (status === 'FAILED') row.failed += 1;
        else if (status === 'PENDING' || status === 'SCHEDULED') row.pending += 1;
        else row.sent += 1;
      });

      const timeline = Array.from(timelineMap.entries()).map(([date, row]) => {
        const denominator = row.sent + row.failed;
        const deliveryRate = denominator > 0 ? Math.round((row.sent / denominator) * 100) : 100;
        return { date, sent: row.sent, failed: row.failed, pending: row.pending, deliveryRate };
      });

      const sent = filtered.filter((n: Record<string, unknown>) => String(n.status ?? 'SENT') === 'SENT').length;
      const failed = filtered.filter((n: Record<string, unknown>) => String(n.status ?? '') === 'FAILED').length;
      const total = filtered.length;
      const deliveryRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 100;

      return res.json({
        summary: { total, sent, failed, deliveryRate },
        timeline,
        statusDistribution: Array.from(statusCounts.entries()).map(([name, value]) => ({ name, value })),
      });
    } catch (err) {
      console.error('[AdminDashboard.notificationAnalytics] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch notification analytics' });
    }
  },
  async adminActivity(req: Request, res: Response) {
    try {
      const { start, end } = parseDateRange(req);
      const where =
        start || end
          ? {
              createdAt: {
                ...(start ? { gte: start } : {}),
                ...(end ? { lte: end } : {}),
              },
            }
          : {};

      const logs = await prisma.auditLog.findMany({
        where,
        select: { action: true, createdAt: true },
      });

      const buckets = new Map<string, number>();
      const actionCounts = new Map<string, number>();
      let maxCount = 0;
      logs.forEach((log) => {
        const day = log.createdAt.getUTCDay();
        const hour = log.createdAt.getUTCHours();
        const key = `${day}-${hour}`;
        const next = (buckets.get(key) ?? 0) + 1;
        buckets.set(key, next);
        if (next > maxCount) maxCount = next;

        const action = String(log.action);
        actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
      });

      const heatmap = Array.from(buckets.entries()).map(([key, count]) => {
        const [day, hour] = key.split('-').map(Number);
        return {
          day,
          hour,
          count,
          intensity: maxCount > 0 ? Number((count / maxCount).toFixed(3)) : 0,
        };
      });

      return res.json({
        heatmap,
        maxCount,
        totalActions: logs.length,
        actionDistribution: Array.from(actionCounts.entries()).map(([name, value]) => ({ name, value })),
        dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        hourLabels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      });
    } catch (err) {
      console.error('[AdminDashboard.adminActivity] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch admin activity' });
    }
  },
  async topContent(req: Request, res: Response) {
    try {
      const { start, end } = parseDateRange(req);
      const where = {
        status: 'STARTED',
        ...(start || end ? {
          timestamp: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {}),
          }
        } : {})
      };

      const [topMovies, topSeries, topLive] = await Promise.all([
        prisma.playbackActivity.groupBy({
          by: ['movieId'],
          where: { ...where, type: 'MOVIE' },
          _count: { movieId: true },
          orderBy: { _count: { movieId: 'desc' } },
          take: 10
        }),
        prisma.playbackActivity.groupBy({
          by: ['movieId'],
          where: { ...where, type: 'SERIES' },
          _count: { movieId: true },
          orderBy: { _count: { movieId: 'desc' } },
          take: 10
        }),
        prisma.playbackActivity.groupBy({
          by: ['movieId'],
          where: { ...where, type: 'LIVE' },
          _count: { movieId: true },
          orderBy: { _count: { movieId: 'desc' } },
          take: 10
        })
      ]);

      return res.json({
        success: true,
        data: {
          movies: topMovies.map(m => ({ id: m.movieId, views: m._count.movieId })),
          series: topSeries.map(s => ({ id: s.movieId, views: s._count.movieId })),
          live: topLive.map(l => ({ id: l.movieId, views: l._count.movieId }))
        }
      });
    } catch (err) {
      console.error('[AdminDashboard.topContent] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch top content' });
    }
  }
};

export default AdminDashboardController;
