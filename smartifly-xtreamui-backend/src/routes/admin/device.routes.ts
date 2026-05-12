// src/routes/admin/device.routes.ts
import { Router } from 'express';

import { AdminDeviceController } from '../../controllers/admin/device.controller';

const router = Router();

router.get('/', AdminDeviceController.list);
router.get('/stats', AdminDeviceController.getStats);
router.get('/:id', AdminDeviceController.getById);
router.get('/by-device-id/:deviceId', AdminDeviceController.getByDeviceId);
router.patch('/:id', AdminDeviceController.update);
router.delete('/:id', AdminDeviceController.delete);

export default router;
