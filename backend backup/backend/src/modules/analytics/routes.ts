import { Router, Response } from 'express';
import prisma from '../../config/database.js';
import { authMiddleware, AuthRequest } from '../../middleware/index.js';
import * as analyticsService from './service.js';

const router = Router();

// GET /api/analytics/dashboard - Aggregated dashboard stats
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const stats = await analyticsService.getDashboardStats(start, end);
        res.json(stats);
    } catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
    }
});

// GET /api/analytics/tickets - Ticket metrics over time
router.get('/tickets', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const metrics = await analyticsService.getTicketMetrics(start, end);
        res.json(metrics);
    } catch (error) {
        console.error('Ticket analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch ticket analytics' });
    }
});

// GET /api/analytics/portals - Portal connection statistics
router.get('/portals', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const metrics = await analyticsService.getPortalMetrics(start, end);
        res.json(metrics);
    } catch (error) {
        console.error('Portal analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch portal analytics' });
    }
});

// GET /api/analytics/notifications - Notification delivery rates
router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const metrics = await analyticsService.getNotificationMetrics(start, end);
        res.json(metrics);
    } catch (error) {
        console.error('Notification analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch notification analytics' });
    }
});

// GET /api/analytics/admin-activity - Admin activity heatmap
router.get('/admin-activity', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const heatmap = await analyticsService.getAdminActivityHeatmap(start, end);
        res.json(heatmap);
    } catch (error) {
        console.error('Admin activity error:', error);
        res.status(500).json({ error: 'Failed to fetch admin activity' });
    }
});

// POST /api/analytics/snapshot - Generate snapshot for a date (internal/cron)
router.post('/snapshot', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { date } = req.body;
        const targetDate = date ? new Date(date) : new Date();

        const snapshot = await analyticsService.generateDailySnapshot(targetDate);
        res.json(snapshot);
    } catch (error) {
        console.error('Snapshot generation error:', error);
        res.status(500).json({ error: 'Failed to generate snapshot' });
    }
});

export default router;
