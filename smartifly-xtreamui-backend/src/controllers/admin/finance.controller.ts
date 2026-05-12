import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';
import { appendLedgerEntry, listLedgerEntries } from '../../storage/financeLedger.store';

export const FinanceController = {
  async summary(_req: Request, res: Response) {
    try {
      const entries = await listLedgerEntries();
      const posted = entries.filter((e) => e.status === 'POSTED');
      const grossRevenue = posted
        .filter((e) => e.amount > 0)
        .reduce((sum, e) => sum + e.amount, 0);
      const refunds = Math.abs(
        posted
          .filter((e) => e.type === 'REFUND' || e.amount < 0)
          .reduce((sum, e) => sum + e.amount, 0)
      );
      const netRevenue = grossRevenue - refunds;

      const [activeSubscriptions, totalUsers] = await Promise.all([
        prisma.license.count({ where: { status: 'ACTIVE', deletedAt: null } }),
        prisma.user.count({ where: { role: 'USER', deletedAt: null } }),
      ]);

      return res.json({
        grossRevenue,
        refunds,
        netRevenue,
        activeSubscriptions,
        totalUsers,
        totalEntries: entries.length,
      });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to load finance summary' });
    }
  },

  async listEntries(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 20)));
      const type = typeof req.query.type === 'string' ? req.query.type : '';

      const entries = await listLedgerEntries();
      const filtered = type ? entries.filter((e) => e.type === type) : entries;
      const start = (page - 1) * limit;
      const items = filtered.slice(start, start + limit);

      return res.json({
        items,
        total: filtered.length,
        page,
        limit,
        pages: Math.ceil(filtered.length / limit) || 1,
      });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to list ledger entries' });
    }
  },

  async createEntry(req: Request, res: Response) {
    try {
      const { type, userId, licenseId, amount, currency, note, meta } = req.body ?? {};
      if (!type || !currency || amount === undefined) {
        return res.status(400).json({ success: false, message: 'type, amount, currency are required' });
      }
      const entry = await appendLedgerEntry({
        type,
        userId: userId ? Number(userId) : null,
        licenseId: licenseId ? Number(licenseId) : null,
        amount: Number(amount),
        currency: String(currency),
        status: 'POSTED',
        note: note ? String(note) : null,
        meta: meta && typeof meta === 'object' ? meta : null,
      });
      return res.status(201).json({ success: true, entry });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to create ledger entry' });
    }
  },
};

export default FinanceController;
