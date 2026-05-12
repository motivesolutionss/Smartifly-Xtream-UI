import { Request, Response } from 'express';
import prisma from '../../config/database.js';

export const getTemplates = async (req: Request, res: Response) => {
    try {
        const templates = await prisma.notificationTemplate.findMany({
            orderBy: { createdAt: 'desc' },
            where: { isActive: true }
        });
        res.json(templates);
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

export const createTemplate = async (req: Request, res: Response) => {
    try {
        const { name, title, body, data, imageUrl, deepLink, category } = req.body;

        const template = await prisma.notificationTemplate.create({
            data: {
                name,
                title,
                body,
                data: data || {},
                imageUrl,
                deepLink,
                category
            }
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
};

export const updateTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, title, body, data, imageUrl, deepLink, category, isActive } = req.body;

        const template = await prisma.notificationTemplate.update({
            where: { id },
            data: {
                name,
                title,
                body,
                data: data || {},
                imageUrl,
                deepLink,
                category,
                isActive
            }
        });

        res.json(template);
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
};

export const deleteTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.notificationTemplate.delete({
            where: { id }
        });
        res.json({ message: 'Template deleted' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
};
