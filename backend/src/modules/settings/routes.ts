import { Router, Request, Response } from 'express';
import prisma from '../../config/database.js';
import { authMiddleware, AuthRequest, validate } from '../../middleware/index.js';
import * as featureFlags from './feature-flags.controller';
import * as maintenance from './maintenance.controller';
import * as backups from './backups.controller';
import * as auditLogs from './audit-logs.controller';
import { createAuditLog } from './audit-logs.controller';
import { z } from 'zod';


const updateSettingsSchema = z.object({
    body: z.object({
        maintenanceMode: z.boolean().optional(),
        maintenanceMsg: z.string().optional().nullable(),
        latestVersion: z.string().optional(),
        minVersion: z.string().optional(),
        updateUrl: z.string().url().optional().nullable(),
        forceUpdate: z.boolean().optional(),
        contactEmail: z.string().email().optional().nullable(),
        contactPhone: z.string().optional().nullable(),
        aboutText: z.string().optional().nullable(),
        termsUrl: z.string().url().optional().nullable(),
        privacyUrl: z.string().url().optional().nullable(),
        // Bank details for manual payments
        bankName: z.string().optional().nullable(),
        accountTitle: z.string().optional().nullable(),
        accountNumber: z.string().optional().nullable(),
        iban: z.string().optional().nullable(),
        paymentInstructions: z.string().optional().nullable(),
    }),
});

const router = Router();

// GET /api/settings - Public: Get app settings
router.get('/', async (req: Request, res: Response) => {
    try {
        let settings = await prisma.appSettings.findFirst({
            where: { id: 'main' },
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await prisma.appSettings.create({
                data: { id: 'main' },
            });
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// PUT /api/settings - Admin: Update settings
router.put('/', authMiddleware, validate(updateSettingsSchema), async (req: AuthRequest, res: Response) => {
    try {
        const current = await prisma.appSettings.findUnique({ where: { id: 'main' } });

        const settings = await prisma.appSettings.upsert({
            where: { id: 'main' },
            update: req.body,
            create: { id: 'main', ...req.body },
        });

        await createAuditLog('UPDATE', 'AppSettings', req.adminId || 'system', {
            original: current,
            updated: settings,
            changes: req.body
        }, req.ip);

        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// GET /api/settings/maintenance - Public: Check maintenance status
router.get('/maintenance', async (req: Request, res: Response) => {
    try {
        const settings = await prisma.appSettings.findFirst({
            where: { id: 'main' },
            select: { maintenanceMode: true, maintenanceMsg: true },
        });

        res.json({
            maintenance: settings?.maintenanceMode || false,
            message: settings?.maintenanceMsg || null,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check maintenance status' });
    }
});

// GET /api/settings/version - Public: Check app version
router.get('/version', async (req: Request, res: Response) => {
    try {
        const settings = await prisma.appSettings.findFirst({
            where: { id: 'main' },
            select: { latestVersion: true, minVersion: true, updateUrl: true, forceUpdate: true },
        });

        res.json({
            latestVersion: settings?.latestVersion || '1.0.0',
            minVersion: settings?.minVersion || '1.0.0',
            updateUrl: settings?.updateUrl || null,
            forceUpdate: settings?.forceUpdate || false,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get version info' });
    }
});

// FEATURE FLAGS
router.get('/flags', authMiddleware, featureFlags.getFeatureFlags);
router.post('/flags', authMiddleware, featureFlags.createFeatureFlag);
router.patch('/flags/:id', authMiddleware, featureFlags.updateFeatureFlag);
router.delete('/flags/:id', authMiddleware, featureFlags.deleteFeatureFlag);
router.post('/flags/:id/toggle', authMiddleware, featureFlags.toggleFeatureFlag);

// MAINTENANCE
router.get('/maintenance-windows', authMiddleware, maintenance.getMaintenanceWindows);
router.post('/maintenance-windows', authMiddleware, maintenance.createMaintenanceWindow);
router.patch('/maintenance-windows/:id/status', authMiddleware, maintenance.updateMaintenanceStatus);
router.delete('/maintenance-windows/:id', authMiddleware, maintenance.deleteMaintenanceWindow);

// BACKUPS
router.get('/backups', authMiddleware, backups.getBackups);
router.post('/backups', authMiddleware, backups.createBackup);
router.post('/backups/:id/restore', authMiddleware, backups.restoreBackup);
router.get('/backups/:filename/download', backups.downloadBackup);

// AUDIT LOGS
router.get('/audit-logs', authMiddleware, auditLogs.getAuditLogs);

export default router;
