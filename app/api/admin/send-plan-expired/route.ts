import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { sendResendEmail } from "@/lib/resend";

/**
 * POST /api/admin/send-plan-expired — send "plan expired" email to clinic owner. Body: { clinicId }.
 */
export async function POST(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  let body: { clinicId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const clinicId = body.clinicId;
  if (!clinicId) {
    return NextResponse.json({ error: "clinicId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .select("id, name, plan, plan_expires_at")
    .eq("id", clinicId)
    .single();

  if (clinicError || !clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  const { data: ownerRow } = await admin
    .from("clinic_members")
    .select("user_id")
    .eq("clinic_id", clinicId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!ownerRow) {
    return NextResponse.json({ error: "Clinic has no owner" }, { status: 400 });
  }

  const userId = (ownerRow as { user_id: string }).user_id;
  let ownerEmail: string;
  try {
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    ownerEmail = user?.email ?? "";
  } catch {
    return NextResponse.json({ error: "Could not resolve owner email" }, { status: 500 });
  }

  if (!ownerEmail) {
    return NextResponse.json({ error: "Owner has no email" }, { status: 400 });
  }

  const clinicName = (clinic as { name: string }).name;
  const plan = (clinic as { plan: string }).plan;
  const result = await sendResendEmail({
    to: ownerEmail,
    subject: `DentraFlow — Your ${clinicName} plan has expired`,
    html: `
      <p>Hi,</p>
      <p>Your DentraFlow plan for <strong>${clinicName}</strong> (${plan}) has expired.</p>
      <p>Renew to keep your AI receptionist and chat widget active.</p>
      <p>— DentraFlow</p>
    `,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 502 });
  }
  return NextResponse.json({ success: true, sentTo: ownerEmail });
}
