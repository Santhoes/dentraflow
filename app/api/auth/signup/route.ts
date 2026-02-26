import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSession } from "@/lib/auth/app-auth";
import { checkAuthRateLimit, getClientIp } from "@/lib/auth-rate-limit";
import { validatePassword } from "@/lib/password-validate";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = await checkAuthRateLimit(ip, "signup");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password.trim() : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const admin = createAdminClient();
    // Case-insensitive duplicate check (same as login/forgot-password).
    const { data: existingRows, error: rpcError } = await admin.rpc("get_app_user_by_email", { em: email });
    let existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;
    if (!existing && rpcError) {
      const { data: fallback } = await admin.from("app_users").select("id").eq("email", email).maybeSingle();
      existing = fallback;
    }
    if (existing) {
      return NextResponse.json({ error: "Email is already taken." }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);

    const { data: inserted, error } = await admin
      .from("app_users")
      .insert({ email, password_hash: passwordHash })
      .select("id, email, is_admin")
      .single();

    if (error || !inserted) {
      console.error("signup insert error", error);
      return NextResponse.json({ error: "Could not create account." }, { status: 500 });
    }

    await createSession((inserted as any).id as string);

    return NextResponse.json({
      user: {
        id: (inserted as any).id,
        email: (inserted as any).email,
        is_admin: (inserted as any).is_admin ?? false,
      },
    });
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

