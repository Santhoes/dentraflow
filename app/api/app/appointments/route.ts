import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/resend";
import { sendWhatsApp } from "@/lib/whatsapp";
import { hasPlanFeature } from "@/lib/plan-features";
import { renderEmailHtml, escapeHtml } from "@/lib/email-template";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar-url";

/**
 * POST /api/app/appointments — create an appointment. Auth required; user must be clinic member.
 * Body: { patient_id: string } or { patient_email: string, patient_name: string }, and start_time, end_time (ISO).
 * Sends confirmation email to patient (if email) and notifies clinic team.
 */
export async function POST(request: Request) {
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

  let body: {
    patient_id?: string;
    patient_email?: string;
    patient_name?: string;
    start_time?: string;
    end_time?: string;
    location_id?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const startTime = body.start_time?.trim();
  const endTime = body.end_time?.trim();
  let locationId: string | null = body.location_id === null || body.location_id === "" ? null : body.location_id?.trim() || null;
  if (!startTime || !endTime) {
    return NextResponse.json({ error: "start_time and end_time required" }, { status: 400 });
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

  if (locationId) {
    const { data: loc } = await admin
      .from("clinic_locations")
      .select("id")
      .eq("id", locationId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (!loc) locationId = null;
  }

  let patientId: string;
  let patientEmail: string | null = null;
  let patientName: string | null = null;
  let patientPhone: string | null = null;

  if (body.patient_id) {
    const { data: patient } = await admin
      .from("patients")
      .select("id, full_name, email, phone")
      .eq("id", body.patient_id)
      .eq("clinic_id", clinicId)
      .single();
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    patientId = (patient as { id: string }).id;
    patientName = (patient as { full_name: string }).full_name;
    patientEmail = (patient as { email: string | null }).email;
    patientPhone = (patient as { phone: string | null }).phone;
  } else if (body.patient_email?.trim() && body.patient_name?.trim()) {
    const { data: existing } = await admin
      .from("patients")
      .select("id, full_name, email, phone")
      .eq("clinic_id", clinicId)
      .ilike("email", body.patient_email.trim())
      .limit(1)
      .maybeSingle();
    if (existing) {
    patientId = (existing as { id: string }).id;
    patientName = (existing as { full_name: string }).full_name;
    patientEmail = (existing as { email: string | null }).email;
    patientPhone = (existing as { phone: string | null }).phone;
    } else {
      const { data: inserted, error: insertErr } = await admin
        .from("patients")
        .insert({
          clinic_id: clinicId,
          full_name: body.patient_name.trim(),
          email: body.patient_email.trim(),
        })
        .select("id, full_name, email, phone")
        .single();
      if (insertErr || !inserted) {
        return NextResponse.json({ error: insertErr?.message || "Failed to create patient" }, { status: 500 });
      }
      patientId = (inserted as { id: string }).id;
      patientName = (inserted as { full_name: string }).full_name;
      patientEmail = (inserted as { email: string | null }).email;
      patientPhone = (inserted as { phone: string | null }).phone;
    }
  } else {
    return NextResponse.json({ error: "Provide patient_id or patient_email and patient_name" }, { status: 400 });
  }

  const insertPayload: { clinic_id: string; patient_id: string; start_time: string; end_time: string; status: string; location_id?: string | null } = {
    clinic_id: clinicId,
    patient_id: patientId,
    start_time: startTime,
    end_time: endTime,
    status: "scheduled",
  };
  if (locationId) insertPayload.location_id = locationId;
  const { data: appointment, error: apptErr } = await admin
    .from("appointments")
    .insert(insertPayload)
    .select("id")
    .single();

  if (apptErr || !appointment) {
    return NextResponse.json({ error: apptErr?.message || "Failed to create appointment" }, { status: 500 });
  }

  const { data: clinic } = await admin.from("clinics").select("name, plan, whatsapp_phone, phone").eq("id", clinicId).single();
  const clinicName = (clinic as { name: string } | null)?.name || "Clinic";
  const clinicPlan = (clinic as { plan?: string } | null)?.plan;
  const c = clinic as { whatsapp_phone?: string | null; phone?: string | null } | null;
  const clinicPhone = c?.whatsapp_phone?.trim() || c?.phone?.trim();
  const startDate = new Date(startTime).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
  const endDate = new Date(endTime).toLocaleString(undefined, { timeStyle: "short" });
  const isProOrElite = clinicPlan === "pro" || clinicPlan === "elite";
  const gcalUrl =
    isProOrElite && startTime && endTime
      ? buildGoogleCalendarUrl({
          title: `Appointment at ${clinicName}`,
          start: startTime,
          end: endTime,
          details: clinicName,
        })
      : null;

  if (patientEmail) {
    await sendResendEmail({
      to: patientEmail,
      subject: `Appointment confirmed — ${clinicName}`,
      html: renderEmailHtml({
        greeting: patientName ? `Hi ${escapeHtml(patientName)},` : "Hi,",
        body: `<p>Your appointment at <strong>${escapeHtml(clinicName)}</strong> is confirmed.</p><p><strong>When:</strong> ${escapeHtml(startDate)} – ${escapeHtml(endDate)}</p><p>If you need to change or cancel, reply to this email or contact the clinic.</p>`,
        link: gcalUrl ? { text: "Add to Google Calendar", url: gcalUrl } : undefined,
        footer: `— ${escapeHtml(clinicName)}`,
      }),
    });
  }

  const { data: members } = await admin.from("clinic_members").select("user_id").eq("clinic_id", clinicId);
  const emails: string[] = [];
  for (const m of members || []) {
    try {
      const { data: { user: u } } = await admin.auth.admin.getUserById((m as { user_id: string }).user_id);
      if (u?.email) emails.push(u.email);
    } catch {
      // skip
    }
  }
  if (emails.length > 0) {
    await sendResendEmail({
      to: emails,
      subject: `New appointment — ${clinicName}`,
      html: `
        <p>Hi,</p>
        <p>A new appointment was booked for <strong>${clinicName}</strong>.</p>
        <p><strong>Patient:</strong> ${patientName || "—"}${patientEmail ? ` (${patientEmail})` : ""}</p>
        <p><strong>When:</strong> ${startDate} – ${endDate}</p>
        <p>— DentraFlow</p>
      `,
    });
  }

  if (hasPlanFeature(clinicPlan, "whatsApp") && clinicPhone && clinicPhone.replace(/\D/g, "").length >= 10) {
    const staffMsg = `New appointment at ${clinicName}: ${patientName || "Patient"} — ${startDate} – ${endDate}.`;
    sendWhatsApp({ to: clinicPhone, body: staffMsg }).catch((e) => console.error("WhatsApp to clinic:", e));
    if (patientPhone && patientPhone.replace(/\D/g, "").length >= 10) {
      const patientMsg = `Hi${patientName ? ` ${patientName}` : ""}, your appointment at ${clinicName} is confirmed for ${startDate} – ${endDate}. Reply if you need to change or cancel.`;
      sendWhatsApp({ to: patientPhone, body: patientMsg }).catch((e) => console.error("WhatsApp to patient:", e));
    }
  }

  return NextResponse.json({ ok: true, appointment_id: (appointment as { id: string }).id });
}

/**
 * PATCH /api/app/appointments — mark past appointments (slot time over) as completed.
 * No body. Updates scheduled/confirmed appointments with end_time < now() to status 'completed'.
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
  const now = new Date().toISOString();

  const { error: updateErr } = await admin
    .from("appointments")
    .update({ status: "completed" })
    .eq("clinic_id", clinicId)
    .in("status", ["scheduled", "confirmed"])
    .lt("end_time", now);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
