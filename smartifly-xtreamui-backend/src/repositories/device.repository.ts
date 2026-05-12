// ============================================================
// src/repositories/device.repository.ts
// SMARTIFLY XTREAM UI — ENTERPRISE DEVICE REPOSITORY
// ============================================================

import type { DeviceUser, Platform } from '@prisma/client';

import { prisma } from '../config/prisma';

export interface DeviceCreateData {
  deviceId: string;
  softwareId?: string | null;
  mac?: string | null;
  brand?: string | null;
  model?: string | null;
  serial?: string | null;
  platform?: Platform;
  publicIp?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
}

export const DeviceRepository = {
  /**
   * Find by deviceId
   */
  async findByDeviceId(deviceId: string): Promise<DeviceUser | null> {
    return prisma.deviceUser.findUnique({
      where: { deviceId },
    });
  },

  /**
   * Find by softwareId
   */
  async findBySoftwareId(softwareId: string): Promise<DeviceUser | null> {
    return prisma.deviceUser.findUnique({
      where: { softwareId },
    });
  },

  /**
   * Create new device
   */
  async create(data: DeviceCreateData): Promise<DeviceUser> {
    return prisma.deviceUser.create({
      data: {
        deviceId: data.deviceId,
        softwareId: data.softwareId,
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
  },

  /**
   * Upsert by deviceId
   */
  async upsert(deviceId: string, data: DeviceCreateData): Promise<DeviceUser> {
    return prisma.deviceUser.upsert({
      where: { deviceId },
      create: {
        deviceId,
        softwareId: data.softwareId,
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
        softwareId: data.softwareId ?? undefined,
        mac: data.mac ?? undefined,
        brand: data.brand ?? undefined,
        model: data.model ?? undefined,
        serial: data.serial ?? undefined,
        platform: data.platform ?? undefined,
        publicIp: data.publicIp ?? undefined,
        appVersion: data.appVersion ?? undefined,
        osVersion: data.osVersion ?? undefined,
        lastSeenAt: new Date(),
      },
    });
  },

  /**
   * Soft delete
   */
  async softDelete(id: number): Promise<DeviceUser> {
    return prisma.deviceUser.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
