
import { Request, Response } from 'express';
import prisma from '../../config/database.js';

export const createAuditLog = async (
    action: string,
    resource: string,
    adminId: string,
    details: any,
    ipAddress?: string
) => {
    try {
        await prisma.systemAuditLog.create({
            data: {
                action,
                resource,
                adminId,
                details: details || {},
                ipAddress: ipAddress || 'unknown'
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw, just log error so main action doesn't fail
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const logs = await prisma.systemAuditLog.findMany({
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            // include: { admin: true } // Assuming we might link relation later if Admin model exists and matches
        });

        const total = await prisma.systemAuditLog.count();

        res.json({
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};
