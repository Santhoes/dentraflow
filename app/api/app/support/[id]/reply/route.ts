import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";

/**
 * POST /api/app/support/[id]/reply — add a follow-up message to an existing case. Reopens case if closed.
 * Body: { message: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: caseId } = await params;
  if (!caseId) return NextResponse.json({ error: "Case ID required" }, { status: 400 });

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

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
    .select("id, clinic_id, status")
    .eq("id", caseId)
    .single();
  if (caseErr || !caseRow) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if ((caseRow as { clinic_id: string }).clinic_id !== clinicId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const statusCol = (caseRow as { status?: string }).status;
  if (statusCol === "closed") {
    return NextResponse.json(
      { error: "Case is closed. You cannot add messages. Reopen the case from Support to continue." },
      { status: 400 }
    );
  }

  const { error: insertErr } = await admin.from("support_replies").insert({
    case_id: caseId,
    from_role: "user",
    app_user_id: ctx.user.id,
    body: message,
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
