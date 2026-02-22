import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClinicSignature } from "@/lib/chat-signature";
import { isValidChatEmail, isValidChatPhone } from "@/lib/embed-validate";

/**
 * POST /api/embed/verify-patient — find patient by email/phone and return upcoming appointments.
 * Body: { clinicSlug, sig, patient_email?, patient_whatsapp? }
 * Returns: { ok: true, patient_name?, appointments: [{ id, start_time, end_time, reason? }] } or { ok: false, error }
 */
export async function POST(request: Request) {
  let body: {
    clinicSlug?: string;
    sig?: string;
    patient_email?: string;
    patient_whatsapp?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { clinicSlug, sig, patient_email, patient_whatsapp } = body;
  if (!clinicSlug?.trim() || !sig?.trim()) {
    return NextResponse.json(
      { error: "clinicSlug and sig required" },
      { status: 400 }
    );
  }
  if (!verifyClinicSignature(clinicSlug.trim(), sig.trim())) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const email = patient_email?.trim() || null;
  const phone = patient_whatsapp?.trim() || null;
  if (!email && !phone) {
    return NextResponse.json(
      { ok: false, error: "patient_email or patient_whatsapp required" },
      { status: 400 }
    );
  }
  if (email) {
    const emailCheck = isValidChatEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ ok: false, error: emailCheck.error ?? "Invalid email." }, { status: 400 });
    }
  }
  if (phone) {
    const phoneCheck = isValidChatPhone(phone.replace(/\s/g, ""));
    if (!phoneCheck.valid) {
      return NextResponse.json({ ok: false, error: phoneCheck.error ?? "Invalid phone number." }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .select("id, plan_expires_at")
    .eq("slug", clinicSlug.trim())
    .maybeSingle();
  if (clinicErr || !clinic) {
    return NextResponse.json({ ok: false, error: "Clinic not found" }, { status: 404 });
  }
  const planExpiresAt = (clinic as { plan_expires_at?: string | null }).plan_expires_at;
  if (planExpiresAt && new Date(planExpiresAt) <= new Date()) {
    return NextResponse.json({ ok: false, error: "Plan expired" }, { status: 403 });
  }

  const clinicId = (clinic as { id: string }).id;
  let patientId: string | null = null;
  let patientName: string | null = null;

  if (email) {
    const { data: p } = await admin
      .from("patients")
      .select("id, full_name")
      .eq("clinic_id", clinicId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (p) {
      patientId = (p as { id: string }).id;
      patientName = (p as { full_name?: string }).full_name ?? null;
    }
  }
  if (!patientId && phone) {
    const norm = phone.replace(/\D/g, "");
    const { data: patients } = await admin
      .from("patients")
      .select("id, full_name, phone")
      .eq("clinic_id", clinicId)
      .not("phone", "is", null);
    for (const p of patients || []) {
      const ph = (p as { phone?: string }).phone || "";
      if (ph.replace(/\D/g, "") === norm || ph === phone) {
        patientId = (p as { id: string }).id;
        patientName = (p as { full_name?: string }).full_name ?? null;
        break;
      }
    }
  }

  if (!patientId) {
    return NextResponse.json({
      ok: false,
      error: "No appointment found for that email or number",
    });
  }

  const nowIso = new Date().toISOString();
  const { data: appts, error: apptErr } = await admin
    .from("appointments")
    .select("id, start_time, end_time, reason")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .in("status", ["pending", "scheduled", "confirmed"])
    .gte("start_time", nowIso)
    .order("start_time", { ascending: true });

  if (apptErr) {
    return NextResponse.json({ ok: false, error: "Failed to fetch appointments" }, { status: 500 });
  }

  const appointments = (appts || []).map((a: { id: string; start_time: string; end_time: string; reason?: string | null }) => ({
    id: a.id,
    start_time: a.start_time,
    end_time: a.end_time,
    reason: a.reason ?? undefined,
  }));

  return NextResponse.json({
    ok: true,
    patient_name: patientName ?? undefined,
    appointments,
  });
}
