// src/routes/public/qr.routes.ts
import type { Request, Response } from 'express';
import { Router } from 'express';

import { prisma } from '../../config/prisma';
import { QRCodeService } from '../../services/qr-code.service';

const router = Router();

function error(res: Response, code: number, message: string) {
  return res.status(code).json({ success: false, message });
}

function success(res: Response, data: unknown) {
  return res.json({ success: true, ...(data as object) });
}

/**
 * Step 1: App generates 6-digit code for activation
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { deviceId, mac, brand, model } = req.body;

    if (!deviceId) return error(res, 400, 'Device ID is required');

    const result = await QRCodeService.generateSession({
      deviceId,
      mac: mac || '',
      brand,
      model
    });

    // ✅ FIX: Use a clean URL for the QR code instead of a Data URI
    // This is much more compatible with Android TV image loaders
    const cleanQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(result.webLink)}`;

    return success(res, {
      settingsCode: result.settingsCode,
      token: result.token,
      qrCode: cleanQrUrl, // Now a clean image URL
      webLink: result.webLink,
      expiresIn: '24 hours'
    });
  } catch (err) {
    console.error('[QR.generate] Error:', err);
    return error(res, 500, 'Failed to generate activation code');
  }
});

/**
 * Step 2: Portal resolves 6-digit code to get device info
 */
router.get('/resolve/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const session = await prisma.deviceToken.findFirst({
      where: { settingsCode: code, isUsed: false, expiresAt: { gt: new Date() } }
    });

    if (!session) return error(res, 404, 'Invalid or expired code');

    return success(res, {
      deviceId: session.deviceId,
      mac: session.mac
    });
  } catch {
    return error(res, 500, 'Failed to resolve code');
  }
});

/**
 * Step 3: Portal binds user account and Xtream credentials to the device
 */
router.post('/bind', async (req: Request, res: Response) => {
  try {
    const { settingsCode, userId, serverId, xtreamUser, xtreamPass } = req.body;

    const session = await prisma.deviceToken.findFirst({
      where: { settingsCode, isUsed: false, expiresAt: { gt: new Date() } }
    });

    if (!session) return error(res, 404, 'Invalid or expired code');

    // 1. Ensure device exists or create it (Immediate Registration)
    const deviceUser = await prisma.deviceUser.upsert({
      where: { deviceId: session.deviceId },
      update: { mac: session.mac },
      create: { 
        deviceId: session.deviceId,
        mac: session.mac,
        lastSeenAt: new Date()
      }
    });

    // 2. Create or Update License (Binding)
    await prisma.license.upsert({
      where: { key: `LIC-${session.deviceId}` },
      update: {
        userId,
        deviceUserId: deviceUser.id,
        serverId,
        xtreamUser,
        xtreamPass,
        activatedAt: new Date(),
        status: 'ACTIVE'
      },
      create: {
        key: `LIC-${session.deviceId}`,
        userId,
        deviceUserId: deviceUser.id,
        serverId,
        xtreamUser,
        xtreamPass,
        activatedAt: new Date(),
        status: 'ACTIVE',
        plan: 'MONTHLY'
      }
    });

    // 3. Mark code as used
    await prisma.deviceToken.update({
      where: { id: session.id },
      data: { isUsed: true }
    });

    return success(res, { message: 'Device bound successfully' });
  } catch (err) {
    console.error('[QR.bind] Error:', err);
    return error(res, 500, 'Binding failed');
  }
});

export default router;
