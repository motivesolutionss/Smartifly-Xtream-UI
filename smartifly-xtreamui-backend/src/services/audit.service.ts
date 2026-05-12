// src/services/audit.service.ts
import type { AuditAction } from '@prisma/client';

import { prisma } from '../config/prisma';

type AuditParams = {
  userId: number;
  action: AuditAction;
  entity: string;
  entityId?: number | null;
  details?: string | null;
  ipAddress?: string | null;
};

export const Audit = {
  async log(p: AuditParams) {
    return prisma.auditLog.create({
      data: {
        userId: p.userId,
        action: p.action,
        entity: p.entity,
        entityId: p.entityId ?? null,
        details: p.details ?? null,
        ipAddress: p.ipAddress ?? null,
      },
    });
  },
};
