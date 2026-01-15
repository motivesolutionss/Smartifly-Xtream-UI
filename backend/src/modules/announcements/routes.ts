import { Router } from 'express';
import {
    createAnnouncement,
    getAnnouncements,
    getAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    trackView
} from './controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Logs to debug if imports are undefined
if (!authenticate) console.error('Auth middleware is missing!');
if (!getAnnouncements) console.error('getAnnouncements controller is missing!');

// Public/Protected read routes
// Public/Protected read routes
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncement);

// Admin only routes
router.post('/', authenticate, createAnnouncement);
router.patch('/:id', authenticate, updateAnnouncement);
router.delete('/:id', authenticate, deleteAnnouncement);

// Tracking
router.post('/:id/view', trackView);

export { router as announcementRoutes };
