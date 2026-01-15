
import { Request, Response } from 'express';
import prisma from '../../config/database.js';
import { AuthRequest } from '../../middleware';
import { createAuditLog } from './audit-logs.controller';

export const getMaintenanceWindows = async (req: Request, res: Response) => {
    try {
        const windows = await prisma.maintenanceWindow.findMany({
            orderBy: { startTime: 'desc' }
        });
        res.json(windows);
    } catch (error) {
        console.error('Get maintenance windows error:', error);
        res.status(500).json({ error: 'Failed to fetch maintenance windows' });
    }
};

export const createMaintenanceWindow = async (req: AuthRequest, res: Response) => {
    try {
        const { startTime, endTime, reason } = req.body;

        const window = await prisma.maintenanceWindow.create({
            data: {
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                reason,
                status: 'SCHEDULED'
            }
        });

        await createAuditLog('SCHEDULE', 'MaintenanceWindow', req.adminId || 'system', {
            id: window.id,
            startTime: window.startTime,
            endTime: window.endTime
        }, req.ip);

        res.json(window);
    } catch (error) {
        console.error('Create maintenance window error:', error);
        res.status(500).json({ error: 'Failed to schedule maintenance' });
    }
};

export const updateMaintenanceStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // SCHEDULED, ACTIVE, COMPLETED, CANCELLED

        const window = await prisma.maintenanceWindow.update({
            where: { id },
            data: { status }
        });

        // If active, we might want to also set the global AppSettings.maintenanceMode = true
        if (status === 'ACTIVE') {
            await prisma.appSettings.upsert({
                where: { id: 'main' },
                update: { maintenanceMode: true, maintenanceMsg: window.reason },
                create: { maintenanceMode: true, maintenanceMsg: window.reason }
            });
        }

        // If completed/cancelled, turn off main mode IF it was the one active? 
        // Logic simplified: Just logging it for now, admin can manually toggle if needed, or we auto-toggle.
        // Let's auto-toggle OFF if completed.
        if (status === 'COMPLETED' || status === 'CANCELLED') {
            await prisma.appSettings.updateMany({
                where: { id: 'main' },
                data: { maintenanceMode: false }
            });
        }

        await createAuditLog('UPDATE_STATUS', 'MaintenanceWindow', req.adminId || 'system', {
            id: window.id,
            newStatus: status
        }, req.ip);

        res.json(window);
    } catch (error) {
        console.error('Update maintenance status error:', error);
        res.status(500).json({ error: 'Failed to update maintenance status' });
    }
};

export const deleteMaintenanceWindow = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const window = await prisma.maintenanceWindow.delete({ where: { id } });

        await createAuditLog('DELETE', 'MaintenanceWindow', req.adminId || 'system', {
            id: window.id
        }, req.ip);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete maintenance window error:', error);
        res.status(500).json({ error: 'Failed to delete maintenance window' });
    }
};
