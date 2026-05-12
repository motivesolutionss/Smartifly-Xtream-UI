// ============================================================
// src/validation/device.schema.ts
// SMARTIFLY XTREAM UI — ENTERPRISE VALIDATION SCHEMAS
// ============================================================

import { z } from 'zod';

// ============================================================
// ENUMS
// ============================================================

export const platformEnum = z.enum([
  'ANDROID_TV',
  'ANDROID_MOBILE',
  'FIRE_TV',
  'WEBOS',
  'TIZEN',
  'IOS',
  'BROWSER',
  'UNKNOWN',
]);

export const blacklistReasonEnum = z.enum([
  'FRAUD',
  'ABUSE',
  'TOS_VIOLATION',
  'ADMIN_BAN',
]);

// ============================================================
// BASE SCHEMAS
// ============================================================

export const macAddressSchema = z
  .string()
  .min(12, 'MAC address too short')
  .max(17, 'MAC address too long')
  .regex(
    /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{12})$/,
    'Invalid MAC address format'
  )
  .transform((mac) => mac.toUpperCase());

export const deviceIdSchema = z
  .string()
  .min(1, 'Device ID is required')
  .max(255, 'Device ID too long')
  .transform((id) => id.trim());

export const ipAddressSchema = z
  .string()
  .max(45, 'Invalid IP address')
  .optional();

export const appVersionSchema = z
  .string()
  .max(20, 'Version too long')
  .optional();

// ============================================================
// DEVICE SCHEMAS
// ============================================================

export const deviceRegisterSchema = z.object({
  deviceId: deviceIdSchema,
  softwareId: z.string().max(255).optional(),
  mac: macAddressSchema.optional(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serial: z.string().max(255).optional(),
  platform: platformEnum.default('UNKNOWN'),
  publicIp: ipAddressSchema,
  appVersion: appVersionSchema,
  osVersion: z.string().max(50).optional(),
});

export const deviceHeartbeatSchema = z.object({
  deviceId: deviceIdSchema.optional(),
  mac: macAddressSchema.optional(),
  appVersion: appVersionSchema,
});

export const deviceCheckSchema = z.object({
  deviceId: deviceIdSchema.optional(),
  mac: macAddressSchema.optional(),
});

// ============================================================
// QR / TOKEN SCHEMAS
// ============================================================

export const deviceTokenResolveSchema = z.object({
  token: z.string().length(32, 'Invalid token'),
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
