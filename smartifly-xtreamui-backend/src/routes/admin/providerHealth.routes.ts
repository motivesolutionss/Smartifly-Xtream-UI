import { Router } from 'express';

import { ProviderHealthAdminController } from '../../controllers/admin/providerHealth.controller';

const router = Router();

router.get('/summary', ProviderHealthAdminController.summary);
router.get('/hosts', ProviderHealthAdminController.hosts);
router.get('/timeline', ProviderHealthAdminController.timeline);

export default router;

