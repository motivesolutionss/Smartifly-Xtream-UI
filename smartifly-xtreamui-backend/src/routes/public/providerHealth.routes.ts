import { Router } from 'express';

import { ProviderHealthPublicController } from '../../controllers/public/providerHealth.controller';

const router = Router();

router.post('/provider-health', ProviderHealthPublicController.ingest);

export default router;

