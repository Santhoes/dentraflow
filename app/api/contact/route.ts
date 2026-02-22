import { NextResponse } from "next/server";
import { sendResendEmail } from "@/lib/resend";
import { checkContactRateLimit, getClientIp } from "@/lib/contact-rate-limit";

const MAX_NAME = 200;
const MAX_MESSAGE = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * POST /api/contact — public contact form. Sends email to CONTACT_EMAIL or support@dentraflow.com.
 * Body: { name: string, email: string, message: string }
 * Rate limited: 5 submissions per IP per minute.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkContactRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in a minute." },
      { status: 429 }
    );
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (name.length > MAX_NAME) return NextResponse.json({ error: "Name is too long" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!EMAIL_REGEX.test(email)) return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > MAX_MESSAGE) return NextResponse.json({ error: "Message is too long" }, { status: 400 });

  const to = process.env.CONTACT_EMAIL || "support@dentraflow.com";
  const subject = `Contact form: ${escapeHtml(name).slice(0, 80)}`;
  const html = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  const result = await sendResendEmail({ to, subject, html });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to send message" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
