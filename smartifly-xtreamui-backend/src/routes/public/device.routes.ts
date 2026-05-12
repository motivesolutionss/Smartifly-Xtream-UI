// src/routes/public/device.routes.ts
import { Router } from 'express';

import { PublicDeviceCheckController } from '../../controllers/public/deviceCheck.controller';

const router = Router();

// Basic status check (called on app startup)
router.get('/check', PublicDeviceCheckController.check);

// Registration (auto-onboarding)
router.post('/register', PublicDeviceCheckController.register);

// QR Generation for web binding
router.post('/qr', PublicDeviceCheckController.generateQR);

// Periodic tracking
router.post('/heartbeat', PublicDeviceCheckController.heartbeat);

export default router;
