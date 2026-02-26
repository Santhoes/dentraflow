import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth-server";
import { validatePassword } from "@/lib/password-validate";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10)));
  const offset = (page - 1) * limit;

  const admin = createAdminClient();

  const { data: users, error, count } = await admin
    .from("app_users")
    .select("id, email, is_admin, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("admin users GET", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }

  return NextResponse.json({
    users: users ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  let body: { email?: unknown; password?: unknown; is_admin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const isAdmin = typeof body.is_admin === "boolean" ? body.is_admin : false;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const admin = createAdminClient();

  // Case-insensitive duplicate check (same as signup/login).
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

  const { data: inserted, error: insertError } = await admin
    .from("app_users")
    .insert({ email, password_hash: passwordHash, is_admin: isAdmin })
    .select("id, email, is_admin, created_at, updated_at")
    .single();

  if (insertError || !inserted) {
    console.error("admin users POST insert", insertError);
    return NextResponse.json({ error: "Could not create user." }, { status: 500 });
  }

  return NextResponse.json({
    user: inserted,
  });
}

