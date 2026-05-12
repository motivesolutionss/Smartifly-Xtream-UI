// src/controllers/admin/audit.controller.ts
import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';

export const AuditController = {
  /**
   * List audit logs
   */
  async list(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } }
        }),
        prisma.auditLog.count()
      ]);

      return res.json({ 
        success: true, 
        items, 
        total, 
        page, 
        limit, 
        pages: Math.ceil(total / limit) 
      });
    } catch (err) {
      console.error('[Audit.list] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to list audit logs' });
    }
  },

  /**
   * Delete selected logs (cleanup)
   */
  async deleteSelected(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ success: false, message: 'IDs must be an array' });

      const result = await prisma.auditLog.deleteMany({
        where: { id: { in: ids.map(Number) } }
      });

      return res.json({ success: true, deletedCount: result.count });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to delete logs' });
    }
  },

  /**
   * Simple undo (Not implemented in purified version yet)
   */
  async undo(_req: Request, res: Response) {
    return res.status(501).json({ success: false, message: 'Undo not implemented in this version' });
  }
};

export default AuditController;
