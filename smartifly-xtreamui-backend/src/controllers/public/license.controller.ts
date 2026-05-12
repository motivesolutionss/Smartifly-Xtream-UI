// src/controllers/public/license.controller.ts
import type { Platform } from '@prisma/client';
import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';

const error = (res: Response, code: number, message: string) => res.status(code).json({ success: false, message });
const success = (res: Response, data: object) => res.json({ success: true, ...data });

export const PublicLicenseController = {
  /**
   * Activate license on a device
   */
  activate: async (req: Request, res: Response) => {
    try {
      const { licenseKey, deviceId, mac, brand, model, platform } = req.body;

      if (!licenseKey || !deviceId) {
        return error(res, 400, 'License key and deviceId are required');
      }

      // 1. Find the license
      const license = await prisma.license.findUnique({
        where: { key: licenseKey },
        include: { server: true }
      });

      if (!license) return error(res, 404, 'License key not found');
      if (license.status !== 'ACTIVE') return error(res, 403, 'License is not active');
      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return error(res, 403, 'License has expired');
      }

      // 2. Register/Update Device
      const deviceUser = await prisma.deviceUser.upsert({
        where: { deviceId },
        update: { 
          mac, 
          brand, 
          model, 
          platform: (platform as Platform) || 'ANDROID_TV',
          lastSeenAt: new Date()
        },
        create: {
          deviceId,
          mac,
          brand,
          model,
          platform: (platform as Platform) || 'ANDROID_TV',
          lastSeenAt: new Date()
        }
      });

      // 3. Bind Device to License
      const updatedLicense = await prisma.license.update({
        where: { id: license.id },
        data: {
          deviceUserId: deviceUser.id,
          activatedAt: new Date(),
          lastUsedAt: new Date()
        },
        include: { server: true }
      });

      return success(res, {
        license: updatedLicense,
        server: updatedLicense.server,
        device: deviceUser
      });
    } catch (err) {
      console.error('[License.activate] Error:', err);
      return error(res, 500, 'Activation failed');
    }
  },

  /**
   * Check license status
   */
  check: async (req: Request, res: Response) => {
    try {
      const { licenseKey } = req.query as { licenseKey: string };
      if (!licenseKey) return error(res, 400, 'License key is required');

      const license = await prisma.license.findUnique({
        where: { key: licenseKey },
        include: { server: true }
      });

      if (!license) return success(res, { exists: false });

      return success(res, {
        exists: true,
        status: license.status,
        expiresAt: license.expiresAt,
        plan: license.plan,
        server: license.server ? { name: license.server.name } : null
      });
    } catch {
      return error(res, 500, 'Check failed');
    }
  },

  /**
   * Get detailed info
   */
  getInfo: async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const license = await prisma.license.findUnique({
        where: { key },
        include: { deviceUser: true, server: true }
      });

      if (!license) return error(res, 404, 'License not found');

      return success(res, { license });
    } catch {
      return error(res, 500, 'Failed to get info');
    }
  }
};

export default PublicLicenseController;
