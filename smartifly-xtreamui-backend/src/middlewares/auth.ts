// src/middlewares/auth.ts
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import type { AuthUser, UserRole } from '../types/auth';

interface AccessTokenPayload {
  sub: number | string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

export function authMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return sendError(res, 401, 'Unauthorized');
    }

    const token = header.substring(7);
    try {
      const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
      const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true }
      });

      if (!user || !user.isActive) return sendError(res, 401, 'User inactive or not found');

      req.user = { id: user.id, role: user.role };
      return next();
    } catch {
      return sendError(res, 401, 'Invalid token');
    }
  };
}

export function restrictToAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') return sendError(res, 403, 'Admin only');
  return next();
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export default authMiddleware;
