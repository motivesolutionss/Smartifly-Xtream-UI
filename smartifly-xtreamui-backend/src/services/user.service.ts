// src/services/user.service.ts
import type { AuditAction } from '@prisma/client';

import { prisma } from '../config/prisma';
import { UserRepository } from '../repositories/user.repository';

interface RequestMetadata {
  actorId: number;
  ipAddress?: string | null;
}

async function createAuditLog(params: {
  action: AuditAction;
  entity: string;
  entityId: number;
  details?: string;
  metadata: RequestMetadata;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.metadata.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.metadata.ipAddress ?? null,
    },
  });
}

export const UserService = {
  async activate(id: number, metadata: RequestMetadata) {
    const updated = await prisma.user.update({ where: { id }, data: { isActive: true } });
    await createAuditLog({ action: 'UPDATE', entity: 'USER', entityId: id, details: 'User activated', metadata });
    return updated;
  },

  async suspend(id: number, reason: string | undefined, metadata: RequestMetadata) {
    const updated = await prisma.user.update({ where: { id }, data: { isActive: false } });
    await createAuditLog({ action: 'UPDATE', entity: 'USER', entityId: id, details: `User suspended: ${reason ?? 'No reason'}`, metadata });
    return updated;
  },

  async unlock(id: number, metadata: RequestMetadata) {
    // Basic unlock (isActive = true)
    return this.activate(id, metadata);
  },

  async softDelete(id: number, metadata: RequestMetadata) {
    const updated = await UserRepository.softDelete(id);
    await createAuditLog({ action: 'DELETE', entity: 'USER', entityId: id, details: 'User soft deleted', metadata });
    return updated;
  },

  async restore(id: number, metadata: RequestMetadata) {
    const updated = await UserRepository.restore(id);
    await createAuditLog({ action: 'UPDATE', entity: 'USER', entityId: id, details: 'User restored', metadata });
    return updated;
  },

  async revokeAllSessions(id: number, reason: string, metadata: RequestMetadata) {
    const count = await UserRepository.revokeAllSessions(id);
    await createAuditLog({ action: 'DELETE', entity: 'USER', entityId: id, details: `All sessions revoked: ${reason}`, metadata });
    return count;
  }
};
