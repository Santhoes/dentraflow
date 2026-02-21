import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/stats — summary counts for admin dashboard (admin only).
 */
export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const [clinicsRes, appointmentsRes, supportRes, expiringRes] = await Promise.all([
    admin.from("clinics").select("id", { count: "exact", head: true }),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("start_time", todayStart)
      .lt("start_time", todayEnd),
    admin
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .is("admin_reply", null),
    admin
      .from("clinics")
      .select("id", { count: "exact", head: true })
      .not("plan_expires_at", "is", null)
      .lte("plan_expires_at", in30Days)
      .gte("plan_expires_at", now.toISOString()),
  ]);

  return NextResponse.json({
    totalClinics: clinicsRes.count ?? 0,
    appointmentsToday: appointmentsRes.count ?? 0,
    supportUnreplied: supportRes.count ?? 0,
    plansExpiringSoon: expiringRes.count ?? 0,
  });
}
