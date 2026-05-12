// src/routes/admin/auth.routes.ts
import { Router } from 'express';

import { AdminAuthController } from '../../controllers/auth/adminAuth.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/requireRole';

const router = Router();

router.post('/login', AdminAuthController.login);
router.post('/logout', AdminAuthController.logout);

router.use(authMiddleware());
router.use(requireRole(['ADMIN']));

router.get('/profile', AdminAuthController.getProfile);

export default router;
