import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClinicSignature } from "@/lib/chat-signature";
import { sendBookingConfirmationEmails } from "@/lib/send-booking-confirmation";
import { isValidChatEmail, isValidChatPhone } from "@/lib/embed-validate";
import { checkEmbedApiRateLimit, getClientIp } from "@/lib/embed-api-rate-limit";
import { validateAppointmentTimes } from "@/lib/embed-time-validate";

/**
 * POST /api/embed/confirm-booking — create appointment from chat widget. Requires valid sig.
 * Body: { clinicSlug, sig, patient_email?, patient_name?, patient_phone?, start_time, end_time } (ISO times).
 * Sends confirmation email to patient and notifies clinic team.
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
    patient_email?: string;
    patient_name?: string;
    patient_phone?: string;
    start_time?: string;
    end_time?: string;
    policy_accepted_at?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { clinicSlug, sig, patient_email, patient_name, patient_phone, start_time, end_time, policy_accepted_at } = body;

  // #region agent log
  fetch('http://127.0.0.1:7785/ingest/8b7a328f-cfbf-41bb-bc5d-dd8a87f78da9', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'b6bc01',
    },
    body: JSON.stringify({
      sessionId: 'b6bc01',
      runId: 'pre-booking',
      hypothesisId: 'H3',
      location: 'app/api/embed/confirm-booking/route.ts:POST:start',
      message: 'Incoming confirm-booking request',
      data: {
        clinicSlug,
        hasSig: !!sig,
        hasPatientEmail: !!patient_email,
        hasPatientName: !!patient_name,
        hasStart: !!start_time,
        hasEnd: !!end_time,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log
  if (!clinicSlug?.trim() || !sig?.trim() || !start_time?.trim() || !end_time?.trim()) {
    return NextResponse.json({ error: "clinicSlug, sig, start_time, end_time required" }, { status: 400 });
  }
  if (!verifyClinicSignature(clinicSlug.trim(), sig.trim())) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const timeCheck = validateAppointmentTimes(start_time.trim(), end_time.trim());
  if (!timeCheck.valid) {
    return NextResponse.json({ error: timeCheck.error ?? "Invalid appointment times." }, { status: 400 });
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
    const resp = NextResponse.json({ error: "Plan expired" }, { status: 403 });
    // #region agent log
    fetch('http://127.0.0.1:7785/ingest/8b7a328f-cfbf-41bb-bc5d-dd8a87f78da9', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'b6bc01',
      },
      body: JSON.stringify({
        sessionId: 'b6bc01',
        runId: 'pre-booking',
        hypothesisId: 'H4',
        location: 'app/api/embed/confirm-booking/route.ts:POST:planExpired',
        message: 'Booking blocked due to plan expired',
        data: {
          clinicSlug,
          plan: (clinic as { plan?: string | null }).plan ?? null,
          plan_expires_at: planExpiresAt,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    return resp;
  }

  const clinicId = (clinic as { id: string }).id;
  const clinicName = (clinic as { name: string }).name;
  const email = patient_email?.trim() || null;
  const rawName = patient_name?.trim() || "Patient";
  const name = rawName.length > 200 ? rawName.slice(0, 200) : rawName;
  const rawPhone = patient_phone?.trim() || null;

  if (email) {
    const emailCheck = isValidChatEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.error ?? "Invalid email." }, { status: 400 });
    }
  }
  if (rawPhone) {
    const phoneCheck = isValidChatPhone(rawPhone.replace(/\s/g, ""));
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error ?? "Invalid phone number." }, { status: 400 });
    }
  }

  let patientId: string;
  let patientEmail: string | null = null;
  let patientPhone: string | null = rawPhone;

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

  // Prevent same patient from having multiple appointments on the same day
  const startDay = start_time.trim().slice(0, 10);
  const { data: existingSameDay } = await admin
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .in("status", ["pending", "scheduled", "confirmed"])
    .gte("start_time", `${startDay}T00:00:00.000Z`)
    .lte("start_time", `${startDay}T23:59:59.999Z`)
    .limit(1)
    .maybeSingle();
  if (existingSameDay) {
    const resp = NextResponse.json(
      { error: "You already have an appointment on this day. One appointment per day per person." },
      { status: 400 }
    );
    // #region agent log
    fetch('http://127.0.0.1:7785/ingest/8b7a328f-cfbf-41bb-bc5d-dd8a87f78da9', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'b6bc01',
      },
      body: JSON.stringify({
        sessionId: 'b6bc01',
        runId: 'pre-booking',
        hypothesisId: 'H5',
        location: 'app/api/embed/confirm-booking/route.ts:POST:sameDayBlock',
        message: 'Booking blocked due to existing same-day appointment',
        data: {
          clinicSlug,
          patientHasExistingSameDay: true,
          startDay,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    return resp;
  }

  const { error: apptErr } = await admin
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      start_time: start_time.trim(),
      end_time: end_time.trim(),
      status: "scheduled",
      ...(typeof policy_accepted_at === "string" && policy_accepted_at.trim() && {
        policy_accepted_at: policy_accepted_at.trim(),
      }),
    });

  if (apptErr) {
    const resp = NextResponse.json({ error: apptErr.message }, { status: 500 });
    // #region agent log
    fetch('http://127.0.0.1:7785/ingest/8b7a328f-cfbf-41bb-bc5d-dd8a87f78da9', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'b6bc01',
      },
      body: JSON.stringify({
        sessionId: 'b6bc01',
        runId: 'pre-booking',
        hypothesisId: 'H6',
        location: 'app/api/embed/confirm-booking/route.ts:POST:insertError',
        message: 'Supabase insert into appointments failed',
        data: {
          clinicSlug,
          errorMessage: apptErr.message,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    return resp;
  }

  const clinicPlan = (clinic as { plan?: string }).plan;
  const isProOrElite = clinicPlan === "pro" || clinicPlan === "elite";
  const { data: members } = await admin.from("clinic_members").select("app_user_id").eq("clinic_id", clinicId);
  const appUserIds = (members || []).map((m) => (m as { app_user_id: string | null }).app_user_id).filter(Boolean) as string[];
  const clinicMemberEmails: string[] = [];
  if (appUserIds.length > 0) {
    const { data: users } = await admin.from("app_users").select("email").in("id", appUserIds);
    for (const u of users ?? []) clinicMemberEmails.push((u as { email: string }).email);
  }
  await sendBookingConfirmationEmails({
    clinicName,
    patientName: name,
    patientEmail,
    startTime: start_time.trim(),
    endTime: end_time.trim(),
    isProOrElite,
    clinicMemberEmails,
  });

  const resp = NextResponse.json({ ok: true });
  // #region agent log
  fetch('http://127.0.0.1:7785/ingest/8b7a328f-cfbf-41bb-bc5d-dd8a87f78da9', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'b6bc01',
    },
    body: JSON.stringify({
      sessionId: 'b6bc01',
      runId: 'pre-booking',
      hypothesisId: 'H7',
      location: 'app/api/embed/confirm-booking/route.ts:POST:success',
      message: 'Booking created successfully',
      data: {
        clinicSlug,
        clinicId,
        patientHasEmail: !!patientEmail,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log
  return resp;
}
