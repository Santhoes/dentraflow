import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth-server";
import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml, escapeHtml } from "@/lib/email-template";

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
    .select("app_user_id")
    .eq("clinic_id", clinicId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!ownerRow) {
    return NextResponse.json({ error: "Clinic has no owner" }, { status: 400 });
  }

  const appUserId = (ownerRow as { app_user_id: string | null }).app_user_id;
  if (!appUserId) {
    return NextResponse.json({ error: "Clinic owner is not linked to an app user" }, { status: 400 });
  }

  const { data: appUser, error: appUserError } = await admin
    .from("app_users")
    .select("email")
    .eq("id", appUserId)
    .maybeSingle();

  if (appUserError) {
    console.error("admin send-plan-expired app_user lookup", appUserError);
    return NextResponse.json({ error: "Could not resolve owner email" }, { status: 500 });
  }

  const ownerEmail = (appUser as { email?: string | null } | null)?.email ?? "";
  if (!ownerEmail) {
    return NextResponse.json({ error: "Owner has no email" }, { status: 400 });
  }

  const clinicName = (clinic as { name: string }).name;
  const plan = (clinic as { plan: string }).plan;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com").replace(/\/$/, "");
  const result = await sendResendEmail({
    to: ownerEmail,
    subject: `DentraFlow — Your ${clinicName} plan has expired`,
    html: renderEmailHtml({
      body: `<p>Your DentraFlow plan for <strong>${escapeHtml(clinicName)}</strong> (${escapeHtml(plan)}) has expired.</p><p>Renew to keep your AI receptionist and chat widget active.</p>`,
      button: { text: "Renew plan", url: `${appUrl}/app/plan` },
      link: { text: "Visit app", url: `${appUrl}/app` },
    }),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 502 });
  }
  return NextResponse.json({ success: true, sentTo: ownerEmail });
}
