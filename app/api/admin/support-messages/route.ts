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
  const { data, error } = await admin
    .from("support_messages")
    .select("id, clinic_id, user_id, subject, body, created_at, admin_reply, admin_replied_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const clinics = await admin.from("clinics").select("id, name");
  const clinicMap = new Map((clinics.data || []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const list = (data || []).map((m: { clinic_id: string; [k: string]: unknown }) => ({
    ...m,
    clinic_name: clinicMap.get(m.clinic_id) ?? "—",
  }));
  return NextResponse.json({ messages: list });
}
