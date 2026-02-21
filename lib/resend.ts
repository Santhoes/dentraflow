/**
 * Send email via Resend API (https://resend.com).
 * Uses RESEND_API_KEY and RESEND_FROM or RESEND_FROM_EMAIL.
 * All app email (appointments, reminders, plan expiry, clinic notifications) goes through this.
 */

export function getResendFrom(): string {
  return (
    process.env.RESEND_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "DentraFlow <ai@dentraflow.com>"
  );
}

export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey?.length) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const from = params.from ?? getResendFrom();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text || `HTTP ${res.status}` };
  }
  return { ok: true };
}
