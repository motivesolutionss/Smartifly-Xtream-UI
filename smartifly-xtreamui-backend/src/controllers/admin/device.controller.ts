// src/controllers/admin/device.controller.ts
import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';

const bad = (res: Response, msg: string) => res.status(400).json({ success: false, message: msg });

export const AdminDeviceController = {
  /**
   * List all devices with basic filters
   */
  async list(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.deviceUser.findMany({
          skip,
          take: limit,
          orderBy: { lastSeenAt: 'desc' },
          include: { 
            user: { select: { name: true, email: true } },
            licenses: { select: { key: true, status: true, expiresAt: true } }
          }
        }),
        prisma.deviceUser.count()
      ]);

      return res.json({ success: true, items, total, page, limit, pages: Math.ceil(total / limit) });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to list devices' });
    }
  },

  /**
   * Get device detail
   */
  async getById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const device = await prisma.deviceUser.findUnique({
        where: { id },
        include: { licenses: true, user: true }
      });
      if (!device) return res.status(404).json({ success: false, message: 'Device not found' });
      return res.json({ success: true, device });
    } catch {
      return res.status(500).json({ success: false });
    }
  },

  /**
   * Get device by deviceId string
   */
  async getByDeviceId(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const device = await prisma.deviceUser.findUnique({
        where: { deviceId },
        include: { licenses: true, user: true }
      });
      if (!device) return res.status(404).json({ success: false, message: 'Device not found' });
      return res.json({ success: true, device });
    } catch {
      return res.status(500).json({ success: false });
    }
  },

  /**
   * Update device
   */
  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { brand, model, platform, mac, userId } = req.body;

      const updated = await prisma.deviceUser.update({
        where: { id },
        data: { brand, model, platform, mac, userId }
      });

      return res.json({ success: true, device: updated });
    } catch {
      return bad(res, 'Update failed');
    }
  },

  /**
   * Delete device
   */
  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await prisma.deviceUser.update({ where: { id }, data: { deletedAt: new Date() } });
      return res.json({ success: true, message: 'Device deleted' });
    } catch {
      return bad(res, 'Delete failed');
    }
  },

  /**
   * Get stats
   */
  async getStats(_req: Request, res: Response) {
    try {
      const stats = await prisma.deviceUser.count();
      return res.json({ success: true, totalDevices: stats });
    } catch {
      return res.status(500).json({ success: false });
    }
  }
};
