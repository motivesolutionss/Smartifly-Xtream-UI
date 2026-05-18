// ============================================================
// src/routes/admin/index.ts
// SMARTIFLY XTREAM UI — ENTERPRISE ADMIN ROUTES INDEX
// ============================================================

import { Router } from 'express';


import auditRoutes from './audit.routes';
import dashboardRoutes from './dashboard.routes';
import deviceRoutes from './device.routes';
import financeRoutes from './finance.routes';
import licenseRoutes from './license.routes';
import serverRoutes from './server.routes'; // New for Xtream Servers
import compatRoutes from './compat.routes';
import userRoutes from './user.routes';
import providerHealthRoutes from './providerHealth.routes';
import systemRoutes from './system.routes';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/requireRole';

const router = Router();

// Require Admin Role
router.use(authMiddleware());
router.use(requireRole(['ADMIN']));

router.use('/audit-logs', auditRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/devices', deviceRoutes);
router.use('/finance', financeRoutes);
router.use('/licenses', licenseRoutes);
router.use('/users', userRoutes);
router.use('/provider-health', providerHealthRoutes);
router.use('/system', systemRoutes);
router.use('/servers', serverRoutes);
router.use('/', compatRoutes);

export default router;
