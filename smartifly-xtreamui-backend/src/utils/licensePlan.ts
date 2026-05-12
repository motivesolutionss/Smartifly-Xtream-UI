// ============================================================
// src/utils/licensePlan.ts
// SMARTIFLY XTREAM UI — ENTERPRISE LICENSE UTILITIES
// ============================================================

import type { LicensePlan } from '@prisma/client';

export const TRIAL_DURATION_DAYS = 7;

const DEFAULT_DURATION_DAYS: Record<LicensePlan, number | null> = {
  TRIAL: TRIAL_DURATION_DAYS,
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
  LIFETIME: null,
};

/**
 * Compute expiry date based on plan
 */
export function computeExpiry(plan: LicensePlan, base = new Date()): Date | null {
  const days = DEFAULT_DURATION_DAYS[plan];
  if (days === null) return null;

  const expiry = new Date(base);
  expiry.setUTCDate(expiry.getUTCDate() + days);
  return expiry;
}

/**
 * Get display name for a plan
 */
export function getPlanDisplayName(plan: LicensePlan): string {
  switch (plan) {
    case 'TRIAL': return '7-Day Trial';
    case 'MONTHLY': return 'Monthly Subscription';
    case 'QUARTERLY': return 'Quarterly Subscription';
    case 'YEARLY': return 'Yearly Subscription';
    case 'LIFETIME': return 'Lifetime Access';
    default: return plan;
  }
}
