import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { sendResendEmail } from "@/lib/resend";

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

  const expiresAt = clinic.plan_expires_at
    ? new Date(clinic.plan_expires_at).toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    : "N/A";

  const result = await sendResendEmail({
    to: ownerEmail,
    subject: `DentraFlow — Plan renewal reminder for ${clinic.name}`,
    html: `
      <p>Hi,</p>
      <p>This is a reminder that your DentraFlow plan for <strong>${clinic.name}</strong> (${clinic.plan}) expires on <strong>${expiresAt}</strong>.</p>
      <p>Renew at your convenience to keep your AI receptionist running without interruption.</p>
      <p>— DentraFlow</p>
    `,
  });

  if (!result.ok) {
    console.error("Resend error", result.error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, sentTo: ownerEmail });
}
