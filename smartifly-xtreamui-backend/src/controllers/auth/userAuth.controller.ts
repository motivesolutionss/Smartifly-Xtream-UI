// src/controllers/auth/userAuth.controller.ts
import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';
import { AuthService } from '../../services/auth.service';

function error(res: Response, code: number, message: string) {
  return res.status(code).json({ success: false, message });
}

function success(res: Response, data: unknown) {
  return res.json({ success: true, ...(data as object) });
}

export const UserAuthController = {
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return error(res, 400, 'Email and password required');

      const result = await AuthService.login(email, password);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return error(res, 401, message);
    }
  },

  logout: async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await AuthService.logout(refreshToken);
      return success(res, { message: 'Logged out' });
    } catch {
      return success(res, { message: 'Logged out' });
    }
  },

  getProfile: async (req: Request, res: Response) => {
    try {
      if (!req.user) return error(res, 401, 'Unauthorized');
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
      });
      return success(res, { user });
    } catch {
      return error(res, 500, 'Failed to get profile');
    }
  }
};

export default UserAuthController;
