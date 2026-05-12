// src/controllers/admin/user.controller.ts
import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';
import { UserRepository } from '../../repositories/user.repository';
import { UserService } from '../../services/user.service';

function extractMetadata(req: Request) {
  return {
    actorId: req.user!.id,
    ipAddress: req.ip || null,
  };
}

export const UserController = {
  async list(req: Request, res: Response) {
    try {
      const { page = '1', limit = '20', search, status } = req.query;
      const filters: { role: 'USER'; search?: string; isActive?: boolean } = { role: 'USER' };
      if (search) filters.search = String(search);
      if (status === 'active') filters.isActive = true;
      if (status === 'suspended') filters.isActive = false;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));

      const { users, total } = await UserRepository.findMany(filters, { page: pageNum, limit: limitNum });
      return res.json({
        items: UserRepository.sanitizeMany(users),
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  async getStats(_req: Request, res: Response) {
    try {
      const [total, active, suspended] = await Promise.all([
        prisma.user.count({ where: { role: 'USER', deletedAt: null } }),
        prisma.user.count({ where: { role: 'USER', isActive: true, deletedAt: null } }),
        prisma.user.count({ where: { role: 'USER', isActive: false, deletedAt: null } }),
      ]);
      return res.json({ total, active, suspended });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  },

  async get(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
        include: { licenses: true, devices: true }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: UserRepository.sanitize(user) });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  },

  async activate(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const user = await UserService.activate(id, extractMetadata(req));
      return res.json({ success: true, user: UserRepository.sanitize(user) });
    } catch {
      return res.status(500).json({ error: 'Failed to activate user' });
    }
  },

  async suspend(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const user = await UserService.suspend(id, req.body.reason, extractMetadata(req));
      return res.json({ success: true, user: UserRepository.sanitize(user) });
    } catch {
      return res.status(500).json({ error: 'Failed to suspend user' });
    }
  },

  async unlock(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const user = await UserService.unlock(id, extractMetadata(req));
      return res.json({ success: true, user: UserRepository.sanitize(user) });
    } catch {
      return res.status(500).json({ error: 'Failed to unlock user' });
    }
  },

  async revokeSessions(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const count = await UserService.revokeAllSessions(id, 'Revoked by admin', extractMetadata(req));
      return res.json({ success: true, count });
    } catch {
      return res.status(500).json({ error: 'Failed to revoke sessions' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await UserService.softDelete(id, extractMetadata(req));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  },

  async restore(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const user = await UserService.restore(id, extractMetadata(req));
      return res.json({ success: true, user: UserRepository.sanitize(user) });
    } catch {
      return res.status(500).json({ error: 'Failed to restore user' });
    }
  },

  async getDevices(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const devices = await prisma.deviceUser.findMany({
        where: { userId: id, deletedAt: null }
      });
      return res.json({ success: true, devices });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch devices' });
    }
  }
};

export default UserController;
