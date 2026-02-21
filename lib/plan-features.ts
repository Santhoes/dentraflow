import type { PlanId } from "@/lib/supabase/types";
import { PLAN_LIMITS } from "@/lib/supabase/types";

/** Plan order for comparison: starter < pro < elite */
const PLAN_ORDER: Record<PlanId, number> = {
  starter: 0,
  pro: 1,
  elite: 2,
};

/** Features that require at least this plan to be visible/available */
export const PLAN_FEATURE_MAP: Record<string, PlanId> = {
  overview: "starter",
  settings: "starter",
  appointments: "starter",
  patients: "starter",
  plan: "starter",
  basicAnalytics: "starter",
  advancedAnalytics: "pro",
  multiLocation: "pro",
  briefings: "elite",
  modifyCancelViaAI: "pro",
  prioritySupport: "pro",
  unlimitedLocations: "elite",
  whatsApp: "elite",
  advancedInsights: "elite",
  noShowRecovery: "elite",
  customBranding: "elite",
};

/** Normalize plan string from DB (e.g. legacy "enterprise" -> "elite") */
export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === "pro" || plan === "elite") return plan;
  if (plan === "enterprise") return "elite";
  return "starter";
}

/** True if the clinic plan includes the given feature */
export function hasPlanFeature(plan: string | null | undefined, feature: keyof typeof PLAN_FEATURE_MAP): boolean {
  const p = normalizePlan(plan);
  const minPlan = PLAN_FEATURE_MAP[feature];
  if (!minPlan) return false;
  return PLAN_ORDER[p] >= PLAN_ORDER[minPlan];
}

/** Compare plans: true if plan >= minPlan */
export function planAtLeast(plan: string | null | undefined, minPlan: PlanId): boolean {
  return PLAN_ORDER[normalizePlan(plan)] >= PLAN_ORDER[minPlan];
}

/** Get plan limit for a key (locations, aiAgents, chatWidgets). Returns null for unlimited. */
export function getPlanLimit(
  plan: string | null | undefined,
  key: "locations" | "aiAgents" | "chatWidgets"
): number | null {
  return PLAN_LIMITS[normalizePlan(plan)][key];
}

/** Format limit for display: "3" or "Unlimited" */
export function formatPlanLimit(value: number | null): string {
  return value === null ? "Unlimited" : String(value);
}
