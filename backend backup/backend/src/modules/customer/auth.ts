import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { config } from '../../config/index.js';
import { validate } from '../../middleware/index.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
    body: z.object({
        username: z.string().min(3),
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().optional(),
    }),
});

const loginSchema = z.object({
    body: z.object({
        emailOrUsername: z.string().min(1),
        password: z.string().min(1),
    }),
});

// Helper: Generate tokens for customer
const generateCustomerTokens = async (customerId: string) => {
    const accessToken = jwt.sign(
        { customerId, role: 'customer', tokenType: 'access' },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Customers get 30 days refresh

    await prisma.customerRefreshToken.create({
        data: {
            token: refreshTokenValue,
            customerId,
            expiresAt,
        },
    });

    return { accessToken, refreshToken: refreshTokenValue };
};

/**
 * POST /api/customer/register
 */
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
    try {
        const { username, email, password, fullName } = req.body;

        const existing = await prisma.customer.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existing) {
            return res.status(400).json({ error: 'Email or username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const customer = await prisma.customer.create({
            data: {
                username,
                email,
                password: hashedPassword,
                fullName,
                status: 'ACTIVE'
            }
        });

        const tokens = await generateCustomerTokens(customer.id);

        res.status(201).json({
            message: 'Registration successful',
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: customer.id,
                username: customer.username,
                email: customer.email,
                fullName: customer.fullName
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/customer/login
 */
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
    try {
        const { emailOrUsername, password } = req.body;

        const customer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { email: emailOrUsername },
                    { username: emailOrUsername }
                ]
            }
        });

        if (!customer) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, customer.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (customer.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account is suspended or pending' });
        }

        const tokens = await generateCustomerTokens(customer.id);
        
        // Update last login
        await prisma.customer.update({
            where: { id: customer.id },
            data: { lastLoginAt: new Date() }
        });

        res.json({
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: customer.id,
                username: customer.username,
                email: customer.email,
                fullName: customer.fullName
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

export default router;
