import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database.js';
import { config } from '../../config/index.js';
import { validate, authMiddleware, AuthRequest } from '../../middleware/index.js';

const router = Router();

// Validation schemas
const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(1),
    }),
});

const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
    }),
});

const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1),
    }),
});

// Helper: Generate tokens
const generateTokens = async (adminId: string) => {
    // Access token (short-lived)
    const accessToken = jwt.sign(
        { adminId },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    // Refresh token (long-lived, stored in DB)
    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
        data: {
            token: refreshTokenValue,
            adminId,
            expiresAt,
        },
    });

    return { accessToken, refreshToken: refreshTokenValue };
};

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const admin = await prisma.admin.findUnique({ where: { email } });

        // If email doesn't exist, check if password is also clearly invalid
        if (!admin) {
            // Try to see if the password would fail for ANY user (e.g., too short, empty after trim)
            const trimmedPassword = password.trim();
            const isPasswordWeak = trimmedPassword.length < 6;

            // If both are wrong (email doesn't exist AND password is weak), return generic error
            if (isPasswordWeak) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Only email is wrong, password looks reasonable
            return res.status(401).json({ error: 'Invalid email' });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // Generate both access and refresh tokens
        const tokens = await generateTokens(admin.id);

        res.json({
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: 'Server error occurred. Please try again.' });
    }
});

// POST /api/auth/refresh - Get new access token using refresh token
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        // Find the refresh token in DB
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { admin: true },
        });

        if (!storedToken) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Check if token is expired
        if (new Date() > storedToken.expiresAt) {
            // Delete expired token
            await prisma.refreshToken.delete({ where: { id: storedToken.id } });
            return res.status(401).json({ error: 'Refresh token expired' });
        }

        // Delete old refresh token (rotation)
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });

        // Generate new tokens
        const tokens = await generateTokens(storedToken.adminId);

        res.json({
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// POST /api/auth/logout - Invalidate refresh token
router.post('/logout', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Delete the refresh token from DB
            await prisma.refreshToken.delete({
                where: { token: refreshToken },
            }).catch(() => {
                // Ignore if token doesn't exist
            });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: req.adminId },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        res.json(admin);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, validate(changePasswordSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const admin = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password and invalidate ALL refresh tokens (logout everywhere)
        await prisma.$transaction([
            prisma.admin.update({
                where: { id: req.adminId },
                data: { password: hashedPassword },
            }),
            prisma.refreshToken.deleteMany({
                where: { adminId: req.adminId },
            }),
        ]);

        // Generate new tokens for current session
        const tokens = await generateTokens(admin.id);

        res.json({
            message: 'Password updated successfully',
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

export default router;
