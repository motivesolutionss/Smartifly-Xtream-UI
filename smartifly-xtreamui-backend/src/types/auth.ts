// src/types/auth.ts
import type { UserRole as PrismaUserRole } from '@prisma/client';

export type UserRole = PrismaUserRole;

export interface AuthUser {
  id: number;
  role: UserRole;
}

export interface JWTPayload {
  sub: string | number;
  role: UserRole;
  iat?: number;
  exp?: number;
}
