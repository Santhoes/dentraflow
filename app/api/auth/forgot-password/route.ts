import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/resend";
import { checkEmailRateLimit, getClientIp } from "@/lib/check-email-rate-limit";

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_HOURS = 1;

/**
 * POST /api/auth/forgot-password — request a password reset link for app_users.
 * Uses app_password_reset_tokens + Resend; no Supabase Auth.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkEmailRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 }
    );
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Case-insensitive lookup (same as login/signup).
  const { data: userRows, error: rpcError } = await admin.rpc("get_app_user_by_email", { em: email });
  let user: { id: string; email: string } | null =
    Array.isArray(userRows) && userRows.length > 0 ? (userRows[0] as { id: string; email: string }) : null;
  if (!user && rpcError) {
    const { data: fallback } = await admin.from("app_users").select("id, email").eq("email", email).maybeSingle();
    user = fallback as typeof user;
  }

  // Same response whether or not user exists (no email enumeration).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com";
  const genericSuccess = { ok: true, message: "If that email is registered, we sent a reset link." };

  if (!user) {
    return NextResponse.json(genericSuccess);
  }

  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);

  const { error: insertError } = await admin.from("app_password_reset_tokens").insert({
    user_id: user.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    console.error("forgot-password insert token", insertError);
    return NextResponse.json(genericSuccess);
  }

  const resetLink = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
  const { ok, error: sendError } = await sendResendEmail({
    to: user.email,
    subject: "Reset your DentraFlow password",
    html: `
      <p>You asked to reset your DentraFlow password.</p>
      <p><a href="${resetLink}">Click here to set a new password</a>. This link expires in ${RESET_EXPIRY_HOURS} hour(s).</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });

  if (!ok) {
    console.error("forgot-password send email", sendError);
  }

  return NextResponse.json(genericSuccess);
}
