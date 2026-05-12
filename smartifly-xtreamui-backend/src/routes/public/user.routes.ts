// src/routes/public/user.routes.ts
import { Router } from 'express';

import { prisma } from '../../config/prisma';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/requireRole';

const router = Router();

// Protected routes for logged-in users
router.use(authMiddleware());
router.use(requireRole(['USER']));

/**
 * Get dashboard overview
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user!.id;

    const [deviceCount, activeLicenses, licenses] = await Promise.all([
      prisma.deviceUser.count({ where: { userId, deletedAt: null } }),
      prisma.license.count({
        where: { userId, status: 'ACTIVE', deletedAt: null },
      }),
      prisma.license.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        totalDevices: deviceCount,
        activeLicenses,
        totalLicenses: licenses.length,
      },
      recentLicenses: licenses.slice(0, 5),
    });
  } catch (err) {
    console.error('[UserDashboard] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

/**
 * Get user devices
 */
router.get('/devices', async (req, res) => {
  try {
    const userId = req.user!.id;
    const devices = await prisma.deviceUser.findMany({
      where: { userId, deletedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    });
    res.json({ success: true, devices });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load devices' });
  }
});

/**
 * Get user licenses (subscriptions)
 */
router.get('/licenses', async (req, res) => {
  try {
    const userId = req.user!.id;
    const licenses = await prisma.license.findMany({
      where: { userId, deletedAt: null },
      include: {
        deviceUser: { select: { deviceId: true, mac: true, brand: true, model: true } },
        server: { select: { name: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, licenses });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load licenses' });
  }
});

export default router;
