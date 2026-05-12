// ============================================================
// src/routes/device/index.ts
// Device Routes Aggregator
// ============================================================

import { Router } from 'express';

import adminDeviceRoutes from '../admin/device.routes';
import publicDeviceRoutes from '../public/device.routes';

const router = Router();

// Mount routes
// These would typically be mounted at different base paths in app.ts

export { publicDeviceRoutes, adminDeviceRoutes };

export default router;
