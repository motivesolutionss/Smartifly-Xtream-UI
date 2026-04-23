import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import prisma from '../../config/database.js';
import { validate } from '../../middleware/index.js';
import { sendVerificationEmail, sendSubscriptionPDF } from '../../utils/email.js';
import { generateSubscriptionPDF } from '../../utils/pdf.js';

const router = Router();

// Validation schemas
const createSubscriptionRequestSchema = z.object({
    body: z.object({
        packageId: z.string().min(1, 'Package ID is required'),
        fullName: z.string().min(1, 'Full name is required').max(100, 'Full name is too long'),
        email: z.string().email('Invalid email address'),
        phoneNumber: z.string().min(5, 'Phone number is required').max(20, 'Phone number is too long'),
    }),
});

// Helper function to sanitize input
function sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
}

// Validation schema for lookup
const lookupSchema = z.object({
    query: z.object({
        email: z.string().email('Invalid email address'),
    }),
});

const subscriptionLookupLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many lookup attempts. Please try again in 10 minutes.' },
});

const subscriptionRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many subscription requests. Please try again later.' },
});

const subscriptionVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many verification attempts. Please try again later.' },
});

// GET /api/subscriptions/lookup - Lookup subscription request by email (public endpoint)
router.get('/lookup', subscriptionLookupLimiter, validate(lookupSchema), async (req: Request, res: Response) => {
    try {
        const email = (req.query.email as string).toLowerCase().trim();

        // Find the most recent subscription request for this email
        const subscriptionRequest = await prisma.subscriptionRequest.findFirst({
            where: {
                email: email,
                isEmailVerified: true, // Only show verified requests
            },
            orderBy: { createdAt: 'desc' },
            include: {
                package: {
                    select: {
                        name: true,
                        duration: true,
                        price: true,
                        currency: true,
                    },
                },
            },
        });

        if (!subscriptionRequest) {
            return res.status(404).json({
                error: 'No subscription request found for this email address.',
                message: 'If you recently submitted a request, please verify your email first.'
            });
        }

        // Return subscription request details
        res.json({
            email: subscriptionRequest.email,
            fullName: subscriptionRequest.fullName,
            package: subscriptionRequest.package,
            submittedAt: subscriptionRequest.createdAt,
            isVerified: subscriptionRequest.isEmailVerified,
            verifiedAt: subscriptionRequest.verifiedAt,
        });
    } catch (error) {
        console.error('Error looking up subscription:', error);
        res.status(500).json({ error: 'Failed to lookup subscription' });
    }
});

// POST /api/subscriptions/request - Create subscription request
router.post('/request', subscriptionRequestLimiter, validate(createSubscriptionRequestSchema), async (req: Request, res: Response) => {
    try {
        const { packageId, fullName, email, phoneNumber } = req.body;

        // Sanitize inputs
        const sanitizedFullName = sanitizeInput(fullName);
        const sanitizedEmail = sanitizeInput(email).toLowerCase();
        const sanitizedPhone = sanitizeInput(phoneNumber);

        // Verify package exists and is active
        const pkg = await prisma.package.findUnique({
            where: { id: packageId },
        });

        if (!pkg || !pkg.isActive) {
            return res.status(404).json({ error: 'Package not found or inactive' });
        }

        // Check rate limit: 3 requests per email per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentRequests = await prisma.subscriptionRequest.count({
            where: {
                email: sanitizedEmail,
                createdAt: { gte: oneHourAgo },
            },
        });

        if (recentRequests >= 3) {
            return res.status(429).json({
                error: 'Too many requests. Please wait before requesting again.',
            });
        }

        // Generate secure verification token (64 hex characters)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Fetch settings to get contactEmail for "from" address
        const settings = await prisma.appSettings.findFirst({
            where: { id: 'main' },
            select: { contactEmail: true },
        });

        // Create subscription request
        const subscriptionRequest = await prisma.subscriptionRequest.create({
            data: {
                packageId,
                fullName: sanitizedFullName,
                email: sanitizedEmail,
                phoneNumber: sanitizedPhone,
                verificationToken,
                expiresAt,
            },
            include: {
                package: {
                    select: {
                        name: true,
                        duration: true,
                        price: true,
                        currency: true,
                    },
                },
            },
        });

        // Send verification email with contactEmail as "from" address
        const emailSent = await sendVerificationEmail(
            sanitizedEmail,
            verificationToken,
            sanitizedFullName,
            settings?.contactEmail || null
        );

        if (!emailSent) {
            console.error('Failed to send verification email for request:', subscriptionRequest.id);
            // Don't fail the request, but log the error
        }

        res.status(201).json({
            message: 'Verification email sent',
            requestId: subscriptionRequest.id,
        });
    } catch (error) {
        console.error('Error creating subscription request:', error);
        res.status(500).json({ error: 'Failed to create subscription request' });
    }
});

// GET /api/subscriptions/verify/:token - Verify email and send PDF
router.get('/verify/:token', subscriptionVerifyLimiter, async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({ error: 'Invalid verification link' });
        }

        // Find subscription request by token
        const subscriptionRequest = await prisma.subscriptionRequest.findUnique({
            where: { verificationToken: token },
            include: {
                package: {
                    select: {
                        name: true,
                        duration: true,
                        price: true,
                        currency: true,
                    },
                },
            },
        });

        if (!subscriptionRequest) {
            return res.status(404).json({ error: 'Invalid verification link' });
        }

        // Check if already verified
        if (subscriptionRequest.isEmailVerified) {
            return res.json({
                success: true,
                requestId: subscriptionRequest.id,
                message: 'Email already verified',
                alreadyVerified: true,
            });
        }

        // Check if token expired
        if (new Date() > subscriptionRequest.expiresAt) {
            return res.status(400).json({ error: 'Verification link expired' });
        }

        // Mark as verified
        await prisma.subscriptionRequest.update({
            where: { id: subscriptionRequest.id },
            data: {
                isEmailVerified: true,
                verifiedAt: new Date(),
            },
        });

        // Fetch settings to get contactEmail for "from" address
        const settings = await prisma.appSettings.findFirst({
            where: { id: 'main' },
            select: { contactEmail: true },
        });

        // Generate PDF
        let pdfBuffer: Buffer;
        try {
            pdfBuffer = await generateSubscriptionPDF({
                fullName: subscriptionRequest.fullName,
                email: subscriptionRequest.email,
                phoneNumber: subscriptionRequest.phoneNumber,
                packageName: subscriptionRequest.package.name,
                duration: subscriptionRequest.package.duration,
                price: subscriptionRequest.package.price,
                currency: subscriptionRequest.package.currency,
            });
        } catch (pdfError) {
            console.error('Error generating PDF:', pdfError);
            return res.status(500).json({ error: 'Failed to generate subscription document' });
        }

        // Send PDF email with contactEmail as "from" address
        const emailSent = await sendSubscriptionPDF(
            subscriptionRequest.email,
            pdfBuffer,
            {
                name: subscriptionRequest.fullName,
                packageName: subscriptionRequest.package.name,
                duration: subscriptionRequest.package.duration,
                price: subscriptionRequest.package.price,
                currency: subscriptionRequest.package.currency,
            },
            settings?.contactEmail || null
        );

        if (!emailSent) {
            console.error('Failed to send PDF email for request:', subscriptionRequest.id);
            // Still return success since verification is complete
        } else {
            // Update PDF sent timestamp
            await prisma.subscriptionRequest.update({
                where: { id: subscriptionRequest.id },
                data: { pdfSentAt: new Date() },
            });
        }

        res.json({
            success: true,
            requestId: subscriptionRequest.id,
            message: 'Email verified and PDF sent',
        });
    } catch (error) {
        console.error('Error verifying subscription:', error);
        res.status(500).json({ error: 'Failed to verify subscription' });
    }
});

// GET /api/subscriptions/:requestId - Get subscription request details (for success page)
router.get('/:requestId', async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;

        const subscriptionRequest = await prisma.subscriptionRequest.findUnique({
            where: { id: requestId },
            include: {
                package: {
                    select: {
                        name: true,
                        duration: true,
                        price: true,
                        currency: true,
                    },
                },
            },
        });

        if (!subscriptionRequest) {
            return res.status(404).json({ error: 'Subscription request not found' });
        }

        // Only return if email is verified (security: don't expose unverified requests)
        if (!subscriptionRequest.isEmailVerified) {
            return res.status(403).json({ error: 'Email not verified' });
        }

        // Return only necessary data for WhatsApp message
        res.json({
            id: subscriptionRequest.id,
            package: subscriptionRequest.package,
        });
    } catch (error) {
        console.error('Error getting subscription request:', error);
        res.status(500).json({ error: 'Failed to get subscription request' });
    }
});

export default router;

