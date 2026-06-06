import { Router } from 'express';
import { prisma } from '../../prisma';

const router = Router();

function isLegacyKidsProfile(profile: { id?: string | null; name?: string | null }) {
    const id = profile.id?.trim().toLowerCase() ?? '';
    const name = profile.name?.trim().toLowerCase() ?? '';
    return id.endsWith('_kids') || name === 'kids';
}

/**
 * GET /public/profiles?userId=1
 * List all profiles for a given account
 */
router.get('/', async (req, res) => {
    const userId = Number(req.query.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ success: false, message: 'userId is required' });
    }
    try {
        const profiles = (await prisma.profile.findMany({
            where: { userId },
            orderBy: { lastUsed: 'desc' }
        })).filter(profile => !isLegacyKidsProfile(profile));

        // If no profiles exist, create a default "Admin" one
        if (profiles.length === 0) {
            const defaultProfile = await prisma.profile.create({
                data: {
                    userId,
                    name: "Admin",
                    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"
                }
            });
            return res.json({ success: true, data: [defaultProfile] });
        }

        res.json({ success: true, data: profiles });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

/**
 * POST /public/profiles/create
 * Create a new profile
 */
router.post('/create', async (req, res) => {
    const { userId, name, avatarUrl, pin } = req.body;
    try {
        const count = await prisma.profile.count({ where: { userId: Number(userId) } });
        
        if (count >= 5) {
            return res.status(400).json({ 
                success: false, 
                message: "Profile limit reached. You can only have up to 5 profiles per account." 
            });
        }

        const profile = await prisma.profile.create({
            data: {
                userId: Number(userId),
                name,
                avatarUrl,
                pin
            }
        });
        res.json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

/**
 * POST /public/profiles/select
 * Update lastUsed timestamp
 */
router.post('/select', async (req, res) => {
    const { profileId } = req.body;
    if (typeof profileId !== 'string' || !profileId.trim()) {
        return res.status(400).json({ success: false, message: 'profileId is required' });
    }
    try {
        const existing = await prisma.profile.findUnique({
            where: { id: profileId }
        });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const profile = await prisma.profile.update({
            where: { id: profileId },
            data: { lastUsed: new Date() }
        });
        res.json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

/**
 * PUT /public/profiles/update
 * Update profile details (Name, Avatar, PIN)
 */
router.put('/update', async (req, res) => {
    const { profileId, name, avatarUrl, pin } = req.body;
    try {
        const profile = await prisma.profile.update({
            where: { id: profileId },
            data: {
                name,
                avatarUrl,
                pin: pin === "" ? null : pin // Clear pin if empty string provided
            }
        });
        res.json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

export default router;
