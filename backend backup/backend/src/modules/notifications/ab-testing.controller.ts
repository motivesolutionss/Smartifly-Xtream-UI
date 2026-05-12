import { Request, Response } from 'express';
import prisma from '../../config/database.js';

export const getABTests = async (req: Request, res: Response) => {
    try {
        const tests = await prisma.aBTest.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(tests);
    } catch (error) {
        console.error('Get A/B tests error:', error);
        res.status(500).json({ error: 'Failed to fetch A/B tests' });
    }
};

export const createABTest = async (req: Request, res: Response) => {
    try {
        const { name, variants, startDate, endDate } = req.body;

        const test = await prisma.aBTest.create({
            data: {
                name,
                variants: variants || [],
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                status: 'DRAFT'
            }
        });

        res.status(201).json(test);
    } catch (error) {
        console.error('Create A/B test error:', error);
        res.status(500).json({ error: 'Failed to create A/B test' });
    }
};

export const updateABTest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, variants, startDate, endDate, status } = req.body;

        const test = await prisma.aBTest.update({
            where: { id },
            data: {
                name,
                variants,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status
            }
        });

        res.json(test);
    } catch (error) {
        console.error('Update A/B test error:', error);
        res.status(500).json({ error: 'Failed to update A/B test' });
    }
};

export const deleteABTest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.aBTest.delete({
            where: { id }
        });
        res.json({ message: 'A/B test deleted' });
    } catch (error) {
        console.error('Delete A/B test error:', error);
        res.status(500).json({ error: 'Failed to delete A/B test' });
    }
};
