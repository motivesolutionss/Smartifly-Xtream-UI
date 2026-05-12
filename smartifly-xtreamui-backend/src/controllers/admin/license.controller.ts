// src/controllers/admin/license.controller.ts
import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';
import { appendLedgerEntry } from '../../storage/financeLedger.store';

const bad = (res: Response, msg: string) => res.status(400).json({ success: false, message: msg });
const CURRENCY = 'USD';

function planAmount(plan: string): number {
  switch (plan) {
    case 'MONTHLY':
      return 10;
    case 'QUARTERLY':
      return 25;
    case 'YEARLY':
      return 90;
    case 'LIFETIME':
      return 200;
    case 'TRIAL':
    default:
      return 0;
  }
}

export const LicenseController = {
  /**
   * List licenses with basic filters
   */
  async list(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.license.findMany({
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: { 
            user: { select: { name: true, email: true } },
            deviceUser: { select: { deviceId: true, mac: true } },
            server: { select: { name: true } }
          }
        }),
        prisma.license.count()
      ]);

      return res.json({ success: true, items, total, page, limit, pages: Math.ceil(total / limit) });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to list licenses' });
    }
  },

  /**
   * Create a new license (subscription)
   */
  async create(req: Request, res: Response) {
    try {
      const { plan, userId, serverId, xtreamUser, xtreamPass } = req.body;

      const license = await prisma.license.create({
        data: {
          key: `LIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          plan: plan || 'MONTHLY',
          userId,
          serverId,
          xtreamUser,
          xtreamPass,
          status: 'ACTIVE'
        }
      });
      const amount = planAmount(license.plan);
      if (amount > 0) {
        await appendLedgerEntry({
          type: 'SUBSCRIPTION_CREATED',
          userId: license.userId,
          licenseId: license.id,
          amount,
          currency: CURRENCY,
          status: 'POSTED',
          note: `License created (${license.plan})`,
          meta: { plan: license.plan, key: license.key },
        });
      }

      return res.status(201).json({ success: true, license });
    } catch {
      return bad(res, 'Failed to create license');
    }
  },

  /**
   * Get license detail
   */
  async detail(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const license = await prisma.license.findUnique({
        where: { id },
        include: { deviceUser: true, user: true, server: true }
      });
      if (!license) return res.status(404).json({ success: false, message: 'License not found' });
      return res.json({ success: true, license });
    } catch {
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  },

  /**
   * Update license
   */
  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { status, plan, expiresAt, serverId, xtreamUser, xtreamPass } = req.body;
      const existing = await prisma.license.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'License not found' });

      const updated = await prisma.license.update({
        where: { id },
        data: {
          status,
          plan,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          serverId,
          xtreamUser,
          xtreamPass
        }
      });

      if (plan && plan !== existing.plan) {
        const previous = planAmount(existing.plan);
        const next = planAmount(updated.plan);
        const delta = next - previous;
        if (delta !== 0) {
          await appendLedgerEntry({
            type: 'PLAN_CHANGED',
            userId: updated.userId,
            licenseId: updated.id,
            amount: delta,
            currency: CURRENCY,
            status: 'POSTED',
            note: `Plan changed ${existing.plan} -> ${updated.plan}`,
            meta: { previousPlan: existing.plan, nextPlan: updated.plan },
          });
        }
      }

      if (status && status !== existing.status && status === 'ACTIVE') {
        const amount = planAmount(updated.plan);
        if (amount > 0) {
          await appendLedgerEntry({
            type: 'SUBSCRIPTION_RENEWED',
            userId: updated.userId,
            licenseId: updated.id,
            amount,
            currency: CURRENCY,
            status: 'POSTED',
            note: `License renewed (${updated.plan})`,
            meta: { plan: updated.plan, key: updated.key },
          });
        }
      }

      return res.json({ success: true, license: updated });
    } catch {
      return bad(res, 'Update failed');
    }
  },

  /**
   * Delete license
   */
  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.license.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'License not found' });
      await prisma.license.update({ where: { id }, data: { deletedAt: new Date() } });
      await appendLedgerEntry({
        type: 'SUBSCRIPTION_CANCELED',
        userId: existing.userId,
        licenseId: existing.id,
        amount: 0,
        currency: CURRENCY,
        status: 'POSTED',
        note: 'License canceled by admin',
        meta: { key: existing.key, plan: existing.plan },
      });
      return res.json({ success: true, message: 'License deleted' });
    } catch {
      return bad(res, 'Delete failed');
    }
  },

  /**
   * Simple stats
   */
  async getStats(_req: Request, res: Response) {
    try {
      const stats = await prisma.license.groupBy({
        by: ['status'],
        _count: { status: true }
      });
      return res.json({ success: true, stats });
    } catch {
      return res.status(500).json({ success: false });
    }
  }
};
