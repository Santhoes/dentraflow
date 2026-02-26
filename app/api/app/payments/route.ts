import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";

async function getClinicIdForRequest(request: Request): Promise<string | null> {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx?.user?.id) return null;
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  return (member as { clinic_id: string } | null)?.clinic_id ?? null;
}

/**
 * GET /api/app/payments — list payments for the current clinic (subscription + deposit/paid bookings).
 * Auth: cookie session or Bearer token (app_sessions). Query: from, to, page, limit.
 */
export async function GET(request: Request) {
  const clinicId = await getClinicIdForRequest(request);
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const from = fromParam ? new Date(fromParam) : null;
  const to = toParam ? new Date(toParam) : null;

  const admin = createAdminClient();
  let q = admin
    .from("payments")
    .select("id, amount, plan, created_at, status, tax_amount, country, appointment_id", { count: "exact" })
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (from && !Number.isNaN(from.getTime())) {
    q = q.gte("created_at", from.toISOString());
  }
  if (to && !Number.isNaN(to.getTime())) {
    q = q.lte("created_at", to.toISOString());
  }

  const fromRow = (page - 1) * limit;
  const { data, count, error } = await q.range(fromRow, fromRow + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    payments: data ?? [],
    total: count ?? 0,
  });
}
