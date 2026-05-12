// src/controllers/admin/server.controller.ts
import type { Request, Response } from 'express';
import dns from 'node:dns/promises';

import { prisma } from '../../config/prisma';
import { getServerOrders, removeServerOrder, setServerOrder, setServerOrders } from '../../storage/serverMeta.store';

function normalizeServerIdentity(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

type HealthStatus = 'ONLINE' | 'OFFLINE' | 'UNSTABLE' | 'UNKNOWN';

async function resolveIpFromUrl(rawUrl: string): Promise<string | null> {
  try {
    const hostname = new URL(rawUrl).hostname;
    const lookup = await dns.lookup(hostname);
    return lookup.address ?? null;
  } catch {
    return null;
  }
}

async function checkPortalHealth(url: string): Promise<{ healthStatus: HealthStatus; latency: number | null }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const latency = Date.now() - started;
    if (response.ok) return { healthStatus: latency > 2500 ? 'UNSTABLE' : 'ONLINE', latency };
    return { healthStatus: 'UNSTABLE', latency };
  } catch {
    return { healthStatus: 'OFFLINE', latency: null };
  } finally {
    clearTimeout(timer);
  }
}

async function enrichServer(server: {
  id: number;
  name: string;
  url: string;
  serverIdentity: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const orders = await getServerOrders();
  const order = orders[String(server.id)] ?? server.id;
  const [health, serverIp, totalLicenses, errorLicenses] = await Promise.all([
    checkPortalHealth(server.url),
    resolveIpFromUrl(server.url),
    prisma.license.count({ where: { serverId: server.id, deletedAt: null } }),
    prisma.license.count({
      where: {
        serverId: server.id,
        deletedAt: null,
        status: { in: ['EXPIRED', 'BLOCKED', 'DISABLED'] },
      },
    }),
  ]);

  return {
    ...server,
    order,
    healthStatus: health.healthStatus,
    latency: health.latency,
    serverIp,
    activeConnections: totalLicenses,
    errorCount: errorLicenses,
    lastCheckAt: new Date().toISOString(),
  };
}

export const ServerController = {
  /**
   * List all Xtream servers
   */
  async list(_req: Request, res: Response) {
    try {
      const servers = await prisma.xtreamServer.findMany({
        orderBy: { id: 'desc' }
      });
      const enriched = await Promise.all(servers.map(enrichServer));
      enriched.sort((a, b) => a.order - b.order);
      return res.json({ success: true, servers: enriched });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to list servers' });
    }
  },

  /**
   * Create a new Xtream server
   */
  async create(req: Request, res: Response) {
    try {
      const { name, url, isActive, isDefault, serverIdentity } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ success: false, message: 'Name and URL are required' });
      }

      // If this is set as default, unset others
      if (isDefault) {
        await prisma.xtreamServer.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }

      const normalizedIdentity = normalizeServerIdentity(serverIdentity || name);
      if (!normalizedIdentity) {
        return res.status(400).json({ success: false, message: 'Valid server identity is required' });
      }

      const existingIdentity = await prisma.xtreamServer.findUnique({
        where: { serverIdentity: normalizedIdentity },
        select: { id: true }
      });
      if (existingIdentity) {
        return res.status(409).json({ success: false, message: 'Server identity already exists' });
      }

      const server = await prisma.xtreamServer.create({
        data: { 
          name, 
          url, 
          serverIdentity: normalizedIdentity,
          isActive: isActive ?? true,
          isDefault: isDefault ?? false
        }
      });
      await setServerOrder(server.id, Number.MAX_SAFE_INTEGER);

      const enriched = await enrichServer(server);
      return res.json({ success: true, server: enriched });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to create server' });
    }
  },

  /**
   * Update Xtream server
   */
  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { name, url, isActive, isDefault, serverIdentity } = req.body;

      let normalizedIdentity: string | undefined;
      if (typeof serverIdentity === 'string') {
        normalizedIdentity = normalizeServerIdentity(serverIdentity);
        if (!normalizedIdentity) {
          return res.status(400).json({ success: false, message: 'Invalid server identity' });
        }

        const existingIdentity = await prisma.xtreamServer.findUnique({
          where: { serverIdentity: normalizedIdentity },
          select: { id: true }
        });
        if (existingIdentity && existingIdentity.id !== id) {
          return res.status(409).json({ success: false, message: 'Server identity already exists' });
        }
      }

      if (isDefault) {
        await prisma.xtreamServer.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false }
        });
      }

      const updated = await prisma.xtreamServer.update({
        where: { id },
        data: { name, url, isActive, isDefault, serverIdentity: normalizedIdentity }
      });

      const enriched = await enrichServer(updated);
      return res.json({ success: true, server: enriched });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to update server' });
    }
  },

  /**
   * Delete Xtream server
   */
  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      
      // Check if server is in use
      const inUseCount = await prisma.license.count({
        where: { serverId: id }
      });

      if (inUseCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete server that is currently assigned to licenses' 
        });
      }

      await prisma.xtreamServer.delete({ where: { id } });
      await removeServerOrder(id);
      return res.json({ success: true, message: 'Server deleted successfully' });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to delete server' });
    }
  },

  async checkHealth(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const server = await prisma.xtreamServer.findUnique({ where: { id } });
      if (!server) return res.status(404).json({ success: false, message: 'Server not found' });
      const enriched = await enrichServer(server);
      return res.json({ success: true, server: enriched });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to check server health' });
    }
  },

  async reorder(req: Request, res: Response) {
    try {
      const items = Array.isArray(req.body?.orders) ? req.body.orders : [];
      const normalized = items
        .map((it: { id: string | number; order: string | number }) => ({
          id: Number(it.id),
          order: Number(it.order),
        }))
        .filter((it: { id: number; order: number }) => Number.isFinite(it.id) && Number.isFinite(it.order));
      await setServerOrders(normalized);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to reorder servers' });
    }
  }
};

export default ServerController;
