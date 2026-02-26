import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPayPalWebhookSignature } from "@/lib/paypal-webhook-verify";
import { sendBookingConfirmationEmails } from "@/lib/send-booking-confirmation";

const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

/**
 * POST /api/paypal/webhook
 * PayPal sends webhook events here. Verify signature, then handle PAYMENT.CAPTURE.COMPLETED
 * (update appointment, insert payment, send confirmation emails) and PAYMENT.CAPTURE.DENIED.
 * Always return 200 so PayPal does not retry.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const eventId = typeof body.id === "string" ? body.id : null;
  const eventType = typeof body.event_type === "string" ? body.event_type : null;
  if (!eventId || !eventType) {
    return NextResponse.json({ message: "Missing event id or type" }, { status: 400 });
  }

  const transmissionId = request.headers.get("paypal-transmission-id") ?? request.headers.get("PAYPAL-TRANSMISSION-ID") ?? "";
  const transmissionTime = request.headers.get("paypal-transmission-time") ?? request.headers.get("PAYPAL-TRANSMISSION-TIME") ?? "";
  const transmissionSig = request.headers.get("paypal-transmission-sig") ?? request.headers.get("PAYPAL-TRANSMISSION-SIG") ?? "";
  const certUrl = request.headers.get("paypal-cert-url") ?? request.headers.get("PAYPAL-CERT-URL") ?? "";
  const authAlgo = request.headers.get("paypal-auth-algo") ?? request.headers.get("PAYPAL-AUTH-ALGO") ?? "SHA256withRSA";

  if (!WEBHOOK_ID?.trim()) {
    console.error("PayPal webhook: PAYPAL_WEBHOOK_ID not set");
    return NextResponse.json({ message: "Server config" }, { status: 500 });
  }

  const verify = await verifyPayPalWebhookSignature({
    transmissionId,
    transmissionTime,
    transmissionSig,
    certUrl,
    authAlgo,
    webhookId: WEBHOOK_ID.trim(),
    webhookEvent: body,
  });
  if (!verify.verified) {
    console.error("PayPal webhook verify failed:", verify.error);
    return NextResponse.json({ message: "Verification failed" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error: insertErr } = await admin
    .from("paypal_webhook_events")
    .insert({ paypal_event_id: eventId });
  if (insertErr) {
    if ((insertErr as { code?: string }).code === "23505") {
      return NextResponse.json({ message: "Processed" }, { status: 200 });
    }
    console.error("PayPal webhook idempotency insert:", insertErr);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = body.resource as Record<string, unknown> | undefined;
    if (!resource || typeof resource !== "object") {
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }
    const links = resource.links as { rel?: string; href?: string }[] | undefined;
    let orderId: string | null = null;
    if (Array.isArray(links)) {
      const up = links.find((l) => l.rel === "up");
      if (up?.href) {
        const match = up.href.match(/\/orders\/([A-Z0-9]+)$/i);
        if (match) orderId = match[1];
      }
    }
    if (!orderId) {
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    const { data: appointment } = await admin
      .from("appointments")
      .select("id, clinic_id, patient_id, start_time, end_time, deposit_amount, payment_status")
      .eq("paypal_order_id", orderId)
      .maybeSingle();
    if (!appointment) {
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    const apt = appointment as { id: string; clinic_id: string; patient_id: string; start_time: string; end_time: string; deposit_amount: number | null; payment_status: string };
    if (apt.payment_status === "paid") {
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    const amount = resource.amount as { value?: string; currency_code?: string } | undefined;
    const capturedValue = amount?.value != null ? parseFloat(amount.value) : null;
    const expectedDeposit = apt.deposit_amount != null ? Number(apt.deposit_amount) : null;
    if (expectedDeposit != null && capturedValue != null && Math.abs(capturedValue - expectedDeposit) > 0.02) {
      console.error("PayPal webhook: amount mismatch", { capturedValue, expectedDeposit });
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    const currency = (amount?.currency_code as string) ?? "USD";

    const { error: updateApptErr } = await admin
      .from("appointments")
      .update({ status: "confirmed", payment_status: "paid" })
      .eq("id", apt.id);
    if (updateApptErr) {
      console.error("PayPal webhook: update appointment", updateApptErr);
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    await admin.from("payments").insert({
      appointment_id: apt.id,
      clinic_id: apt.clinic_id,
      paypal_order_id: orderId,
      plan: null,
      amount: capturedValue ?? expectedDeposit ?? 0,
      currency,
      status: "completed",
    });

    const { data: patient } = await admin.from("patients").select("full_name, email").eq("id", apt.patient_id).single();
    const { data: clinic } = await admin.from("clinics").select("name, plan").eq("id", apt.clinic_id).single();
    const clinicName = (clinic as { name?: string } | null)?.name ?? "Clinic";
    const plan = (clinic as { plan?: string } | null)?.plan ?? "starter";
    const isProOrElite = plan === "pro" || plan === "elite";
    const patientName = (patient as { full_name?: string } | null)?.full_name ?? "Patient";
    const patientEmail = (patient as { email?: string | null } | null)?.email ?? null;

    const { data: members } = await admin.from("clinic_members").select("app_user_id").eq("clinic_id", apt.clinic_id);
    const clinicMemberEmails: string[] = [];
    const appUserIds = Array.from(
      new Set(
        (members ?? [])
          .map((m) => (m as { app_user_id: string | null }).app_user_id)
          .filter((id): id is string => Boolean(id))
      )
    );
    if (appUserIds.length > 0) {
      const { data: appUsers, error: appUsersError } = await admin
        .from("app_users")
        .select("id, email")
        .in("id", appUserIds);
      if (appUsersError) {
        console.error("PayPal webhook app_users lookup", appUsersError);
      } else {
        for (const u of appUsers ?? []) {
          const row = u as { id: string; email: string | null };
          if (row.email) {
            clinicMemberEmails.push(row.email);
          }
        }
      }
    }

    await sendBookingConfirmationEmails({
      clinicName,
      patientName,
      patientEmail,
      startTime: apt.start_time,
      endTime: apt.end_time,
      isProOrElite,
      clinicMemberEmails,
    });
  }

  if (eventType === "PAYMENT.CAPTURE.DENIED") {
    const resource = body.resource as Record<string, unknown> | undefined;
    const links = resource?.links as { rel?: string; href?: string }[] | undefined;
    let orderId: string | null = null;
    if (Array.isArray(links)) {
      const up = links.find((l) => l.rel === "up");
      if (up?.href) {
        const match = up.href.match(/\/orders\/([A-Z0-9]+)$/i);
        if (match) orderId = match[1];
      }
    }
    if (orderId) {
      await admin
        .from("appointments")
        .update({ payment_status: "failed" })
        .eq("paypal_order_id", orderId);
    }
  }

  return NextResponse.json({ message: "OK" }, { status: 200 });
}
