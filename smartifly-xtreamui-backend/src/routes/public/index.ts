// ============================================================
// src/routes/public/index.ts
// SMARTIFLY XTREAM UI — ENTERPRISE PUBLIC ROUTES INDEX
// ============================================================

import { Router } from 'express';

import deviceRoutes from './device.routes';
import licenseRoutes from './license.routes';
import corePublicRoutes from './public.routes';
import qrRoutes from './qr.routes';
import userRoutes from './user.routes';
import portalRoutes from './portal.routes';
import analyticsRoutes from './analytics.routes';
import themeRoutes from './theme.routes';
import contentRoutes from './content.routes';
import profileRoutes from './profile.routes';
import providerHealthRoutes from './providerHealth.routes';

const router = Router();

// Core public routes (config, health, etc.)
router.use('/', corePublicRoutes);

// License activation & management
router.use('/license', licenseRoutes);

// Device registration & status
router.use('/device', deviceRoutes);

// QR code generation & web activation
router.use('/qr', qrRoutes);

// User dashboard data
router.use('/me', userRoutes);

// Portal & Server Handshake
router.use('/portal', portalRoutes);

// Intelligence & Tracking
router.use('/analytics', analyticsRoutes);
router.use('/telemetry', providerHealthRoutes);

// Remote Theme Configuration
router.use('/theme', themeRoutes);

// Content Enrichment & Metadata
router.use('/content', contentRoutes);

// Multi-Profile Management
router.use('/profiles', profileRoutes);

export default router;
