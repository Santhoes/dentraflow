import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/support-messages — list all support messages (admin only).
 */
export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  const admin = createAdminClient();
  let data: { clinic_id: string; [k: string]: unknown }[] | null = null;
  let error: { message?: string } | null = null;
  const { data: withStatus, error: err1 } = await admin
    .from("support_messages")
    .select("id, clinic_id, user_id, subject, body, created_at, admin_reply, admin_replied_at, status")
    .order("created_at", { ascending: false })
    .limit(500);
  if (err1 && (err1.message?.includes("status") || err1.message?.includes("column"))) {
    const { data: fallback, error: err2 } = await admin
      .from("support_messages")
      .select("id, clinic_id, user_id, subject, body, created_at, admin_reply, admin_replied_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
    data = fallback as { clinic_id: string; [k: string]: unknown }[];
  } else if (err1) {
    return NextResponse.json({ error: err1.message }, { status: 500 });
  } else {
    data = withStatus as { clinic_id: string; [k: string]: unknown }[];
  }
  const clinics = await admin.from("clinics").select("id, name");
  const clinicMap = new Map((clinics.data || []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const list = (data || []).map((m) => ({
    ...m,
    clinic_name: clinicMap.get(m.clinic_id) ?? "—",
    status: (m.status as string) || "open",
  }));
  return NextResponse.json({ messages: list });
}
