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
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.error("check-email listUsers error:", error);
      return NextResponse.json({ error: "Could not check email" }, { status: 500 });
    }
    const exists = data.users.some((u) => u.email?.toLowerCase() === email.toLowerCase());
    return NextResponse.json({ exists });
  } catch (e) {
    console.error("check-email", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
