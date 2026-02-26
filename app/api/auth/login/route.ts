import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSession } from "@/lib/auth/app-auth";
import { checkAuthRateLimit, getClientIp } from "@/lib/auth-rate-limit";
import { compare, hash } from "bcryptjs";

// Dummy bcrypt hash for constant-time response when user not found (prevents timing attacks).
const DUMMY_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = await checkAuthRateLimit(ip, "login");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password.trim() : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    // Case-insensitive lookup so "User@Example.com" matches "user@example.com". Fallback to exact match if RPC not yet deployed.
    const { data: userRows, error: rpcError } = await admin.rpc("get_app_user_by_email", { em: email });
    let userRow: { id: string; email: string; password_hash?: string | null; passwordHash?: string | null; is_admin?: boolean } | null =
      Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : null;
    if (!userRow && rpcError) {
      const { data: fallback } = await admin.from("app_users").select("id, email, password_hash, is_admin").eq("email", email).maybeSingle();
      userRow = fallback as typeof userRow;
    }

    if (!userRow) {
      await compare(password, DUMMY_HASH);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const row = userRow as { password_hash?: string | null; passwordHash?: string | null };
    const existingHash = (row.password_hash ?? row.passwordHash) ?? null;

    // First-time login for migrated users: no password_hash yet, so set it now.
    if (!existingHash) {
      const newHash = await hash(password, 10);
      const { data: updated, error: updateError } = await admin
        .from("app_users")
        .update({ password_hash: newHash })
        .eq("id", (userRow as any).id)
        .select("id, email, is_admin")
        .single();

      if (updateError || !updated) {
        console.error("login set-password error", updateError);
        return NextResponse.json({ error: "Could not set password. Please try again." }, { status: 500 });
      }

      await createSession((updated as any).id as string);

      return NextResponse.json({
        user: {
          id: (updated as any).id,
          email: (updated as any).email,
          is_admin: (updated as any).is_admin ?? false,
        },
      });
    }

    const ok = await compare(password, existingHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession((userRow as any).id as string);

    return NextResponse.json({
      user: {
        id: (userRow as any).id,
        email: (userRow as any).email,
        is_admin: (userRow as any).is_admin ?? false,
      },
    });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

