import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";

/**
 * GET /api/app/support — list support cases for the current user's clinic.
 */
export async function GET(request: Request) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 });
  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { data: rows, error } = await admin
    .from("support_messages")
    .select("id, subject, body, created_at, admin_reply, admin_replied_at, status")
    .eq("clinic_id", clinicId)
    .eq("app_user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cases: rows ?? [] });
}

/**
 * POST /api/app/support — send a support message. Auth required; user must be clinic member.
 * Body: { subject?: string, message: string }
 */
export async function POST(request: Request) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 });

  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { error: insertErr } = await admin.from("support_messages").insert({
    clinic_id: clinicId,
    app_user_id: ctx.user.id,
    subject: subject || "Support request",
    body: message,
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
