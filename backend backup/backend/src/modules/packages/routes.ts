import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { validate, authMiddleware, AuthRequest } from '../../middleware/index.js';

const router = Router();

// Validation schemas
const packageSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        description: z.string().min(1),
        duration: z.string().min(1),
        price: z.number().positive(),
        currency: z.string().optional(),
        features: z.array(z.string()),
        isPopular: z.boolean().optional(),
        isActive: z.boolean().optional(),
        order: z.number().int().optional(),
        pricingTiers: z.array(z.object({
            minQuantity: z.number().int().positive(),
            maxQuantity: z.number().int().positive().nullable(),
            price: z.number().positive(),
            discount: z.number().min(0).max(100).nullable(),
        })).optional(),
    }),
});

const featureTemplateSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        features: z.array(z.string()),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
    }),
});

const packageIdParamsSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

const tierIdParamsSchema = z.object({
    params: z.object({
        tierId: z.string().uuid(),
    }),
});

const featureTemplateIdParamsSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

const updatePackageSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().min(1).optional(),
        duration: z.string().min(1).optional(),
        price: z.number().positive().optional(),
        currency: z.string().min(1).max(10).optional(),
        features: z.array(z.string()).optional(),
        isPopular: z.boolean().optional(),
        isActive: z.boolean().optional(),
        order: z.number().int().optional(),
    }).refine(
        (body) => Object.keys(body).length > 0,
        { message: 'At least one field must be provided for update' }
    ),
});

const duplicatePackageSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
    }),
});

const purchaseAnalyticsSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        amount: z.number().min(0).optional(),
    }),
});

const pricingTierCreateSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        minQuantity: z.number().int().positive(),
        maxQuantity: z.number().int().positive().nullable().optional(),
        price: z.number().positive(),
        discount: z.number().min(0).max(100).nullable().optional(),
    }),
});

const pricingTierUpdateSchema = z.object({
    params: z.object({
        tierId: z.string().uuid(),
    }),
    body: z.object({
        minQuantity: z.number().int().positive(),
        maxQuantity: z.number().int().positive().nullable().optional(),
        price: z.number().positive(),
        discount: z.number().min(0).max(100).nullable().optional(),
    }),
});

const featureTemplateUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        features: z.array(z.string()).optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
    }).refine(
        (body) => Object.keys(body).length > 0,
        { message: 'At least one field must be provided for update' }
    ),
});

// GET /api/packages - Public: Get active packages
router.get('/', async (req: Request, res: Response) => {
    try {
        const packages = await prisma.package.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
        });

        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get packages' });
    }
});

// GET /api/packages/admin - Admin: Get all packages
router.get('/admin', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const packages = await prisma.package.findMany({
            include: {
                pricingTiers: {
                    orderBy: { minQuantity: 'asc' },
                },
                analytics: true,
            },
            orderBy: { order: 'asc' },
        });

        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get packages' });
    }
});

// POST /api/packages - Admin: Create package
router.post('/', authMiddleware, validate(packageSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { pricingTiers, ...packageData } = req.body;

        const pkg = await prisma.package.create({
            data: {
                ...packageData,
                ...(pricingTiers && pricingTiers.length > 0 && {
                    pricingTiers: {
                        create: pricingTiers,
                    },
                }),
            },
            include: { pricingTiers: true },
        });

        res.status(201).json(pkg);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create package' });
    }
});

// PUT /api/packages/:id - Admin: Update package
router.put('/:id', authMiddleware, validate(updatePackageSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            duration,
            price,
            currency,
            features,
            isPopular,
            isActive,
            order,
        } = req.body;

        const pkg = await prisma.package.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(duration !== undefined && { duration }),
                ...(price !== undefined && { price }),
                ...(currency !== undefined && { currency }),
                ...(features !== undefined && { features }),
                ...(isPopular !== undefined && { isPopular }),
                ...(isActive !== undefined && { isActive }),
                ...(order !== undefined && { order }),
            },
        });

        res.json(pkg);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update package' });
    }
});

// DELETE /api/packages/:id - Admin: Delete package
router.delete('/:id', authMiddleware, validate(packageIdParamsSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.package.delete({ where: { id } });

        res.json({ message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete package' });
    }
});

// POST /api/packages/:id/duplicate - Admin: Duplicate package
router.post('/:id/duplicate', authMiddleware, validate(duplicatePackageSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const originalPackage = await prisma.package.findUnique({
            where: { id },
            include: { pricingTiers: true },
        });

        if (!originalPackage) {
            return res.status(404).json({ error: 'Package not found' });
        }

        const duplicatedPackage = await prisma.package.create({
            data: {
                name: name || `${originalPackage.name} (Copy)`,
                description: originalPackage.description,
                duration: originalPackage.duration,
                price: originalPackage.price,
                currency: originalPackage.currency,
                features: originalPackage.features as any,
                isPopular: false,
                isActive: false,
                order: originalPackage.order + 1,
                pricingTiers: {
                    create: originalPackage.pricingTiers.map(tier => ({
                        minQuantity: tier.minQuantity,
                        maxQuantity: tier.maxQuantity,
                        price: tier.price,
                        discount: tier.discount,
                    })),
                },
            },
            include: { pricingTiers: true },
        });

        res.status(201).json(duplicatedPackage);
    } catch (error) {
        res.status(500).json({ error: 'Failed to duplicate package' });
    }
});

// GET /api/packages/analytics - Admin: Get package analytics
router.get('/analytics', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const analytics = await prisma.packageAnalytics.findMany({
            include: {
                package: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        currency: true,
                    },
                },
            },
            orderBy: { revenue: 'desc' },
        });

        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// POST /api/packages/:id/analytics/view - Track package view
router.post('/:id/analytics/view', validate(packageIdParamsSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.packageAnalytics.upsert({
            where: { packageId: id },
            create: {
                packageId: id,
                views: 1,
                lastViewedAt: new Date(),
            },
            update: {
                views: { increment: 1 },
                lastViewedAt: new Date(),
            },
        });

        res.json({ message: 'View tracked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track view' });
    }
});

// POST /api/packages/:id/analytics/purchase - Track package purchase
router.post('/:id/analytics/purchase', validate(purchaseAnalyticsSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        await prisma.packageAnalytics.upsert({
            where: { packageId: id },
            create: {
                packageId: id,
                purchases: 1,
                revenue: amount || 0,
                lastPurchasedAt: new Date(),
            },
            update: {
                purchases: { increment: 1 },
                revenue: { increment: amount || 0 },
                lastPurchasedAt: new Date(),
            },
        });

        // Update conversion rate
        const analytics = await prisma.packageAnalytics.findUnique({
            where: { packageId: id },
        });

        if (analytics && analytics.views > 0) {
            await prisma.packageAnalytics.update({
                where: { packageId: id },
                data: {
                    conversionRate: (analytics.purchases / analytics.views) * 100,
                },
            });
        }

        res.json({ message: 'Purchase tracked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track purchase' });
    }
});

// === PRICING TIERS ===

// GET /api/packages/:id/tiers - Get pricing tiers for a package
router.get('/:id/tiers', validate(packageIdParamsSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const tiers = await prisma.pricingTier.findMany({
            where: { packageId: id },
            orderBy: { minQuantity: 'asc' },
        });

        res.json(tiers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get pricing tiers' });
    }
});

// POST /api/packages/:id/tiers - Create pricing tier
router.post('/:id/tiers', authMiddleware, validate(pricingTierCreateSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { minQuantity, maxQuantity, price, discount } = req.body;

        const tier = await prisma.pricingTier.create({
            data: {
                packageId: id,
                minQuantity,
                maxQuantity: maxQuantity || null,
                price,
                discount: discount || null,
            },
        });

        res.status(201).json(tier);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create pricing tier' });
    }
});

// PUT /api/packages/tiers/:tierId - Update pricing tier
router.put('/tiers/:tierId', authMiddleware, validate(pricingTierUpdateSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { tierId } = req.params;
        const { minQuantity, maxQuantity, price, discount } = req.body;

        const tier = await prisma.pricingTier.update({
            where: { id: tierId },
            data: {
                minQuantity,
                maxQuantity: maxQuantity || null,
                price,
                discount: discount || null,
            },
        });

        res.json(tier);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update pricing tier' });
    }
});

// DELETE /api/packages/tiers/:tierId - Delete pricing tier
router.delete('/tiers/:tierId', authMiddleware, validate(tierIdParamsSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { tierId } = req.params;

        await prisma.pricingTier.delete({ where: { id: tierId } });

        res.json({ message: 'Pricing tier deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete pricing tier' });
    }
});

// === FEATURE TEMPLATES ===

// GET /api/packages/feature-templates - Get all feature templates
router.get('/feature-templates', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const templates = await prisma.featureTemplate.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get feature templates' });
    }
});

// POST /api/packages/feature-templates - Create feature template
router.post('/feature-templates', authMiddleware, validate(featureTemplateSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, features, category, isActive } = req.body;
        const template = await prisma.featureTemplate.create({
            data: {
                name,
                ...(description !== undefined && { description }),
                features,
                ...(category !== undefined && { category }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create feature template' });
    }
});

// PUT /api/packages/feature-templates/:id - Update feature template
router.put('/feature-templates/:id', authMiddleware, validate(featureTemplateUpdateSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, features, category, isActive } = req.body;

        const template = await prisma.featureTemplate.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(features !== undefined && { features }),
                ...(category !== undefined && { category }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update feature template' });
    }
});

// DELETE /api/packages/feature-templates/:id - Delete feature template
router.delete('/feature-templates/:id', authMiddleware, validate(featureTemplateIdParamsSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.featureTemplate.delete({ where: { id } });

        res.json({ message: 'Feature template deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete feature template' });
    }
});

export default router;
