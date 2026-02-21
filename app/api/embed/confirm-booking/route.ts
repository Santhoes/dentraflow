import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClinicSignature } from "@/lib/chat-signature";
import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml } from "@/lib/email-template";
import { sendWhatsApp } from "@/lib/whatsapp";
import { hasPlanFeature } from "@/lib/plan-features";

/**
 * POST /api/embed/confirm-booking — create appointment from chat widget. Requires valid sig.
 * Body: { clinicSlug, sig, patient_email?, patient_name?, patient_phone?, start_time, end_time } (ISO times).
 * Sends confirmation email to patient and notifies clinic team. Elite: also sends WhatsApp to patient and clinic.
 */
export async function POST(request: Request) {
  let body: {
    clinicSlug?: string;
    sig?: string;
    patient_email?: string;
    patient_name?: string;
    patient_phone?: string;
    start_time?: string;
    end_time?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { clinicSlug, sig, patient_email, patient_name, patient_phone, start_time, end_time } = body;
  if (!clinicSlug?.trim() || !sig?.trim() || !start_time?.trim() || !end_time?.trim()) {
    return NextResponse.json({ error: "clinicSlug, sig, start_time, end_time required" }, { status: 400 });
  }
  if (!verifyClinicSignature(clinicSlug.trim(), sig.trim())) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .select("id, name, plan, plan_expires_at, whatsapp_phone, phone")
    .eq("slug", clinicSlug.trim())
    .single();
  if (clinicErr || !clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }
  const planExpiresAt = (clinic as { plan_expires_at?: string | null }).plan_expires_at;
  if (planExpiresAt && new Date(planExpiresAt) <= new Date()) {
    return NextResponse.json({ error: "Plan expired" }, { status: 403 });
  }

  const clinicId = (clinic as { id: string }).id;
  const clinicName = (clinic as { name: string }).name;
  const email = patient_email?.trim() || null;
  const name = (patient_name?.trim() || "Patient") as string;

  let patientId: string;
  let patientEmail: string | null = null;
  let patientPhone: string | null = patient_phone?.trim() || null;

  if (email) {
    const { data: existing } = await admin
      .from("patients")
      .select("id, full_name, email, phone")
      .eq("clinic_id", clinicId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (existing) {
      patientId = (existing as { id: string }).id;
      patientEmail = (existing as { email: string | null }).email;
      if (!(existing as { phone?: string | null }).phone && patientPhone) {
        await admin.from("patients").update({ phone: patientPhone }).eq("id", patientId);
      } else if ((existing as { phone?: string | null }).phone) {
        patientPhone = (existing as { phone: string | null }).phone;
      }
    } else {
      const { data: inserted, error: insertErr } = await admin
        .from("patients")
        .insert({ clinic_id: clinicId, full_name: name, email, phone: patientPhone })
        .select("id, email, phone")
        .single();
      if (insertErr || !inserted) {
        return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
      }
      patientId = (inserted as { id: string }).id;
      patientEmail = (inserted as { email: string | null }).email;
      patientPhone = (inserted as { phone: string | null }).phone ?? patientPhone;
    }
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("patients")
      .insert({ clinic_id: clinicId, full_name: name, email: null, phone: patientPhone })
      .select("id, phone")
      .single();
    if (insertErr || !inserted) {
      return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
    }
    patientId = (inserted as { id: string }).id;
    patientPhone = (inserted as { phone: string | null })?.phone ?? patientPhone;
  }

  const { error: apptErr } = await admin
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      start_time: start_time.trim(),
      end_time: end_time.trim(),
      status: "scheduled",
    });

  if (apptErr) {
    return NextResponse.json({ error: apptErr.message }, { status: 500 });
  }

  const startDate = new Date(start_time.trim()).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
  const endDate = new Date(end_time.trim()).toLocaleString(undefined, { timeStyle: "short" });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com").replace(/\/$/, "");

  if (patientEmail) {
    await sendResendEmail({
      to: patientEmail,
      subject: `Appointment confirmed — ${clinicName}`,
      html: renderEmailHtml({
        greeting: name ? `Hi ${name},` : "Hi,",
        body: `<p>Your appointment at <strong>${clinicName}</strong> is confirmed.</p><p><strong>When:</strong> ${startDate} – ${endDate}</p><p>Need to change or cancel later? Just type "change" or "cancel" in the chat on the clinic website.</p>`,
        footer: `— ${clinicName}`,
      }),
    });
  }

  const { data: members } = await admin.from("clinic_members").select("user_id").eq("clinic_id", clinicId);
  const emails: string[] = [];
  for (const m of members || []) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById((m as { user_id: string }).user_id);
      if (user?.email) emails.push(user.email);
    } catch {
      // skip
    }
  }
  if (emails.length > 0) {
    await sendResendEmail({
      to: emails,
      subject: `New appointment (from chat) — ${clinicName}`,
      html: renderEmailHtml({
        body: `<p>A new appointment was booked via the chat widget for <strong>${clinicName}</strong>.</p><p><strong>Patient:</strong> ${name}${patientEmail ? ` (${patientEmail})` : ""}</p><p><strong>When:</strong> ${startDate} – ${endDate}</p>`,
        button: { text: "View appointments", url: `${appUrl}/app/appointments` },
      }),
    });
  }

  const clinicPlan = (clinic as { plan?: string }).plan;
  const clinicPhone = (clinic as { whatsapp_phone?: string | null; phone?: string | null }).whatsapp_phone?.trim()
    || (clinic as { phone?: string | null }).phone?.trim();
  if (hasPlanFeature(clinicPlan, "whatsApp") && clinicPhone && clinicPhone.replace(/\D/g, "").length >= 10) {
    const staffMsg = `New appointment at ${clinicName}: ${name} — ${startDate} – ${endDate}.`;
    sendWhatsApp({ to: clinicPhone, body: staffMsg }).catch((e) => console.error("WhatsApp to clinic:", e));
    if (patientPhone && patientPhone.replace(/\D/g, "").length >= 10) {
      const patientMsg = `Hi${name ? ` ${name}` : ""}, your appointment at ${clinicName} is confirmed for ${startDate} – ${endDate}. Reply if you need to change or cancel.`;
      sendWhatsApp({ to: patientPhone, body: patientMsg }).catch((e) => console.error("WhatsApp to patient:", e));
    }
  }

  return NextResponse.json({ ok: true });
}
