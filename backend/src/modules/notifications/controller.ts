import { Request, Response } from 'express';
import prisma from '../../config/database.js';
import { getMessaging } from '../../config/firebase.js';

// Types for typed request
interface AuthRequest extends Request {
    adminId?: string;
}

export const registerToken = async (req: Request, res: Response) => {
    try {
        const { token, platform } = req.body;

        await prisma.deviceToken.upsert({
            where: { token },
            update: { platform, updatedAt: new Date() },
            create: { token, platform },
        });

        res.json({ message: 'Token registered successfully' });
    } catch (error) {
        console.error('Register token error:', error);
        res.status(500).json({ error: 'Failed to register token' });
    }
};

export const unregisterToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        await prisma.deviceToken.delete({ where: { token } }).catch(() => { });

        res.json({ message: 'Token unregistered' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unregister token' });
    }
};

export const sendNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { title, body, data, imageUrl, deepLink, templateId, segmentId, scheduledAt, filters } = req.body;

        // 1. Resolve content from Template if provided
        let finalTitle = title;
        let finalBody = body;
        let finalData = data || {};
        let finalImage = imageUrl;
        let finalLink = deepLink;

        if (templateId) {
            const template = await prisma.notificationTemplate.findUnique({ where: { id: templateId } });
            if (template) {
                finalTitle = finalTitle || template.title;
                finalBody = finalBody || template.body;
                finalData = { ...template.data as object, ...finalData };
                finalImage = finalImage || template.imageUrl;
                finalLink = finalLink || template.deepLink;
            }
        }

        // 2. Resolve Audience (Tokens)
        let tokenQuery: any = {};

        // If segmentId provided, get filters
        if (segmentId) {
            const segment = await prisma.notificationSegment.findUnique({ where: { id: segmentId } });
            if (segment && segment.filters) {
                // Apply segment filters (Simple implementation for now: Platform)
                const segFilters = segment.filters as any;
                if (segFilters.platform) {
                    tokenQuery.platform = segFilters.platform;
                }
            }
        }

        // Ad-hoc filters override segment
        if (filters) {
            if (filters.platform) {
                tokenQuery.platform = filters.platform;
            }
        }

        const deviceTokens = await prisma.deviceToken.findMany({
            where: tokenQuery,
            select: { token: true },
        });

        const tokens = deviceTokens.map((d) => d.token);
        const deviceCount = tokens.length;

        // 3. Create Notification Record
        const notification = await prisma.notification.create({
            data: {
                title: finalTitle,
                body: finalBody,
                data: finalData,
                sentBy: req.adminId!,
                templateId,
                segmentId,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                status: scheduledAt ? 'SCHEDULED' : 'PENDING'
            },
        });

        // 4. Send or Schedule
        if (scheduledAt) {
            // It's scheduled, so we just return success
            res.json({
                message: 'Notification scheduled successfully',
                notificationId: notification.id,
                scheduledAt: notification.scheduledAt,
                estimatedDevices: deviceCount
            });
            return;
        }

        if (deviceCount === 0) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: { status: 'FAILED', error: 'No devices found for targeting' }
            });
            return res.status(400).json({ error: 'No devices registered regarding the filters' });
        }

        // 5. Send via Firebase Cloud Messaging
        const messaging = getMessaging();

        let response: { successCount: number; failureCount: number };

        if (messaging) {
            // Real Firebase implementation
            try {
                // Build clean data payload (FCM requires all string values, no null/undefined)
                const dataPayload: Record<string, string> = {
                    notificationId: notification.id,
                };
                if (finalLink) dataPayload.deepLink = finalLink;
                if (finalData && typeof finalData === 'object') {
                    for (const [key, value] of Object.entries(finalData)) {
                        if (value != null) dataPayload[key] = String(value);
                    }
                }

                const message = {
                    notification: {
                        title: finalTitle || 'Notification',
                        body: finalBody || '',
                        ...(finalImage ? { imageUrl: finalImage } : {}),
                    },
                    data: dataPayload,
                    tokens,
                };

                const fcmResponse = await messaging.sendEachForMulticast(message);
                response = {
                    successCount: fcmResponse.successCount,
                    failureCount: fcmResponse.failureCount,
                };

                console.log(`📱 FCM sent: ${response.successCount} success, ${response.failureCount} failed`);

                // Handle failed tokens (remove invalid ones)
                if (fcmResponse.failureCount > 0) {
                    const failedTokens: string[] = [];
                    fcmResponse.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            failedTokens.push(tokens[idx]);
                            console.warn(`   Token failed: ${resp.error?.code}`);
                        }
                    });

                    // Optionally remove invalid tokens from database
                    if (failedTokens.length > 0) {
                        await prisma.deviceToken.deleteMany({
                            where: { token: { in: failedTokens } }
                        });
                        console.log(`   Removed ${failedTokens.length} invalid tokens`);
                    }
                }
            } catch (fcmError) {
                console.error('FCM send error:', fcmError);
                await prisma.notification.update({
                    where: { id: notification.id },
                    data: { status: 'FAILED', error: String(fcmError) }
                });
                return res.status(500).json({ error: 'Failed to send push notification' });
            }
        } else {
            // Mock response when Firebase is not configured (development)
            console.warn('⚠️ Firebase not configured - using mock response');
            response = { successCount: deviceCount, failureCount: 0 };
        }

        // Update notification status
        const finalStatus = response.failureCount === deviceCount ? 'FAILED' : 'SENT';
        await prisma.notification.update({
            where: { id: notification.id },
            data: {
                status: finalStatus,
                sentAt: new Date(),
                ...(response.failureCount > 0 && {
                    error: `${response.failureCount} of ${deviceCount} failed`
                }),
            }
        });

        res.json({
            message: finalStatus === 'SENT' ? 'Notification sent successfully' : 'Notification partially failed',
            notificationId: notification.id,
            deviceCount: tokens.length,
            successCount: response.successCount,
            failureCount: response.failureCount,
        });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await prisma.notification.findMany({
            orderBy: { createdAt: 'desc' }, // Use createdAt to show scheduled ones too
            take: 50,
            include: {
                template: { select: { name: true } },
                segment: { select: { name: true } }
            }
        });

        res.json(notifications);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get notification history' });
    }
};

export const getDeviceStats = async (req: Request, res: Response) => {
    try {
        const counts = await prisma.deviceToken.groupBy({
            by: ['platform'],
            _count: true,
        });

        const total = await prisma.deviceToken.count();

        res.json({
            total,
            byPlatform: counts.reduce((acc, c) => ({ ...acc, [c.platform]: c._count }), {}),
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get device stats' });
    }
};
