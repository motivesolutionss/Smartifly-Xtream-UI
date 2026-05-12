import { Request, Response } from 'express';
import prisma from '../../config/database.js';

export const getSegments = async (req: Request, res: Response) => {
    try {
        const segments = await prisma.notificationSegment.findMany({
            orderBy: { createdAt: 'desc' },
            where: { isActive: true }
        });
        res.json(segments);
    } catch (error) {
        console.error('Get segments error:', error);
        res.status(500).json({ error: 'Failed to fetch segments' });
    }
};

export const createSegment = async (req: Request, res: Response) => {
    try {
        const { name, description, filters } = req.body;

        const segment = await prisma.notificationSegment.create({
            data: {
                name,
                description,
                filters: filters || {}
            }
        });

        res.status(201).json(segment);
    } catch (error) {
        console.error('Create segment error:', error);
        res.status(500).json({ error: 'Failed to create segment' });
    }
};

export const updateSegment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, filters, isActive } = req.body;

        const segment = await prisma.notificationSegment.update({
            where: { id },
            data: {
                name,
                description,
                filters: filters || {},
                isActive
            }
        });

        res.json(segment);
    } catch (error) {
        console.error('Update segment error:', error);
        res.status(500).json({ error: 'Failed to update segment' });
    }
};

export const deleteSegment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.notificationSegment.delete({
            where: { id }
        });
        res.json({ message: 'Segment deleted' });
    } catch (error) {
        console.error('Delete segment error:', error);
        res.status(500).json({ error: 'Failed to delete segment' });
    }
};
