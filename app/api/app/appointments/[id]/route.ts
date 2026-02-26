import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";
import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml, escapeHtml } from "@/lib/email-template";

/**
 * PATCH /api/app/appointments/[id] — update a single appointment (e.g. mark refund sent).
 * Body: { mark_refunded?: boolean }
 * When mark_refunded is true: appointment must be cancelled and payment_status 'paid'.
 * Sets payment_status to 'refunded' and sends the patient an email that their refund has been processed.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: apptId } = await params;
  if (!apptId?.trim()) {
    return NextResponse.json({ error: "Appointment ID required" }, { status: 400 });
  }

  let body: { mark_refunded?: boolean };
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

  if (body.mark_refunded === true) {
    const { data: appt, error: apptErr } = await admin
      .from("appointments")
      .select("id, clinic_id, patient_id, status, payment_status, start_time")
      .eq("id", apptId.trim())
      .eq("clinic_id", clinicId)
      .single();
    if (apptErr || !appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    const status = (appt as { status: string }).status;
    const paymentStatus = (appt as { payment_status?: string }).payment_status;
    if (status !== "cancelled") {
      return NextResponse.json(
        { error: "Only cancelled appointments can be marked as refunded." },
        { status: 400 }
      );
    }
    if (paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Appointment has no paid deposit to mark as refunded." },
        { status: 400 }
      );
    }

    const { error: upErr } = await admin
      .from("appointments")
      .update({ payment_status: "refunded" })
      .eq("id", apptId.trim())
      .eq("clinic_id", clinicId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: clinic } = await admin
      .from("clinics")
      .select("name")
      .eq("id", clinicId)
      .single();
    const clinicName = (clinic as { name: string } | null)?.name || "Clinic";
    const patientId = (appt as { patient_id: string }).patient_id;
    const startTime = (appt as { start_time: string }).start_time;
    const startDate = new Date(startTime).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });

    const { data: patient } = await admin
      .from("patients")
      .select("full_name, email")
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .single();
    const patientEmail = (patient as { email: string | null } | null)?.email ?? null;
    const patientName = (patient as { full_name?: string } | null)?.full_name ?? null;

    if (patientEmail) {
      sendResendEmail({
        to: patientEmail,
        subject: `Deposit refund processed — ${clinicName}`,
        html: renderEmailHtml({
          greeting: patientName ? `Hi ${escapeHtml(patientName)},` : "Hi,",
          body: `<p>Your deposit for the cancelled appointment at <strong>${escapeHtml(clinicName)}</strong> (originally ${escapeHtml(startDate)}) has been refunded.</p><p>The clinic has processed your refund. If you have any questions, please contact the clinic directly.</p>`,
          footer: `— ${escapeHtml(clinicName)}`,
        }),
      }).catch((e) => console.error("Refund notification email error:", (e as Error)?.message ?? "Unknown"));
    }

    return NextResponse.json({ ok: true, message: "Refund marked and patient notified." });
  }

  return NextResponse.json({ error: "No action specified" }, { status: 400 });
}
