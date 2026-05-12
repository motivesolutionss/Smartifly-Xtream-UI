import { Router } from 'express';

import { FinanceController } from '../../controllers/admin/finance.controller';

const router = Router();

router.get('/summary', FinanceController.summary);
router.get('/entries', FinanceController.listEntries);
router.post('/entries', FinanceController.createEntry);

export default router;
