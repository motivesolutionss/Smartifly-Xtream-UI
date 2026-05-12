import { Router } from 'express';

import { AuditController } from '../../controllers/admin/audit.controller';
import { requireRole } from '../../middlewares/requireRole';

const router = Router();
router.use(requireRole(['ADMIN']));

router.get('/',          AuditController.list);
router.post('/delete-selected', AuditController.deleteSelected);
router.post('/:id/undo', AuditController.undo);

export default router;
