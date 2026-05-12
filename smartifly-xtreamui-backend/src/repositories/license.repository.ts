// src/repositories/license.repository.ts
import type { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';

export const LicenseRepository = {
  async findById(id: number) {
    return prisma.license.findUnique({
      where: { id },
      include: { deviceUser: true, user: true, server: true }
    });
  },

  async findByKey(key: string) {
    return prisma.license.findUnique({
      where: { key },
      include: { deviceUser: true, user: true, server: true }
    });
  },

  async update(id: number, data: Prisma.LicenseUpdateInput) {
    return prisma.license.update({
      where: { id },
      data
    });
  }
};
