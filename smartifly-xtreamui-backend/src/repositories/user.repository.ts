// src/repositories/user.repository.ts
import type { User, UserRole, Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';

export interface UserCreateData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export const UserRepository = {
  async create(data: UserCreateData): Promise<User> {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        password: data.password,
        role: data.role ?? 'USER',
      },
    });
  },

  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  },

  async findMany(filters: UserFilters, options: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: options.sortBy ? { [options.sortBy]: options.sortOrder || 'desc' } : { createdAt: 'desc' } as Prisma.UserOrderByWithRelationInput
      }),
      prisma.user.count({ where })
    ]);

    return { users, total };
  },

  sanitize(user: User) {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  },

  sanitizeMany(users: User[]) {
    return users.map(u => this.sanitize(u));
  },

  async softDelete(id: number): Promise<User> {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  },

  async restore(id: number): Promise<User> {
    return prisma.user.update({ where: { id }, data: { deletedAt: null, isActive: true } });
  },

  async revokeAllSessions(userId: number) {
    const result = await prisma.session.deleteMany({ where: { userId } });
    return result.count;
  }
};
