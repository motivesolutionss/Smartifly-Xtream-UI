import { Router } from 'express';
import { z } from 'zod';
import { validate, authMiddleware } from '../../middleware/index.js';
import * as notificationController from './controller.js';
import * as templatesController from './templates.controller.js';
import * as segmentsController from './segments.controller.js';
import * as abTestController from './ab-testing.controller.js';
import * as scheduler from './scheduler.js';

const router = Router();

// Validation schemas
const registerTokenSchema = z.object({
    body: z.object({
        token: z.string().min(1),
        platform: z.enum(['android', 'ios', 'web']),
    }),
});

const sendNotificationSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        body: z.string().optional(),
        data: z.record(z.string()).optional(),
        imageUrl: z.string().optional(),
        deepLink: z.string().optional(),
        templateId: z.string().optional(),
        segmentId: z.string().optional(),
        scheduledAt: z.string().optional(), // ISO string
        filters: z.record(z.string()).optional(),
    }).refine(data => data.title || data.templateId, {
        message: "Title is required unless a template is used",
        path: ["title"]
    }),
});

// Device Registration (Public)
router.post('/register', validate(registerTokenSchema), notificationController.registerToken);
router.delete('/unregister', notificationController.unregisterToken);

// Notifications (Admin)
router.post('/send', authMiddleware, validate(sendNotificationSchema), notificationController.sendNotification);
router.get('/history', authMiddleware, notificationController.getHistory);
router.get('/devices', authMiddleware, notificationController.getDeviceStats);

// Templates (Admin)
router.get('/templates', authMiddleware, templatesController.getTemplates);
router.post('/templates', authMiddleware, templatesController.createTemplate);
router.patch('/templates/:id', authMiddleware, templatesController.updateTemplate);
router.delete('/templates/:id', authMiddleware, templatesController.deleteTemplate);

// Segments (Admin)
router.get('/segments', authMiddleware, segmentsController.getSegments);
router.post('/segments', authMiddleware, segmentsController.createSegment);
router.patch('/segments/:id', authMiddleware, segmentsController.updateSegment);
router.delete('/segments/:id', authMiddleware, segmentsController.deleteSegment);

// A/B Tests (Admin)
router.get('/ab-tests', authMiddleware, abTestController.getABTests);
router.post('/ab-tests', authMiddleware, abTestController.createABTest);
router.patch('/ab-tests/:id', authMiddleware, abTestController.updateABTest);
router.delete('/ab-tests/:id', authMiddleware, abTestController.deleteABTest);

// Scheduler (Admin / System)
router.post('/scheduler/run', authMiddleware, scheduler.runScheduler);

export default router;
