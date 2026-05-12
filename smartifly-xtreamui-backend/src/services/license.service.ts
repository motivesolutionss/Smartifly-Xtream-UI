// ============================================================
// src/services/license.service.ts
// SMARTIFLY XTREAM UI — ENTERPRISE LICENSE SERVICE
// ============================================================

import type { LicensePlan, LicenseStatus } from '@prisma/client';

import { prisma } from '../config/prisma';
import { generateLicenseKey } from '../utils/licenseKey';

export const LicenseService = {
  /**
   * Create a new license/subscription
   */
  async create(params: {
    userId?: number;
    deviceUserId?: number;
    serverId?: number;
    xtreamUser?: string;
    xtreamPass?: string;
    plan?: LicensePlan;
    expiresAt?: Date;
  }) {
    const key = generateLicenseKey();

    return prisma.license.create({
      data: {
        key,
        userId: params.userId,
        deviceUserId: params.deviceUserId,
        serverId: params.serverId,
        xtreamUser: params.xtreamUser,
        xtreamPass: params.xtreamPass,
        plan: params.plan ?? 'TRIAL',
        expiresAt: params.expiresAt,
        status: 'ACTIVE',
      },
    });
  },

  /**
   * Bind a device to a license
   */
  async bindDevice(licenseId: number, deviceUserId: number) {
    return prisma.license.update({
      where: { id: licenseId },
      data: {
        deviceUserId,
        activatedAt: new Date(),
      },
    });
  },

  /**
   * Find license by key
   */
  async findByKey(key: string) {
    return prisma.license.findUnique({
      where: { key },
      include: {
        server: true,
        deviceUser: true,
      },
    });
  },

  /**
   * List licenses for a user
   */
  async listByUser(userId: number) {
    return prisma.license.findMany({
      where: { userId, deletedAt: null },
      include: {
        server: true,
        deviceUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Update status
   */
  async updateStatus(id: number, status: LicenseStatus) {
    return prisma.license.update({
      where: { id },
      data: { status },
    });
  },
};
