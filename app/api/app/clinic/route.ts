import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/resend";

/**
 * PATCH /api/app/clinic — update clinic details. Requires auth; user must be a clinic member.
 * Body: { name?, country?, timezone?, phone?, accepts_insurance?, insurance_notes?, working_hours?, website_domain?, logo_url?, widget_primary_color?, widget_background_color?, whatsapp_phone?, default_appointment_charge?, settings_completed_at?, address_line1?, address_line2?, city?, state?, postal_code? }
 * Sends email to clinic team (members) about the update.
 */
export async function PATCH(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Server config" }, { status: 500 });

  const supabase = createClient(url, anonKey);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

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
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member?.clinic_id) {
    return NextResponse.json({ error: "No clinic" }, { status: 403 });
  }

  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { data: currentClinic } = await admin.from("clinics").select("name").eq("id", clinicId).single();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") updates.name = body.name.trim();
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
    .select("user_id")
    .eq("clinic_id", clinicId);
  const userIds = (members || []).map((m: { user_id: string }) => m.user_id);
  const emails: string[] = [];
  for (const uid of userIds) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(uid);
      if (user?.email) emails.push(user.email);
    } catch {
      // skip
    }
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
