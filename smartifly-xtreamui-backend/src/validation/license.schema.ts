// ============================================================
// src/validation/license.schema.ts
// SMARTIFLY XTREAM UI — ENTERPRISE LICENSE VALIDATION
// ============================================================

import { z } from 'zod';

// ============================================================
// ENUMS
// ============================================================

export const licensePlanEnum = z.enum([
  'TRIAL',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
  'LIFETIME',
]);

export const licenseStatusEnum = z.enum([
  'ACTIVE',
  'DISABLED',
  'EXPIRED',
  'BLOCKED',
]);

// ============================================================
// BASE SCHEMAS
// ============================================================

export const licenseKeySchema = z
  .string()
  .min(10, 'License key too short')
  .max(50, 'License key too long');

// ============================================================
// LICENSE SCHEMAS
// ============================================================

export const createLicenseSchema = z.object({
  plan: licensePlanEnum.default('TRIAL'),
  userId: z.number().int().optional(),
  serverId: z.number().int().optional(),
  xtreamUser: z.string().max(255).optional(),
  xtreamPass: z.string().max(255).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateLicenseSchema = z.object({
  plan: licensePlanEnum.optional(),
  status: licenseStatusEnum.optional(),
  serverId: z.number().int().optional(),
  xtreamUser: z.string().max(255).optional(),
  xtreamPass: z.string().max(255).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const activateLicenseSchema = z.object({
  licenseKey: z.string().min(1),
  deviceId: z.string().min(1),
  mac: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  platform: z.string().optional(),
});

export const licenseFilterSchema = z.object({
  search: z.string().max(100).optional(),
  status: licenseStatusEnum.optional(),
  plan: licensePlanEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// VALIDATION HELPERS
// ============================================================

export function validateSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

export function formatZodErrors(errors: z.ZodIssue[]): string {
  return errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}
