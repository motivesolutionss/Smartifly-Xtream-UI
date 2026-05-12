// src/routes/admin/license.routes.ts
import { Router } from 'express';

import { LicenseController } from '../../controllers/admin/license.controller';

const router = Router();

router.get('/', LicenseController.list);
router.get('/stats', LicenseController.getStats);
router.post('/', LicenseController.create);
router.get('/:id', LicenseController.detail);
router.patch('/:id', LicenseController.update);
router.delete('/:id', LicenseController.delete);

export default router;
