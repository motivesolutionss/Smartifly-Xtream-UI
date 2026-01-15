import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { config } from '../../config/index.js';
import { validate, authMiddleware, AuthRequest } from '../../middleware/index.js';
import { notifyInvalidation } from '../../socket.js';

const router = Router();

// Validation schemas
const portalSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        url: z.string().url(),
        username: z.string().optional(),
        password: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        serverIp: z.string().optional(),
        order: z.number().int().optional(),
        isActive: z.boolean().optional(),
    }),
});

const updatePortalSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        url: z.string().url().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        serverIp: z.string().optional(),
        order: z.number().int().optional(),
        isActive: z.boolean().optional(),
    }),
});

// GET /api/portals - Public: Get active portals for app
router.get('/', async (req: Request, res: Response) => {
    try {
        const portals = await prisma.portal.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                url: true,
                username: true,
                password: true,
                order: true,
            },
            orderBy: { order: 'asc' },
        });

        res.json(portals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get portals' });
    }
});

// GET /api/portals/admin - Admin: Get all portals
router.get('/admin', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const portals = await prisma.portal.findMany({
            orderBy: { order: 'asc' },
        });

        res.json(portals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get portals' });
    }
});

// POST /api/portals - Admin: Create portal
router.post('/', authMiddleware, validate(portalSchema), async (req: AuthRequest, res: Response) => {
    try {
        // Check max portals limit
        const count = await prisma.portal.count();
        if (count >= config.maxPortals) {
            return res.status(400).json({
                error: `Maximum ${config.maxPortals} portals allowed`
            });
        }

        const portal = await prisma.portal.create({
            data: req.body,
        });

        notifyInvalidation(['portals']);
        res.status(201).json(portal);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create portal' });
    }
});

// PUT /api/portals/:id - Admin: Update portal
router.put('/:id', authMiddleware, validate(updatePortalSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const portal = await prisma.portal.update({
            where: { id },
            data: req.body,
        });

        notifyInvalidation(['portals']);
        res.json(portal);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update portal' });
    }
});

// DELETE /api/portals/:id - Admin: Delete portal
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.portal.delete({ where: { id } });

        notifyInvalidation(['portals']);
        res.json({ message: 'Portal deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete portal' });
    }
});

// PUT /api/portals/reorder - Admin: Reorder portals
router.put('/reorder', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { orders } = req.body as { orders: { id: string; order: number }[] };

        await Promise.all(
            orders.map((item) =>
                prisma.portal.update({
                    where: { id: item.id },
                    data: { order: item.order },
                })
            )
        );

        notifyInvalidation(['portals']);
        res.json({ message: 'Portals reordered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reorder portals' });
    }
});

// POST /api/portals/:id/check-health - Admin: Check portal health
router.post('/:id/check-health', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const portal = await prisma.portal.findUnique({ where: { id } });

        if (!portal) {
            return res.status(404).json({ error: 'Portal not found' });
        }

        const start = Date.now();
        let status = 'OFFLINE';
        let latency = 0;
        let resolvedIp: string | null = null;
        let errorCount = portal.errorCount || 0;

        try {
            // Extract hostname from URL for IP resolution
            const url = new URL(portal.url);
            const hostname = url.hostname;

            // Resolve IP address using DNS
            const dns = await import('dns').then(m => m.promises);
            try {
                const addresses = await dns.lookup(hostname);
                resolvedIp = addresses.address;
            } catch {
                // IP resolution failed, continue with health check
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(portal.url, {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            latency = Date.now() - start;
            status = response.ok ? 'ONLINE' : 'UNSTABLE';
            // Reset error count on success
            errorCount = 0;
        } catch (error) {
            status = 'OFFLINE';
            // Increment error count on failure
            errorCount = errorCount + 1;
        }

        const updatedPortal = await prisma.portal.update({
            where: { id },
            data: {
                healthStatus: status,
                latency: status === 'OFFLINE' ? null : latency,
                lastCheckAt: new Date(),
                uptime: status === 'ONLINE' ? 100 : 0,
                serverIp: resolvedIp,
                errorCount: errorCount,
            },
        });

        notifyInvalidation(['portals']);
        res.json(updatedPortal);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check portal health' });
    }
});

// POST /api/portals/bulk-actions - Admin: Bulk operations
router.post('/bulk-actions', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { ids, action } = req.body as { ids: string[]; action: 'enable' | 'disable' | 'delete' | 'check-health' };

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No portal IDs provided' });
        }

        switch (action) {
            case 'enable':
                await prisma.portal.updateMany({
                    where: { id: { in: ids } },
                    data: { isActive: true },
                });
                break;
            case 'disable':
                await prisma.portal.updateMany({
                    where: { id: { in: ids } },
                    data: { isActive: false },
                });
                break;
            case 'delete':
                await prisma.portal.deleteMany({
                    where: { id: { in: ids } },
                });
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        notifyInvalidation(['portals']);
        res.json({ message: `Bulk action '${action}' completed successfully` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to perform bulk action' });
    }
});

// POST /api/portals/import - Admin: Import portals
router.post('/import', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { portals } = req.body as { portals: any[] };

        if (!Array.isArray(portals)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        // Validate constraint: Check current count
        const currentCount = await prisma.portal.count();
        if (currentCount + portals.length > config.maxPortals) {
            return res.status(400).json({
                error: `Import would exceed maximum ${config.maxPortals} portals limit`
            });
        }

        const created = await Promise.all(
            portals.map(p => prisma.portal.create({
                data: {
                    name: p.name,
                    url: p.url,
                    username: p.username,
                    password: p.password,
                    category: p.category || 'General',
                    description: p.description,
                    order: 99, // Append to end
                }
            }))
        );

        notifyInvalidation(['portals']);
        res.status(201).json({ message: `Imported ${created.length} portals`, data: created });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to import portals' });
    }
});

export default router;
