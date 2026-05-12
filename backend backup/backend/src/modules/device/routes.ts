import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database.js';
import { config } from '../../config/index.js';
import { validate } from '../../middleware/index.js';

const router = Router();

// Validation schemas
const qrRequestSchema = z.object({
    body: z.object({
        deviceId: z.string().min(1),
        mac: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
    }),
});

const statusRequestSchema = z.object({
    query: z.object({
        deviceId: z.string().min(1),
    }),
});

/**
 * Helper: Generate human-readable settings code (e.g. 8F4K-29)
 */
const generateSettingsCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const segment2 = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${segment1}-${segment2}`;
};

/**
 * POST /api/device/qr
 * Fetch or create an activation session for a TV device
 */
router.post('/qr', validate(qrRequestSchema), async (req: Request, res: Response) => {
    try {
        const { deviceId, mac, brand, model } = req.body;

        // 1. Ensure device exists or create it
        let device = await prisma.tVDevice.findUnique({
            where: { deviceId }
        });

        if (!device) {
            device = await prisma.tVDevice.create({
                data: { deviceId, mac, brand, model, status: 'PENDING' }
            });
        } else {
            // Update last seen and info
            await prisma.tVDevice.update({
                where: { id: device.id },
                data: { lastSeenAt: new Date(), brand, model, mac }
            });
        }

        // 2. Clear old pending sessions for this device
        await prisma.tVActivationSession.deleteMany({
            where: { deviceId: device.id, isActivated: false }
        });

        // 3. Create fresh activation session
        const settingsCode = generateSettingsCode();
        const token = uuidv4();
        const expiresIn = 3600; // 1 hour
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

        const session = await prisma.tVActivationSession.create({
            data: {
                deviceId: device.id,
                settingsCode,
                token,
                expiresAt
            }
        });

        // 4. Return the session info to the TV
        // The QR code data is the registration URL with the session token
        const webLink = `${config.frontendUrl}/activate?token=${token}`;
        
        res.json({
            success: true,
            qrCode: webLink, // The TV app will render this as a QR
            webLink: webLink,
            token: token,
            settingsCode: settingsCode,
            expiresIn: expiresIn
        });

    } catch (error) {
        console.error('Device QR error:', error);
        res.status(500).json({ error: 'Failed to generate activation session' });
    }
});

/**
 * GET /api/device/check
 * Check if the device is activated/bound
 */
router.get('/check', validate(statusRequestSchema), async (req: Request, res: Response) => {
    try {
        const { deviceId } = req.query as { deviceId: string };

        const device = await prisma.tVDevice.findUnique({
            where: { deviceId },
            include: {
                activationSessions: {
                    where: { isActivated: true },
                    orderBy: { activatedAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!device) {
            return res.status(404).json({ state: 'NOT_FOUND' });
        }

        if (device.status === 'BLOCKED') {
            return res.json({ state: 'BLOCKED' });
        }

        // Check if there is a successful activation session
        if (device.activationSessions.length > 0) {
            return res.json({
                state: 'ACTIVE',
                customerId: device.customerId
            });
        }

        return res.json({ state: 'PENDING' });

    } catch (error) {
        console.error('Device check error:', error);
        res.status(500).json({ error: 'Failed to check device status' });
    }
});

/**
 * POST /api/device/activate (Public - for web portal)
 * Link a settings code to a customer account
 */
router.post('/activate', async (req: Request, res: Response) => {
    try {
        const { settingsCode, customerId } = req.body;

        const session = await prisma.tVActivationSession.findUnique({
            where: { settingsCode },
            include: { device: true }
        });

        if (!session || session.isActivated || new Date() > session.expiresAt) {
            return res.status(400).json({ error: 'Invalid or expired activation code' });
        }

        // 1. Link the device to the customer
        await prisma.tVDevice.update({
            where: { id: session.deviceId },
            data: { 
                customerId,
                status: 'ACTIVE'
            }
        });

        // 2. Mark session as activated
        await prisma.tVActivationSession.update({
            where: { id: session.id },
            data: { 
                isActivated: true,
                activatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Device activated successfully' });

    } catch (error) {
        console.error('Manual activation error:', error);
        res.status(500).json({ error: 'Failed to activate device' });
    }
});

export default router;
