import { Router } from 'express';
import { prisma } from '../../prisma';

const router = Router();

// Get the current active theme
router.get('/', async (req, res) => {
    try {
        const theme = await prisma.themeConfig.findFirst({
            where: { isLive: true },
            orderBy: { updatedAt: 'desc' }
        });
        
        // Return default if no theme configured
        res.json({
            success: true,
            data: theme || {
                primaryColor: "#E50914",
                secondaryColor: "#0D1117",
                accentColor: "#FFFFFF",
                logoUrl: null,
                backgroundUrl: null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Admin endpoint to update theme (Simulated)
router.post('/update', async (req, res) => {
    const { primaryColor, secondaryColor, accentColor, logoUrl, backgroundUrl } = req.body;
    try {
        const theme = await prisma.themeConfig.create({
            data: {
                primaryColor,
                secondaryColor,
                accentColor,
                logoUrl,
                backgroundUrl,
                isLive: true
            }
        });
        res.json({ success: true, data: theme });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

export default router;
