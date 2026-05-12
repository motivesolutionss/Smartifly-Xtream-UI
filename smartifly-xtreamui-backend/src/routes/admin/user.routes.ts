import { Router } from 'express';

import { UserController } from '../../controllers/admin/user.controller';

const router = Router();

router.get('/stats', UserController.getStats);
router.get('/', UserController.list);
router.get('/:id', UserController.get);
router.post('/:id/activate', UserController.activate);
router.post('/:id/suspend', UserController.suspend);
router.post('/:id/unlock', UserController.unlock);
router.post('/:id/revoke-sessions', UserController.revokeSessions);
router.delete('/:id', UserController.delete);
router.post('/:id/restore', UserController.restore);
router.get('/:id/devices', UserController.getDevices);

export default router;
