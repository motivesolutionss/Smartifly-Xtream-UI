import { Request, Response } from 'express';
import prisma from '../../config/database.js';

export const createAnnouncement = async (req: Request, res: Response) => {
    try {
        const { title, content, type, priority, status, audience, scheduledAt, expiresAt } = req.body;

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                type, // INFO, WARNING, MAINTENANCE, UPDATE
                priority, // LOW, NORMAL, URGENT
                status, // DRAFT, PUBLISHED, ARCHIVED
                audience: audience ? JSON.stringify(audience) : null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isActive: true
            }
        });

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
};

export const getAnnouncements = async (req: Request, res: Response) => {
    try {
        const { status, type } = req.query;

        const where: any = { isActive: true };
        if (status) where.status = status;
        if (type) where.type = type;

        const announcements = await prisma.announcement.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

export const getPublicAnnouncements = async (req: Request, res: Response) => {
    try {
        const { type } = req.query;
        const now = new Date();

        const where: any = {
            isActive: true,
            status: 'PUBLISHED',
            OR: [
                { scheduledAt: null },
                { scheduledAt: { lte: now } },
            ],
            AND: [
                {
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: now } },
                    ],
                },
            ],
        };
        if (type) where.type = type;

        const announcements = await prisma.announcement.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

export const getAnnouncement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const announcement = await prisma.announcement.findUnique({
            where: { id }
        });

        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        res.json(announcement);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcement' });
    }
};

export const getPublicAnnouncement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const now = new Date();

        const announcement = await prisma.announcement.findFirst({
            where: {
                id,
                isActive: true,
                status: 'PUBLISHED',
                OR: [
                    { scheduledAt: null },
                    { scheduledAt: { lte: now } },
                ],
                AND: [
                    {
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: now } },
                        ],
                    },
                ],
            }
        });

        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        res.json(announcement);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcement' });
    }
};

export const updateAnnouncement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, type, priority, status, audience, scheduledAt, expiresAt, isActive } = req.body;

        const announcement = await prisma.announcement.update({
            where: { id },
            data: {
                title,
                content,
                type,
                priority,
                status,
                audience: audience ? JSON.stringify(audience) : undefined,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                isActive
            }
        });

        res.json(announcement);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update announcement' });
    }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.announcement.delete({
            where: { id }
        });
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
};

export const trackView = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.announcement.update({
            where: { id },
            data: {
                views: { increment: 1 }
            }
        });
        res.json({ message: 'View tracked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track view' });
    }
};

/**
 * Background Task: Process scheduled announcements
 * - Publishes DRAFT announcements when scheduledAt is reached
 * - Archives PUBLISHED announcements when expiresAt is reached
 */
export const processScheduledAnnouncements = async () => {
    const now = new Date();

    // 1. Publish scheduled drafts
    const toPublish = await prisma.announcement.updateMany({
        where: {
            status: 'DRAFT',
            scheduledAt: { lte: now },
            isActive: true
        },
        data: {
            status: 'PUBLISHED',
            updatedAt: now
        }
    });



    // 2. Archive expired announcements
    const toArchive = await prisma.announcement.updateMany({
        where: {
            status: 'PUBLISHED',
            expiresAt: { lte: now },
            isActive: true
        },
        data: {
            status: 'ARCHIVED',
            updatedAt: now
        }
    });



    return { published: toPublish.count, archived: toArchive.count };
};
