// src/services/deviceUser.service.ts
import type { DeviceUser, Platform } from '@prisma/client';

import { prisma } from '../config/prisma';

export type DeviceState =
  | 'NO_DEVICE'
  | 'PENDING'    // Formerly NO_LICENSE, matches TV app's OnboardingRepository.kt
  | 'ACTIVE'
  | 'EXPIRED'
  | 'DISABLED'
  | 'BLOCKED'
  | 'BLACKLISTED'
  | 'BAD_REQUEST'
  | 'SERVER_ERROR';

export interface DeviceRegistrationData {
  deviceId: string;
  mac?: string | null;
  brand?: string | null;
  model?: string | null;
  serial?: string | null;
  platform?: Platform;
  publicIp?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
}

export interface DeviceCheckResult {
  exists: boolean;
  valid: boolean;
  canRegister: boolean;
  state: DeviceState;
  reason: string;
  device?: { id: number; deviceId: string; mac: string | null } | null;
  license?: {
    id: number;
    userId: number | null;
    plan: string;
    expiresAt: Date | null;
    xtreamUser: string | null;
    xtreamPass: string | null;
    server: { name: string; url: string } | null;
  } | null;
}

export const DeviceUserService = {
  /**
   * Register or Update device (Silent Onboarding)
   */
  async register(data: DeviceRegistrationData): Promise<DeviceUser> {
    const device = await prisma.deviceUser.upsert({
      where: { deviceId: data.deviceId },
      create: {
        deviceId: data.deviceId,
        mac: data.mac,
        brand: data.brand,
        model: data.model,
        serial: data.serial,
        platform: data.platform ?? 'UNKNOWN',
        publicIp: data.publicIp,
        appVersion: data.appVersion,
        osVersion: data.osVersion,
        lastSeenAt: new Date(),
      },
      update: {
        mac: data.mac,
        brand: data.brand,
        model: data.model,
        serial: data.serial,
        platform: data.platform ?? 'UNKNOWN',
        publicIp: data.publicIp,
        appVersion: data.appVersion,
        osVersion: data.osVersion,
        lastSeenAt: new Date(),
      },
    });
    return device;
  },

  /**
   * Check device status
   */
  async check(identifiers: { deviceId?: string; mac?: string }): Promise<DeviceCheckResult> {
    if (!identifiers.deviceId && !identifiers.mac) {
      return { exists: false, valid: false, canRegister: false, state: 'BAD_REQUEST', reason: 'Identifier required' };
    }

    const blacklistMatch = await prisma.deviceBlacklist.findFirst({
      where: {
        OR: [
          identifiers.deviceId ? { deviceId: identifiers.deviceId } : undefined,
          identifiers.mac ? { mac: identifiers.mac } : undefined,
        ].filter(Boolean) as Array<{ deviceId?: string; mac?: string }>,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (blacklistMatch) {
      return {
        exists: false,
        valid: false,
        canRegister: false,
        state: 'BLACKLISTED',
        reason: `Device is blacklisted (${blacklistMatch.reason})`,
      };
    }

    const device = await prisma.deviceUser.findFirst({
      where: {
        deletedAt: null,
        OR: [
          identifiers.deviceId ? { deviceId: identifiers.deviceId } : {},
          identifiers.mac ? { mac: identifiers.mac } : {},
        ],
      },
      include: {
        licenses: {
          where: { deletedAt: null },
          include: { server: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!device) {
      return { exists: false, valid: false, canRegister: true, state: 'NO_DEVICE', reason: 'Device not registered.' };
    }

    // Update last seen
    await prisma.deviceUser.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });

    const latestLicense = device.licenses[0] || null;
    if (!latestLicense) {
      return {
        exists: true,
        valid: false,
        canRegister: false,
        state: 'PENDING',
        reason: 'Activation pending',
        device: { id: device.id, deviceId: device.deviceId, mac: device.mac },
        license: null,
      };
    }

    const now = new Date();
    const isExpiredByDate = !!latestLicense.expiresAt && latestLicense.expiresAt < now;

    let state: DeviceState = 'PENDING';
    let valid = false;
    let reason = 'Activation pending';

    if (latestLicense.status === 'BLOCKED') {
      state = 'BLOCKED';
      reason = 'License blocked';
    } else if (latestLicense.status === 'DISABLED') {
      state = 'DISABLED';
      reason = 'License disabled';
    } else if (latestLicense.status === 'EXPIRED' || isExpiredByDate) {
      state = 'EXPIRED';
      reason = 'License expired';
    } else if (latestLicense.status === 'ACTIVE') {
      state = 'ACTIVE';
      valid = true;
      reason = 'Device is active';
    }

    return {
      exists: true,
      valid,
      canRegister: false,
      state,
      reason,
      device: { id: device.id, deviceId: device.deviceId, mac: device.mac },
      license: latestLicense ? {
        id: latestLicense.id,
        userId: latestLicense.userId,
        plan: latestLicense.plan,
        expiresAt: latestLicense.expiresAt,
        xtreamUser: latestLicense.xtreamUser,
        xtreamPass: latestLicense.xtreamPass,
        server: latestLicense.server ? { name: latestLicense.server.name, url: latestLicense.server.url } : null,
      } : null,
    };
  },
};
