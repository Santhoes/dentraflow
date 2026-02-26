import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserFromRequest, requireAdmin } from "@/lib/admin-auth-server";
import { validatePassword } from "@/lib/password-validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  let body: { email?: unknown; password?: unknown; is_admin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const nextPassword = typeof body.password === "string" ? body.password.trim() : null;
  const nextIsAdmin = typeof body.is_admin === "boolean" ? body.is_admin : null;

  if (nextEmail === null && nextPassword === null && nextIsAdmin === null) {
    return NextResponse.json({ error: "Provide at least one field to update" }, { status: 400 });
  }

  if (nextPassword !== null) {
    const passwordError = validatePassword(nextPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("app_users")
    .select("id, email, is_admin, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("admin users PATCH fetch", fetchError);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updates: { email?: string; password_hash?: string; is_admin?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (nextEmail && nextEmail !== (existing as { email: string }).email) {
    const { data: existingRows, error: rpcError } = await admin.rpc("get_app_user_by_email", { em: nextEmail });
    let emailMatch: { id: string } | null =
      Array.isArray(existingRows) && existingRows.length > 0 ? (existingRows[0] as { id: string }) : null;
    if (!emailMatch && rpcError) {
      const { data: fallback } = await admin.from("app_users").select("id").eq("email", nextEmail).maybeSingle();
      emailMatch = fallback as typeof emailMatch;
    }
    if (emailMatch && emailMatch.id !== id) {
      return NextResponse.json({ error: "Email is already taken." }, { status: 409 });
    }
    updates.email = nextEmail;
  }

  if (nextPassword !== null && nextPassword !== "") {
    updates.password_hash = await hash(nextPassword, 10);
  }

  if (nextIsAdmin !== null) {
    updates.is_admin = nextIsAdmin;
  }

  const { data: updated, error: updateError } = await admin
    .from("app_users")
    .update(updates)
    .eq("id", id)
    .select("id, email, is_admin, created_at, updated_at")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("admin users PATCH update", updateError);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const current = await getAuthUserFromRequest(request);
  if (current && current.id === id) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: deleted, error: deleteError } = await admin
    .from("app_users")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error("admin users DELETE", deleteError);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
  if (!deleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

