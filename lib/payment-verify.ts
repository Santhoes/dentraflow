import { PLANS } from "@/lib/supabase/types";
import { computePriceWithTax } from "@/lib/tax-by-country";

export function getCapturedAmountUsd(captureData: {
  purchase_units?: { payments?: { captures?: { amount?: { value?: string } }[] } }[];
}): number | null {
  const value = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
  if (value == null) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** Verify captured amount is within expected range for plan (base price up to 2x for tax). */
export function verifyCaptureAmountForPlan(
  capturedUsd: number,
  planId: string,
  country: string
): { ok: boolean; error?: string } {
  const planInfo = PLANS.find((p) => p.id === planId);
  if (!planInfo) return { ok: false, error: "Invalid plan" };
  const minUsd = planInfo.priceCents / 100;
  const { totalCents } = computePriceWithTax(planInfo.priceCents, country || "Other");
  const maxUsd = Math.max(minUsd * 2, totalCents / 100);
  if (capturedUsd < minUsd - 0.01) return { ok: false, error: "Capture amount below plan price" };
  if (capturedUsd > maxUsd + 0.01) return { ok: false, error: "Capture amount mismatch" };
  return { ok: true };
}
