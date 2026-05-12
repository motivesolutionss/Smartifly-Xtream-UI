// src/routes/public/auth.routes.ts
import { Router } from 'express';

import { UserAuthController } from '../../controllers/auth/userAuth.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/login', UserAuthController.login);
router.post('/logout', UserAuthController.logout);
router.get('/profile', authMiddleware(), UserAuthController.getProfile);

export default router;
