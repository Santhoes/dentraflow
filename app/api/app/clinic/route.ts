import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";
import { sendResendEmail } from "@/lib/resend";
import { slugFromName } from "@/lib/supabase/types";

const MAX_POLICY_LENGTH = 15000;
const MAX_PAYPAL_MERCHANT_ID_LENGTH = 64;
const PAYPAL_MERCHANT_ID_REGEX = /^[A-Za-z0-9_-]+$/;

function validateDepositRules(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof obj.default_amount === "number" && obj.default_amount >= 0 && obj.default_amount <= 100000) {
    out.default_amount = Math.round(obj.default_amount * 100) / 100;
  }
  if (typeof obj.currency === "string" && /^[A-Z]{3}$/.test(obj.currency.trim())) {
    out.currency = obj.currency.trim();
  }
  if (typeof obj.by_service === "object" && obj.by_service !== null && !Array.isArray(obj.by_service)) {
    const byService: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj.by_service)) {
      if (typeof k === "string" && typeof v === "number" && v >= 0 && v <= 100000) {
        byService[k.trim().slice(0, 200)] = Math.round(v * 100) / 100;
      }
    }
    if (Object.keys(byService).length > 0) out.by_service = byService;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * PATCH /api/app/clinic — update clinic details. Requires auth; user must be a clinic member.
 * Body: { name?, country?, timezone?, ... cancellation_policy_text?, paypal_merchant_id?, deposit_required?, deposit_rules_json? (Elite only) }
 * Sends email to clinic team (members) about the update.
 */
export async function PATCH(request: Request) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();

  if (!member?.clinic_id) {
    return NextResponse.json({ error: "No clinic" }, { status: 403 });
  }

  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { data: currentClinic } = await admin
    .from("clinics")
    .select("name, slug, plan")
    .eq("id", clinicId)
    .single();
  const plan = (currentClinic as { plan?: string } | null)?.plan ?? "starter";
  const isElite = plan === "elite";

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") {
    const name = body.name.trim();
    updates.name = name;
    const newSlug = slugFromName(name);
    const { data: existingBySlug } = await admin
      .from("clinics")
      .select("id")
      .eq("slug", newSlug)
      .neq("id", clinicId)
      .maybeSingle();
    updates.slug = existingBySlug ? `${newSlug}-${Date.now().toString(36)}` : newSlug;
  }
  if (typeof body.country === "string") updates.country = body.country.trim();
  if (typeof body.timezone === "string") updates.timezone = body.timezone;
  if (typeof body.phone === "string") updates.phone = body.phone.trim() || null;
  if (typeof body.accepts_insurance === "boolean") updates.accepts_insurance = body.accepts_insurance;
  if (typeof body.insurance_notes === "string") updates.insurance_notes = body.insurance_notes.trim() || null;
  if (body.working_hours !== undefined && (body.working_hours === null || (typeof body.working_hours === "object" && body.working_hours !== null))) updates.working_hours = body.working_hours;
  if (typeof body.website_domain === "string") updates.website_domain = body.website_domain.trim() || null;
  if (typeof body.logo_url === "string") updates.logo_url = body.logo_url.trim() || null;
  if (typeof body.widget_primary_color === "string") updates.widget_primary_color = body.widget_primary_color.trim() || null;
  if (typeof body.widget_background_color === "string") updates.widget_background_color = body.widget_background_color.trim() || null;
  if (typeof body.whatsapp_phone === "string") updates.whatsapp_phone = body.whatsapp_phone.trim() || null;
  if (typeof body.default_appointment_charge === "number" && body.default_appointment_charge >= 0) updates.default_appointment_charge = body.default_appointment_charge;
  if (body.default_appointment_charge === null) updates.default_appointment_charge = null;
  if (body.settings_completed_at === true) updates.settings_completed_at = new Date().toISOString();
  if (typeof body.settings_completed_at === "string") updates.settings_completed_at = body.settings_completed_at || null;
  if (typeof body.address_line1 === "string") updates.address_line1 = body.address_line1.trim() || null;
  if (typeof body.address_line2 === "string") updates.address_line2 = body.address_line2.trim() || null;
  if (typeof body.city === "string") updates.city = body.city.trim() || null;
  if (typeof body.state === "string") updates.state = body.state.trim() || null;
  if (typeof body.postal_code === "string") updates.postal_code = body.postal_code.trim() || null;

  if (typeof body.cancellation_policy_text === "string") {
    const policy = body.cancellation_policy_text.trim();
    updates.cancellation_policy_text = policy.length <= MAX_POLICY_LENGTH ? (policy || null) : policy.slice(0, MAX_POLICY_LENGTH);
  }
  if (body.cancellation_policy_text === null) updates.cancellation_policy_text = null;

  if (isElite) {
    if (typeof body.paypal_merchant_id === "string") {
      const raw = body.paypal_merchant_id.trim();
      if (raw === "") {
        updates.paypal_merchant_id = null;
      } else if (raw.length <= MAX_PAYPAL_MERCHANT_ID_LENGTH && PAYPAL_MERCHANT_ID_REGEX.test(raw)) {
        updates.paypal_merchant_id = raw;
      }
    }
    if (body.paypal_merchant_id === null) updates.paypal_merchant_id = null;
    if (typeof body.deposit_required === "boolean") updates.deposit_required = body.deposit_required;
    if (typeof body.require_policy_agreement === "boolean") updates.require_policy_agreement = body.require_policy_agreement;
    if (body.deposit_rules_json !== undefined) {
      const parsed = validateDepositRules(body.deposit_rules_json);
      updates.deposit_rules_json = parsed;
    }
  }

  const { error: updateError } = await admin
    .from("clinics")
    .update(updates)
    .eq("id", clinicId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const clinicName = (updates.name as string) || (currentClinic as { name?: string } | null)?.name || "Clinic";
  const { data: members } = await admin
    .from("clinic_members")
    .select("app_user_id")
    .eq("clinic_id", clinicId);
  const appUserIds = (members || []).map((m: { app_user_id: string | null }) => m.app_user_id).filter(Boolean) as string[];
  const emails: string[] = [];
  if (appUserIds.length > 0) {
    const { data: users } = await admin.from("app_users").select("email").in("id", appUserIds);
    for (const u of users ?? []) emails.push((u as { email: string }).email);
  }
  if (emails.length > 0) {
    await sendResendEmail({
      to: emails,
      subject: `DentraFlow — ${clinicName} settings updated`,
      html: `<p>Hi,</p><p>Clinic details for <strong>${clinicName}</strong> have been updated in DentraFlow.</p><p>— DentraFlow</p>`,
    });
  }

  return NextResponse.json({ ok: true });
}
