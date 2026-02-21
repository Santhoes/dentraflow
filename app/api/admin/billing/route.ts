import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10)));
  const offset = (page - 1) * limit;

  const admin = createAdminClient();

  const { data: clinics, error: clinicsError, count } = await admin
    .from("clinics")
    .select("id, name, slug, plan, plan_expires_at", { count: "exact" })
    .order("name")
    .range(offset, offset + limit - 1);

  if (clinicsError) {
    console.error("admin billing clinics", clinicsError);
    return NextResponse.json({ error: "Failed to fetch clinics" }, { status: 500 });
  }

  const list = clinics || [];
  const clinicIds = list.map((c) => c.id);

  const { data: payments } = await admin
    .from("payments")
    .select("clinic_id, amount, created_at, plan")
    .eq("status", "completed")
    .in("clinic_id", clinicIds);

  const paymentsByClinic: Record<string, { amount: number; created_at: string; plan: string }[]> = {};
  for (const p of payments || []) {
    const row = p as { clinic_id: string; amount: number; created_at?: string; plan: string };
    if (!paymentsByClinic[row.clinic_id]) paymentsByClinic[row.clinic_id] = [];
    paymentsByClinic[row.clinic_id].push({
      amount: row.amount,
      created_at: (row as { created_at?: string }).created_at || new Date().toISOString(),
      plan: row.plan,
    });
  }

  const { data: members } = await admin
    .from("clinic_members")
    .select("clinic_id, user_id, role")
    .eq("role", "owner")
    .in("clinic_id", clinicIds);

  const ownerIds = (members || []).map((m) => (m as { user_id: string }).user_id);
  const emailMap: Record<string, string> = {};
  for (const uid of ownerIds) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(uid);
      if (user?.email) emailMap[uid] = user.email;
    } catch {
      emailMap[uid] = "";
    }
  }

  const ownerByClinic: Record<string, string> = {};
  for (const m of members || []) {
    const row = m as { clinic_id: string; user_id: string };
    ownerByClinic[row.clinic_id] = emailMap[row.user_id] ?? "";
  }

  const result = list.map((c) => {
    const payList = paymentsByClinic[c.id] || [];
    const lastPayment = payList.length > 0
      ? payList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      plan: c.plan,
      plan_expires_at: c.plan_expires_at || null,
      owner_email: ownerByClinic[c.id] || "",
      last_payment: lastPayment
        ? { amount: lastPayment.amount, at: lastPayment.created_at, plan: lastPayment.plan }
        : null,
    };
  });

  return NextResponse.json({
    billing: result,
    total: count ?? 0,
    page,
    limit,
  });
}
