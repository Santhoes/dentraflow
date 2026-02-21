import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/app/support/[id] — get one support case (auth, must be clinic member).
 * PATCH /api/app/support/[id] — update own message (subject/body) only if no admin reply yet.
 * DELETE /api/app/support/[id] — delete own case only if no admin reply yet.
 */

async function getAuthAndCase(
  request: Request,
  id: string
): Promise<{ user: { id: string }; clinicId: string; caseRow: Record<string, unknown> } | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Server config" }, { status: 500 });

  const supabase = createClient(url, anonKey);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 });

  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { data: caseRow, error: caseErr } = await admin
    .from("support_messages")
    .select("id, clinic_id, user_id, subject, body, created_at, admin_reply, admin_replied_at")
    .eq("id", id)
    .single();
  if (caseErr || !caseRow) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if ((caseRow as { clinic_id: string }).clinic_id !== clinicId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return { user: { id: user.id }, clinicId, caseRow: caseRow as Record<string, unknown> };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAuthAndCase(request, id);
  if (result instanceof NextResponse) return result;
  return NextResponse.json({ case: result.caseRow });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getAuthAndCase(request, id);
  if (result instanceof NextResponse) return result;
  const { user, caseRow } = result;
  if ((caseRow.user_id as string) !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (caseRow.admin_reply != null)
    return NextResponse.json({ error: "Cannot edit after support has replied" }, { status: 400 });

  let body: { subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const updates: { subject?: string; body?: string } = {};
  if (typeof body.subject === "string") updates.subject = body.subject.trim().slice(0, 200);
  if (typeof body.message === "string") updates.body = body.message.trim();
  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Send subject and/or message" }, { status: 400 });
  if (updates.body === "")
    return NextResponse.json({ error: "message cannot be empty" }, { status: 400 });

  const admin = createAdminClient();
  const { error: updateErr } = await admin
    .from("support_messages")
    .update(updates)
    .eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getAuthAndCase(_request, id);
  if (result instanceof NextResponse) return result;
  const { user, caseRow } = result;
  if ((caseRow.user_id as string) !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (caseRow.admin_reply != null)
    return NextResponse.json({ error: "Cannot delete after support has replied" }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("support_messages").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
