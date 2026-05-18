import { Router } from 'express';

import { ProviderHealthPublicController } from '../../controllers/public/providerHealth.controller';
import { providerHealthGuard } from '../../middlewares/providerHealthGuard';

const router = Router();

router.post('/provider-health', providerHealthGuard, ProviderHealthPublicController.ingest);

export default router;
