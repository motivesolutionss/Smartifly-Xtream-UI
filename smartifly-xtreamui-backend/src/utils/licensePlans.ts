export const VALID_PLANS = ['TRIAL', 'MONTHLY', 'YEARLY'] as const;
export type PlanType = typeof VALID_PLANS[number];

export function normalizePlan(input?: string | null): PlanType {
  if (!input) return 'TRIAL';
  const plan = input.toUpperCase();
  return VALID_PLANS.includes(plan as PlanType)
    ? (plan as PlanType)
    : 'TRIAL';
}
