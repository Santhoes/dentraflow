/**
 * Send confirmation emails after a booking is confirmed (patient + clinic team).
 * Used by confirm-booking and by PayPal deposit webhook after PAYMENT.CAPTURE.COMPLETED.
 */

import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml, escapeHtml } from "@/lib/email-template";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar-url";

export interface SendBookingConfirmationParams {
  clinicName: string;
  patientName: string;
  patientEmail: string | null;
  startTime: string;
  endTime: string;
  isProOrElite: boolean;
  clinicMemberEmails: string[];
}

export async function sendBookingConfirmationEmails(params: SendBookingConfirmationParams): Promise<void> {
  const { clinicName, patientName, patientEmail, startTime, endTime, isProOrElite, clinicMemberEmails } = params;
  const startDate = new Date(startTime).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
  const endDate = new Date(endTime).toLocaleString(undefined, { timeStyle: "short" });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com").replace(/\/$/, "");

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
        body: `<p>Your appointment at <strong>${escapeHtml(clinicName)}</strong> is confirmed.</p><p><strong>When:</strong> ${escapeHtml(startDate)} – ${escapeHtml(endDate)}</p><p>Need to change or cancel later? Just type "change" or "cancel" in the chat on the clinic website.</p>`,
        link: gcalUrl ? { text: "Add to Google Calendar", url: gcalUrl } : undefined,
        footer: `— ${escapeHtml(clinicName)}`,
      }),
    });
  }

  if (clinicMemberEmails.length > 0) {
    await sendResendEmail({
      to: clinicMemberEmails,
      subject: `New appointment (from chat) — ${clinicName}`,
      html: renderEmailHtml({
        body: `<p>A new appointment was booked via the chat widget for <strong>${escapeHtml(clinicName)}</strong>.</p><p><strong>Patient:</strong> ${escapeHtml(patientName)}${patientEmail ? ` (${escapeHtml(patientEmail)})` : ""}</p><p><strong>When:</strong> ${escapeHtml(startDate)} – ${escapeHtml(endDate)}</p>`,
        button: { text: "View appointments", url: `${appUrl}/app/appointments` },
      }),
    });
  }
}
