import { Router } from 'express';
import authRoutes from './auth.js';
import { customerAuthMiddleware } from '../../middleware/index.js';
import prisma from '../../config/database.js';

const router = Router();

// Public auth routes
router.use('/auth', authRoutes);

// Protected routes (require customer login)
router.get('/me', customerAuthMiddleware, async (req: any, res: any) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.customerId },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                status: true,
                createdAt: true
            }
        });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

export default router;
