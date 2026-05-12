// src/routes/public/license.routes.ts
import { Router } from 'express';

import { PublicLicenseController } from '../../controllers/public/license.controller';

const router = Router();

// License activation (bind to device)
router.post('/activate', PublicLicenseController.activate);

// Status check (validity check)
router.get('/check', PublicLicenseController.check);

// Detailed info for user portal
router.get('/:key', PublicLicenseController.getInfo);

export default router;
