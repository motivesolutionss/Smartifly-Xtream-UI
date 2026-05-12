// src/routes/admin/dashboard.routes.ts
import { Router } from 'express';

import { AdminDashboardController } from '../../controllers/admin/dashboard.controller';

const router = Router();

router.get('/metrics', AdminDashboardController.metrics);
router.post('/metrics', AdminDashboardController.snapshot);
router.get('/tickets', AdminDashboardController.ticketAnalytics);
router.get('/notifications', AdminDashboardController.notificationAnalytics);
router.get('/admin-activity', AdminDashboardController.adminActivity);
router.get('/top-content', AdminDashboardController.topContent);

export default router;
