import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";

/**
 * GET /api/app/support/[id] — get one support case (auth, must be clinic member).
 * PATCH /api/app/support/[id] — update own message (subject/body) only if no admin reply yet.
 * DELETE /api/app/support/[id] — delete own case only if no admin reply yet.
 */

async function getAuthAndCase(
  request: Request,
  id: string
): Promise<
  | { user: { id: string }; clinicId: string; caseRow: Record<string, unknown>; replies: unknown[] }
  | NextResponse
> {
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
  const { data: caseRow, error: caseErr } = await admin
    .from("support_messages")
    .select("id, clinic_id, user_id, app_user_id, subject, body, created_at, admin_reply, admin_replied_at, status")
    .eq("id", id)
    .single();
  if (caseErr || !caseRow) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if ((caseRow as { clinic_id: string }).clinic_id !== clinicId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: replies } = await admin
    .from("support_replies")
    .select("id, case_id, from_role, body, created_at")
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  return {
    user: { id: ctx.user.id },
    clinicId,
    caseRow: caseRow as Record<string, unknown>,
    replies: replies ?? [],
  };
}

function isCaseOwner(caseRow: Record<string, unknown>, appUserId: string): boolean {
  if ((caseRow.app_user_id as string) === appUserId) return true;
  if ((caseRow.user_id as string) === appUserId) return true;
  return false;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAuthAndCase(request, id);
  if (result instanceof NextResponse) return result;
  return NextResponse.json({ case: result.caseRow, replies: result.replies });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getAuthAndCase(request, id);
  if (result instanceof NextResponse) return result;
  const { user, caseRow } = result;
  if (!isCaseOwner(caseRow, user.id))
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
  if (!isCaseOwner(caseRow, user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (caseRow.admin_reply != null)
    return NextResponse.json({ error: "Cannot delete after support has replied" }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("support_messages").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
