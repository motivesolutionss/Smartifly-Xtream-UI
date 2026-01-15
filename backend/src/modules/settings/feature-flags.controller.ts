
import { Request, Response } from 'express';
import prisma from '../../config/database.js';
import { AuthRequest } from '../../middleware';
import { createAuditLog } from './audit-logs.controller';

export const getFeatureFlags = async (req: Request, res: Response) => {
    try {
        const flags = await prisma.featureFlag.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(flags);
    } catch (error) {
        console.error('Get feature flags error:', error);
        res.status(500).json({ error: 'Failed to fetch feature flags' });
    }
};

export const createFeatureFlag = async (req: AuthRequest, res: Response) => {
    try {
        const { key, name, description, isEnabled } = req.body;

        const flag = await prisma.featureFlag.create({
            data: { key, name, description, isEnabled }
        });

        await createAuditLog('CREATE', 'FeatureFlag', req.adminId || 'system', {
            id: flag.id,
            key: flag.key,
            name: flag.name
        }, req.ip);

        res.json(flag);
    } catch (error) {
        console.error('Create feature flag error:', error);
        res.status(500).json({ error: 'Failed to create feature flag' });
    }
};

export const updateFeatureFlag = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, isEnabled } = req.body;

        const original = await prisma.featureFlag.findUnique({ where: { id } });

        const flag = await prisma.featureFlag.update({
            where: { id },
            data: { name, description, isEnabled }
        });

        await createAuditLog('UPDATE', 'FeatureFlag', req.adminId || 'system', {
            id: flag.id,
            original,
            updated: flag
        }, req.ip);

        res.json(flag);
    } catch (error) {
        console.error('Update feature flag error:', error);
        res.status(500).json({ error: 'Failed to update feature flag' });
    }
};

export const toggleFeatureFlag = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const flag = await prisma.featureFlag.findUnique({ where: { id } });

        if (!flag) {
            return res.status(404).json({ error: 'Feature flag not found' });
        }

        const updated = await prisma.featureFlag.update({
            where: { id },
            data: { isEnabled: !flag.isEnabled }
        });

        await createAuditLog('TOGGLE', 'FeatureFlag', req.adminId || 'system', {
            id: flag.id,
            key: flag.key,
            oldValue: flag.isEnabled,
            newValue: updated.isEnabled
        }, req.ip);

        res.json(updated);
    } catch (error) {
        console.error('Toggle feature flag error:', error);
        res.status(500).json({ error: 'Failed to toggle feature flag' });
    }
};

export const deleteFeatureFlag = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const flag = await prisma.featureFlag.delete({ where: { id } });

        await createAuditLog('DELETE', 'FeatureFlag', req.adminId || 'system', {
            id: flag.id,
            key: flag.key
        }, req.ip);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete feature flag error:', error);
        res.status(500).json({ error: 'Failed to delete feature flag' });
    }
};
