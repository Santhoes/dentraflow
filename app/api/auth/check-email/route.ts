import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkEmailRateLimit, getClientIp } from "@/lib/check-email-rate-limit";

/**
 * POST /api/auth/check-email — returns { exists: boolean } for signup/reset flows.
 * Rate limited: 10 requests per IP per minute. Consider edge rate limiting in production.
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
  try {
    const admin = createAdminClient();
    // Case-insensitive lookup (same as login/signup/forgot-password).
    const { data: rows, error: rpcError } = await admin.rpc("get_app_user_by_email", { em: email });
    let data: { id: string } | null = Array.isArray(rows) && rows.length > 0 ? (rows[0] as { id: string }) : null;
    if (!data && rpcError) {
      const { data: fallback, error: fallbackError } = await admin.from("app_users").select("id").eq("email", email).maybeSingle();
      if (fallbackError) {
        console.error("check-email app_users error:", fallbackError);
        return NextResponse.json({ error: "Could not check email" }, { status: 500 });
      }
      data = fallback;
    }
    const exists = !!data;
    return NextResponse.json({ exists });
  } catch (e) {
    console.error("check-email", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
