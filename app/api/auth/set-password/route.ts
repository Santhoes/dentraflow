import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hash } from "bcryptjs";
import { checkAuthRateLimit, getClientIp } from "@/lib/auth-rate-limit";
import { validatePassword } from "@/lib/password-validate";

/**
 * POST /api/auth/set-password — set new password using a reset token (app_users only).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkAuthRateLimit(ip, "set_password");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a minute." },
      { status: 429 }
    );
  }

  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: row, error: findError } = await admin
    .from("app_password_reset_tokens")
    .select("id, user_id")
    .eq("token", token)
    .gt("expires_at", now)
    .maybeSingle();

  if (findError || !row) {
    return NextResponse.json(
      { error: "Invalid or expired reset link. Please request a new one." },
      { status: 400 }
    );
  }

  const userId = (row as { user_id: string }).user_id;
  const passwordHash = await hash(password, 10);

  const { error: updateError } = await admin
    .from("app_users")
    .update({ password_hash: passwordHash, updated_at: now })
    .eq("id", userId);

  if (updateError) {
    console.error("set-password update app_users", updateError);
    return NextResponse.json({ error: "Could not update password" }, { status: 500 });
  }

  await admin.from("app_password_reset_tokens").delete().eq("id", (row as { id: string }).id);

  return NextResponse.json({ ok: true });
}
