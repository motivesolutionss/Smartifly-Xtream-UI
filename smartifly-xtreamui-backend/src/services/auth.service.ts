// ============================================================
// src/services/auth.service.ts
// SMARTIFLY XTREAM UI — ENTERPRISE AUTH SERVICE
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { UserRepository } from '../repositories/user.repository';

export const AuthService = {
  /**
   * Login with email and password
   */
  async login(email: string, pass: string) {
    const user = await UserRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials or account suspended');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { sub: user.id, role: user.role },
      env.jwtAccessSecret,
      { expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
      { sub: user.id },
      env.jwtRefreshSecret,
      { expiresIn: `${env.jwtRefreshExpiresInDays}d` as jwt.SignOptions['expiresIn'] }
    );

    // Save session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  },

  /**
   * Logout (revoke session)
   */
  async logout(refreshToken: string) {
    try {
      await prisma.session.delete({
        where: { refreshToken },
      });
    } catch {
      // Ignore if session doesn't exist
    }
  },

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    const accessToken = jwt.sign(
      { sub: session.user.id, role: session.user.role },
      env.jwtAccessSecret,
      { expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken };
  },
};
