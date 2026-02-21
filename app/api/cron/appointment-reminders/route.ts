import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/whatsapp";
import { hasPlanFeature } from "@/lib/plan-features";

/**
 * GET or POST /api/cron/appointment-reminders
 * Secured with CRON_SECRET. Sends WhatsApp reminders for Elite clinics:
 * 1) Day before: appointments starting in 20–28h.
 * 2) Morning of: appointments starting in 1–6h (same day).
 * Run at least twice daily (e.g. 8:00 and 14:00) to cover both windows.
 */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 501 });
  }
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Window 1: day before — 20–28h from now
  const dayBeforeFrom = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const dayBeforeTo = new Date(now.getTime() + 28 * 60 * 60 * 1000);
  const { data: dayBeforeAppointments, error: err1 } = await admin
    .from("appointments")
    .select("id, clinic_id, patient_id, start_time, end_time")
    .in("status", ["scheduled"])
    .gte("start_time", dayBeforeFrom.toISOString())
    .lte("start_time", dayBeforeTo.toISOString());

  // Window 2: morning of — 1–6h from now (same-day reminder)
  const morningFrom = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const morningTo = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const { data: morningAppointments, error: err2 } = await admin
    .from("appointments")
    .select("id, clinic_id, patient_id, start_time, end_time")
    .in("status", ["scheduled"])
    .gte("start_time", morningFrom.toISOString())
    .lte("start_time", morningTo.toISOString());

  if (err1 || err2) {
    return NextResponse.json({ ok: false, error: err1?.message || err2?.message }, { status: 500 });
  }

  const dayBefore = (dayBeforeAppointments || []) as { id: string; clinic_id: string; patient_id: string; start_time: string; end_time: string }[];
  const morning = (morningAppointments || []) as { id: string; clinic_id: string; patient_id: string; start_time: string; end_time: string }[];

  let sent = 0;

  async function sendReminders(
    appointments: { id: string; clinic_id: string; patient_id: string; start_time: string; end_time: string }[],
    kind: "day_before" | "morning_of"
  ) {
    for (const apt of appointments) {
      const { data: clinic } = await admin
        .from("clinics")
        .select("name, plan, whatsapp_phone, phone")
        .eq("id", apt.clinic_id)
        .single();
      if (!clinic || !hasPlanFeature((clinic as { plan?: string }).plan, "whatsApp")) continue;
      const c = clinic as { whatsapp_phone?: string | null; phone?: string | null };
      const clinicPhone = c.whatsapp_phone?.trim() || c.phone?.trim();
      if (!clinicPhone || clinicPhone.replace(/\D/g, "").length < 10) continue;

      const clinicName = (clinic as { name: string }).name;
      const startDate = new Date(apt.start_time).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });

      const { data: patient } = await admin
        .from("patients")
        .select("full_name, phone")
        .eq("id", apt.patient_id)
        .single();

      const patientName = (patient as { full_name?: string } | null)?.full_name || "Patient";
      const patientPhone = (patient as { phone?: string | null } | null)?.phone;

      if (kind === "day_before") {
        const staffMsg = `Reminder: appointment tomorrow — ${patientName}, ${startDate} at ${clinicName}.`;
        const r1 = await sendWhatsApp({ to: clinicPhone, body: staffMsg });
        if (r1.ok) sent++;
        if (patientPhone && patientPhone.replace(/\D/g, "").length >= 10) {
          const patientMsg = `Hi${patientName ? ` ${patientName}` : ""}, reminder: your appointment at ${clinicName} is tomorrow, ${startDate}.`;
          const r2 = await sendWhatsApp({ to: patientPhone, body: patientMsg });
          if (r2.ok) sent++;
        }
      } else {
        const staffMsg = `Reminder: appointment today — ${patientName}, ${startDate} at ${clinicName}.`;
        const r1 = await sendWhatsApp({ to: clinicPhone, body: staffMsg });
        if (r1.ok) sent++;
        if (patientPhone && patientPhone.replace(/\D/g, "").length >= 10) {
          const patientMsg = `Hi${patientName ? ` ${patientName}` : ""}, reminder: your appointment at ${clinicName} is today at ${startDate}. See you soon!`;
          const r2 = await sendWhatsApp({ to: patientPhone, body: patientMsg });
          if (r2.ok) sent++;
        }
      }
    }
  }

  await sendReminders(dayBefore, "day_before");
  await sendReminders(morning, "morning_of");

  return NextResponse.json({ ok: true, sent, dayBefore: dayBefore.length, morningOf: morning.length });
}
