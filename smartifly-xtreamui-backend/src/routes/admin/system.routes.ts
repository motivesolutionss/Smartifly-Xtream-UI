import { Router } from 'express';

import { SystemAdminController } from '../../controllers/admin/system.controller';

const router = Router();

router.get('/readiness', SystemAdminController.readiness);

export default router;
