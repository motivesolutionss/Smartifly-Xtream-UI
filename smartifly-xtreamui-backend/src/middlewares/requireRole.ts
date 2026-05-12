// ============================================================
// src/middlewares/requireRole.ts
// ============================================================
// Simple role-based guard using req.user.role
// Works with: 'ADMIN' | 'RESELLER' | 'USER'
// ============================================================

import type { NextFunction, Request, Response } from 'express';

import type { UserRole } from '../types/auth';

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !roles.includes(user.role)) {
      return res
        .status(403)
        .json({ error: 'Forbidden – insufficient role permissions' });
    }

    return next();
  };
}
