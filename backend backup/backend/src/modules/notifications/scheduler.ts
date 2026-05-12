import prisma from '../../config/database.js';
// import admin from 'firebase-admin'; // Uncomment

export const processScheduledNotifications = async () => {
    try {
        const now = new Date();

        // Find notifications that are SCHEDULED and past due
        const pending = await prisma.notification.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledAt: { lte: now }
            },
            include: {
                template: true
            }
        });

        if (pending.length === 0) return { processed: 0, errors: 0 };

        let processed = 0;
        let errors = 0;

        for (const notif of pending) {
            try {
                // Logic similarly to sendNotification controller
                // 1. Resolve content (already resolved or re-resolve from template?)
                // Usually we resolve at creation time or at send time. 
                // If we resolving at send time, we need to handle it here.
                // For simplicity, let's assume content was copied to Notification table or we use what's there.
                // The Notification model has title/body/data.

                // If templateId is present, we might want to refresh content, but title/body are stored in Notification too.
                // Let's use the stored title/body in Notification.

                // 2. Resolve Audience
                // We need to re-query tokens as they might have changed since scheduling
                let tokenQuery: any = {};
                if (notif.segmentId) {
                    const segment = await prisma.notificationSegment.findUnique({ where: { id: notif.segmentId } });
                    if (segment && segment.filters) {
                        const segFilters = segment.filters as any;
                        if (segFilters.platform) {
                            tokenQuery.platform = segFilters.platform;
                        }
                    }
                }

                const deviceTokens = await prisma.deviceToken.findMany({
                    where: tokenQuery,
                    select: { token: true },
                });

                const tokens = deviceTokens.map((d) => d.token);

                if (tokens.length > 0) {
                    // Send via Firebase
                    // const message = { ... }
                    // await admin.messaging().send...

                    // Mock success
                }

                // Update status
                await prisma.notification.update({
                    where: { id: notif.id },
                    data: {
                        status: 'SENT',
                        sentAt: new Date(),
                        sentBy: 'SYSTEM_SCHEDULER'
                    }
                });

                processed++;
            } catch (err) {
                console.error(`Failed to process scheduled notification ${notif.id}`, err);
                await prisma.notification.update({
                    where: { id: notif.id },
                    data: {
                        status: 'FAILED',
                        error: String(err)
                    }
                });
                errors++;
            }
        }

        return { processed, errors };

    } catch (error) {
        console.error('Scheduler error:', error);
        throw error;
    }
};

// Simple endpoint wrapper
import { Request, Response } from 'express';

export const runScheduler = async (req: Request, res: Response) => {
    try {
        const result = await processScheduledNotifications();
        res.json({ message: 'Scheduler ran', ...result });
    } catch (error) {
        res.status(500).json({ error: 'Scheduler failed' });
    }
};
