import type { PlanId } from "@/lib/supabase/types";
import { normalizePlan } from "@/lib/plan-features";

/** Chat cost protection: max messages per session and per day by plan */
export const CHAT_USAGE_LIMITS: Record<
  PlanId,
  { perSession: number; perDay: number }
> = {
  starter: { perSession: 40, perDay: 300 },
  pro: { perSession: 120, perDay: 1500 },
  elite: { perSession: 300, perDay: 5000 },
};

export function getChatUsageLimits(
  plan: string | null | undefined
): { perSession: number; perDay: number } {
  const p = normalizePlan(plan);
  return CHAT_USAGE_LIMITS[p];
}
