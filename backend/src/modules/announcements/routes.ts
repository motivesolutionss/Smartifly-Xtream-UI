import { Router } from 'express';
import {
    createAnnouncement,
    getAnnouncements,
    getPublicAnnouncements,
    getPublicAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    trackView
} from './controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public read routes
router.get('/', getPublicAnnouncements);

// Admin read route
router.get('/admin', authenticate, getAnnouncements);
router.get('/:id', getPublicAnnouncement);

// Admin only routes
router.post('/', authenticate, createAnnouncement);
router.patch('/:id', authenticate, updateAnnouncement);
router.delete('/:id', authenticate, deleteAnnouncement);

// Tracking
router.post('/:id/view', trackView);

export { router as announcementRoutes };
