// src/routes/public/portal.routes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

function error(res: Response, code: number, message: string) {
  return res.status(code).json({ success: false, message });
}

function success(res: Response, data: unknown) {
  return res.json({ success: true, ...(data as object) });
}

/**
 * Validate Server Identity and get Portal details
 * GET /public/portal/validate?code=SMARTIFLY-01
 */
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return error(res, 400, 'Server Identity code is required');
    }

    const portal = await prisma.xtreamServer.findUnique({
      where: { serverIdentity: code as string, isActive: true }
    });

    if (!portal) {
      return error(res, 404, 'Invalid or inactive Server Identity');
    }

    return success(res, {
      portal: {
        portalCode: portal.serverIdentity,
        baseUrl: portal.url,
        name: portal.name
      }
    });
  } catch (err) {
    console.error('[Portal.validate] Error:', err);
    return error(res, 500, 'Handshake failed. Internal server error.');
  }
});

export default router;
