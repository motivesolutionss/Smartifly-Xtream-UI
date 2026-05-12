// src/routes/admin/server.routes.ts
import { Router } from 'express';

import { ServerController } from '../../controllers/admin/server.controller';

const router = Router();

router.get('/', ServerController.list);
router.get('/:id/health', ServerController.checkHealth);
router.post('/reorder', ServerController.reorder);
router.post('/', ServerController.create);
router.patch('/:id', ServerController.update);
router.delete('/:id', ServerController.delete);

export default router;
