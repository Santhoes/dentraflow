import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/support-messages/[id] — get one support case (admin only).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(_request);
  if (err) return err;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Message ID required" }, { status: 400 });

  const admin = createAdminClient();
  let data: Record<string, unknown> | null = null;
  const { data: withStatus, error: err1 } = await admin
    .from("support_messages")
    .select("id, clinic_id, user_id, subject, body, created_at, admin_reply, admin_replied_at, status")
    .eq("id", id)
    .single();
  if (err1 && (err1.message?.includes("status") || err1.message?.includes("column"))) {
    const { data: fallback, error: err2 } = await admin
      .from("support_messages")
      .select("id, clinic_id, user_id, subject, body, created_at, admin_reply, admin_replied_at")
      .eq("id", id)
      .single();
    if (err2 || !fallback) {
      if (err2?.code === "PGRST116") return NextResponse.json({ error: "Case not found" }, { status: 404 });
      return NextResponse.json({ error: err2?.message ?? "Not found" }, { status: 500 });
    }
    data = { ...fallback, status: "open" };
  } else if (err1 || !withStatus) {
    if (err1?.code === "PGRST116") return NextResponse.json({ error: "Case not found" }, { status: 404 });
    return NextResponse.json({ error: err1?.message ?? "Not found" }, { status: 500 });
  } else {
    data = withStatus as Record<string, unknown>;
  }
  const clinics = await admin.from("clinics").select("id, name");
  const clinicMap = new Map((clinics.data || []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const { data: replies } = await admin
    .from("support_replies")
    .select("id, from_role, body, created_at")
    .eq("case_id", id)
    .order("created_at", { ascending: true });
  return NextResponse.json({
    ...data,
    clinic_name: clinicMap.get((data.clinic_id as string)) ?? "—",
    replies: Array.isArray(replies) ? replies : [],
  });
}

/**
 * PATCH /api/admin/support-messages/[id] — set admin reply and/or status (admin only).
 * Body: { admin_reply?: string, status?: 'open' | 'closed' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Message ID required" }, { status: 400 });

  let body: { admin_reply?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { admin_reply?: string | null; admin_replied_at?: string; status?: string } = {};
  if (typeof body.admin_reply === "string") {
    updates.admin_reply = body.admin_reply.trim() || null;
    updates.admin_replied_at = new Date().toISOString();
  }
  if (body.status === "open" || body.status === "closed") updates.status = body.status;
  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Provide admin_reply and/or status" }, { status: 400 });

  const admin = createAdminClient();
  if (typeof updates.admin_reply === "string") {
    const { error: replyErr } = await admin.from("support_replies").insert({
      case_id: id,
      from_role: "admin",
      user_id: null,
      body: updates.admin_reply,
    });
    if (replyErr) {
      if (!replyErr.message?.includes("support_replies") && !replyErr.message?.includes("relation")) {
        console.error("admin support_replies insert", replyErr);
      }
    }
  }
  let result = await admin.from("support_messages").update(updates).eq("id", id).select().single();
  if (result.error && (result.error.message?.includes("status") || result.error.message?.includes("column"))) {
    const fallbackUpdates: { admin_reply?: string | null; admin_replied_at?: string } = {};
    if (typeof updates.admin_reply !== "undefined") fallbackUpdates.admin_reply = updates.admin_reply;
    if (updates.admin_replied_at) fallbackUpdates.admin_replied_at = updates.admin_replied_at;
    if (Object.keys(fallbackUpdates).length === 0)
      return NextResponse.json({ error: "Status column not available. Run migration 20250233000000_support_messages_status.sql." }, { status: 400 });
    result = await admin.from("support_messages").update(fallbackUpdates).eq("id", id).select().single();
  }
  if (result.error) {
    if (result.error.code === "PGRST116") return NextResponse.json({ error: "Message not found" }, { status: 404 });
    console.error("admin support-messages PATCH", result.error);
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json({ message: result.data });
}
