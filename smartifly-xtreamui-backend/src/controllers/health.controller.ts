import type { Request, Response } from 'express';

import { prisma } from '../prisma';

export const HealthController = {
  check: async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.json({ ok: true, db: 'ok' });
    } catch {
      return res.status(500).json({ ok: false, db: 'error' });
    }
  },
};
