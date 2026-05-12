import type { Request, Response } from 'express';

import { getProviderHealthHosts, getProviderHealthSummary, getProviderHealthTimeline } from '../../services/providerHealth.service';

function parseDayRange(req: Request): { from: Date; to: Date } | null {
  const fromRaw = typeof req.query.from === 'string' ? req.query.from : '';
  const toRaw = typeof req.query.to === 'string' ? req.query.to : '';
  if (!fromRaw || !toRaw) return null;

  const from = new Date(`${fromRaw}T00:00:00.000Z`);
  const to = new Date(`${toRaw}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  if (from > to) return null;
  return { from, to };
}

export const ProviderHealthAdminController = {
  async summary(req: Request, res: Response) {
    try {
      const range = parseDayRange(req);
      if (!range) {
        return res.status(400).json({ success: false, message: 'from and to (YYYY-MM-DD) are required' });
      }
      const items = await getProviderHealthSummary(range.from, range.to);
      return res.json({ success: true, items });
    } catch (err) {
      console.error('[ProviderHealthAdminController.summary] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load provider health summary' });
    }
  },

  async hosts(req: Request, res: Response) {
    try {
      const portalIdentity = typeof req.query.portalIdentity === 'string' ? req.query.portalIdentity.trim() : '';
      if (!portalIdentity) {
        return res.status(400).json({ success: false, message: 'portalIdentity is required' });
      }
      const range = parseDayRange(req);
      if (!range) {
        return res.status(400).json({ success: false, message: 'from and to (YYYY-MM-DD) are required' });
      }
      const items = await getProviderHealthHosts(portalIdentity, range.from, range.to);
      return res.json({ success: true, items });
    } catch (err) {
      console.error('[ProviderHealthAdminController.hosts] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load provider health hosts' });
    }
  },

  async timeline(req: Request, res: Response) {
    try {
      const portalIdentity = typeof req.query.portalIdentity === 'string' ? req.query.portalIdentity.trim() : '';
      if (!portalIdentity) {
        return res.status(400).json({ success: false, message: 'portalIdentity is required' });
      }

      const daysRaw = typeof req.query.days === 'string' ? Number(req.query.days) : 30;
      const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(90, Math.floor(daysRaw))) : 30;
      const items = await getProviderHealthTimeline(portalIdentity, days);
      return res.json({ success: true, items });
    } catch (err) {
      console.error('[ProviderHealthAdminController.timeline] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load provider health timeline' });
    }
  },
};

