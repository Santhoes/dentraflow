import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClinicSignature } from "@/lib/chat-signature";
import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml, escapeHtml } from "@/lib/email-template";
import { isValidChatEmail, isValidChatPhone } from "@/lib/embed-validate";
import { checkEmbedApiRateLimit, getClientIp } from "@/lib/embed-api-rate-limit";
import { validateAppointmentTimes } from "@/lib/embed-time-validate";

/**
 * POST /api/embed/modify-cancel — modify or cancel appointment from chat. Requires valid sig.
 * Body: { clinicSlug, sig, action: "modify" | "cancel", patient_email?, patient_phone?, patient_whatsapp?, new_start_time?, new_end_time? }
 * Security: appointment belongs to clinic; contact matches patient; not in past; not already cancelled.
 * If appointment is within 2 hours, returns error: call clinic directly for urgent changes.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkEmbedApiRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: {
    clinicSlug?: string;
    sig?: string;
    action?: string;
    patient_email?: string;
    patient_phone?: string;
    patient_whatsapp?: string;
    new_start_time?: string;
    new_end_time?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const {
    clinicSlug,
    sig,
    action,
    patient_email,
    patient_phone,
    patient_whatsapp,
    new_start_time,
    new_end_time,
  } = body;
  if (!clinicSlug?.trim() || !sig?.trim() || !action) {
    return NextResponse.json(
      { error: "clinicSlug, sig, and action required" },
      { status: 400 }
    );
  }
  if (action !== "modify" && action !== "cancel") {
    return NextResponse.json({ error: "action must be modify or cancel" }, { status: 400 });
  }
  if (!verifyClinicSignature(clinicSlug.trim(), sig.trim())) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .select("id, name, plan, plan_expires_at, whatsapp_phone, phone")
    .eq("slug", clinicSlug.trim())
    .maybeSingle();
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
  const phone = (patient_phone ?? patient_whatsapp)?.trim() || null;
  if (!email && !phone) {
    return NextResponse.json({ error: "patient_email or patient_phone required" }, { status: 400 });
  }
  if (email) {
    const emailCheck = isValidChatEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.error ?? "Invalid email." }, { status: 400 });
    }
  }
  if (phone) {
    const phoneCheck = isValidChatPhone(phone.replace(/\s/g, ""));
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error ?? "Invalid phone number." }, { status: 400 });
    }
  }

  let patientId: string | null = null;
  let patientEmail: string | null = null;
  let patientPhone: string | null = null;
  let patientName: string | null = null;
  if (email) {
    const { data: p } = await admin
      .from("patients")
      .select("id, full_name, email, phone")
      .eq("clinic_id", clinicId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (p) {
      patientId = (p as { id: string }).id;
      patientName = (p as { full_name?: string }).full_name ?? null;
      patientEmail = (p as { email?: string }).email ?? null;
      patientPhone = (p as { phone?: string }).phone ?? null;
    }
  }
  if (!patientId && phone) {
    const norm = phone.replace(/\D/g, "");
    const { data: patients } = await admin
      .from("patients")
      .select("id, full_name, email, phone")
      .eq("clinic_id", clinicId)
      .not("phone", "is", null);
    for (const p of patients || []) {
      const ph = (p as { phone?: string }).phone || "";
      if (ph.replace(/\D/g, "") === norm || ph === phone) {
        patientId = (p as { id: string }).id;
        patientName = (p as { full_name?: string }).full_name ?? null;
        patientEmail = (p as { email?: string }).email ?? null;
        patientPhone = (p as { phone?: string }).phone ?? null;
        break;
      }
    }
  }
  if (!patientId) {
    return NextResponse.json({ error: "No appointment found for that email or number" }, { status: 404 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .select("id, start_time, end_time, payment_status")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .in("status", ["scheduled", "confirmed"])
    .gte("start_time", nowIso)
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (apptErr || !appt) {
    return NextResponse.json({ error: "No upcoming appointment found" }, { status: 404 });
  }
  const apptId = (appt as { id: string }).id;
  const apptStart = (appt as { start_time: string }).start_time;
  const hadPaidDeposit = (appt as { payment_status?: string }).payment_status === "paid";
  if (apptStart < twoHoursFromNow) {
    return NextResponse.json(
      { error: "Please call the clinic directly for urgent changes." },
      { status: 400 }
    );
  }

  if (action === "cancel") {
    const { error: upErr } = await admin
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", apptId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    const startDate = new Date(apptStart).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
    const cancelBody =
      `<p>Your appointment at <strong>${escapeHtml(clinicName)}</strong> on ${escapeHtml(startDate)} has been cancelled.</p>` +
      (hadPaidDeposit
        ? `<p>If you paid a deposit, any refund is decided by the clinic according to their cancellation policy. The clinic will contact you directly about it.</p>`
        : "");
    if (patientEmail) {
      sendResendEmail({
        to: patientEmail,
        subject: `Appointment cancelled — ${clinicName}`,
        html: renderEmailHtml({
          greeting: `Hi${patientName ? ` ${escapeHtml(patientName)}` : ""},`,
          body: cancelBody,
          footer: `— ${escapeHtml(clinicName)}`,
        }),
      }).catch((e) => console.error("Cancel email error:", (e as Error)?.message ?? "Unknown"));
    }
    return NextResponse.json({ ok: true, message: "Appointment cancelled." });
  }

  if (action === "modify") {
    if (!new_start_time?.trim() || !new_end_time?.trim()) {
      return NextResponse.json({ error: "new_start_time and new_end_time required for modify" }, { status: 400 });
    }
    const timeCheck = validateAppointmentTimes(new_start_time.trim(), new_end_time.trim());
    if (!timeCheck.valid) {
      return NextResponse.json({ error: timeCheck.error ?? "Invalid times." }, { status: 400 });
    }
    const { error: upErr } = await admin
      .from("appointments")
      .update({
        start_time: new_start_time.trim(),
        end_time: new_end_time.trim(),
      })
      .eq("id", apptId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    const newStartDate = new Date(new_start_time.trim()).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
    const newEndTime = new Date(new_end_time.trim()).toLocaleString(undefined, { timeStyle: "short" });
    if (patientEmail) {
      sendResendEmail({
        to: patientEmail,
        subject: `Appointment rescheduled — ${clinicName}`,
        html: renderEmailHtml({
          greeting: `Hi${patientName ? ` ${escapeHtml(patientName)}` : ""},`,
          body: `<p>Your appointment at <strong>${escapeHtml(clinicName)}</strong> has been rescheduled.</p><p><strong>New time:</strong> ${escapeHtml(newStartDate)} – ${escapeHtml(newEndTime)}</p>`,
          footer: `— ${escapeHtml(clinicName)}`,
        }),
      }).catch((e) => console.error("Reschedule email error:", (e as Error)?.message ?? "Unknown"));
    }
    return NextResponse.json({ ok: true, message: "Appointment rescheduled." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
