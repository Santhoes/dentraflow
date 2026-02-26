import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml, escapeHtml } from "@/lib/email-template";

type ReminderType = "day_before" | "morning_of";

/**
 * GET or POST /api/cron/appointment-reminders
 * Secured with CRON_SECRET. Sends email reminders to patients:
 * 1) Day before: appointments starting in 20–28h — "Your appointment is tomorrow at X"
 * 2) Morning of: appointments starting in 1–6h — "Your appointment is today at X"
 * Only sends once per appointment per type (tracked in appointment_reminder_sent).
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
    .in("status", ["scheduled", "confirmed"])
    .gte("start_time", dayBeforeFrom.toISOString())
    .lte("start_time", dayBeforeTo.toISOString());

  // Window 2: morning of — 1–6h from now (same-day reminder)
  const morningFrom = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const morningTo = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const { data: morningAppointments, error: err2 } = await admin
    .from("appointments")
    .select("id, clinic_id, patient_id, start_time, end_time")
    .in("status", ["scheduled", "confirmed"])
    .gte("start_time", morningFrom.toISOString())
    .lte("start_time", morningTo.toISOString());

  if (err1 || err2) {
    return NextResponse.json({ ok: false, error: err1?.message || err2?.message }, { status: 500 });
  }

  const dayBefore = (dayBeforeAppointments || []) as { id: string; clinic_id: string; patient_id: string; start_time: string; end_time: string }[];
  const morning = (morningAppointments || []) as { id: string; clinic_id: string; patient_id: string; start_time: string; end_time: string }[];

  let sentDayBefore = 0;
  let sentMorningOf = 0;

  await sendRemindersForAppointments(admin, dayBefore, "day_before", (n) => { sentDayBefore += n; });
  await sendRemindersForAppointments(admin, morning, "morning_of", (n) => { sentMorningOf += n; });

  return NextResponse.json({
    ok: true,
    sent: sentDayBefore + sentMorningOf,
    dayBefore: dayBefore.length,
    morningOf: morning.length,
    sentDayBefore,
    sentMorningOf,
  });
}

async function sendRemindersForAppointments(
  admin: ReturnType<typeof createAdminClient>,
  appointments: { id: string; clinic_id: string; patient_id: string; start_time: string; end_time: string }[],
  reminderType: ReminderType,
  onSent: (count: number) => void
) {
  for (const apt of appointments) {
    const { data: existing } = await admin
      .from("appointment_reminder_sent")
      .select("id")
      .eq("appointment_id", apt.id)
      .eq("reminder_type", reminderType)
      .maybeSingle();
    if (existing) continue;

    const { data: patient } = await admin.from("patients").select("email, full_name").eq("id", apt.patient_id).single();
    const email = (patient as { email?: string | null } | null)?.email;
    if (!email?.trim()) continue;

    const { data: clinic } = await admin.from("clinics").select("name").eq("id", apt.clinic_id).single();
    const clinicName = (clinic as { name?: string } | null)?.name ?? "the clinic";
    const patientName = (patient as { full_name?: string | null } | null)?.full_name ?? "there";

    const startDate = new Date(apt.start_time).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
    const endTime = new Date(apt.end_time).toLocaleString(undefined, { timeStyle: "short" });
    const whenText = `${startDate} – ${endTime}`;

    const isDayBefore = reminderType === "day_before";
    const subject = isDayBefore
      ? `Reminder: Your appointment tomorrow — ${clinicName}`
      : `Reminder: Your appointment today — ${clinicName}`;
    const intro = isDayBefore
      ? `This is a reminder that you have an appointment at <strong>${escapeHtml(clinicName)}</strong> tomorrow.`
      : `This is a reminder that you have an appointment at <strong>${escapeHtml(clinicName)}</strong> today.`;
    const body = `<p>${intro}</p><p><strong>When:</strong> ${escapeHtml(whenText)}</p><p>Need to change or cancel? Use the chat on the clinic website or contact the clinic directly.</p>`;

    const { ok } = await sendResendEmail({
      to: email.trim(),
      subject,
      html: renderEmailHtml({
        greeting: patientName ? `Hi ${escapeHtml(patientName)},` : "Hi,",
        body,
        footer: `— ${escapeHtml(clinicName)}`,
      }),
    });

    if (ok) {
      await admin.from("appointment_reminder_sent").insert({
        appointment_id: apt.id,
        reminder_type: reminderType,
      });
      onSent(1);
    }
  }
}
