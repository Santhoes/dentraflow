import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";

async function getClinicIdAndCurrentUser(
  request: Request
): Promise<{ clinicId: string; currentUserId: string; currentUserRole: string } | null> {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return null;
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id, role")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) return null;
  const clinicId = (member as { clinic_id: string }).clinic_id;
  const currentUserRole = (member as { role?: string }).role ?? "staff";
  return { clinicId, currentUserId: ctx.user.id, currentUserRole };
}

/**
 * DELETE /api/app/team/[userId] — remove staff from clinic (removes clinic_members row only).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await getClinicIdAndCurrentUser(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (ctx.currentUserRole !== "owner") {
    return NextResponse.json({ error: "Only the main owner can remove staff." }, { status: 403 });
  }

  const { userId: targetUserId } = await params;
  if (!targetUserId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  if (targetUserId === ctx.currentUserId) {
    return NextResponse.json({ error: "You cannot remove yourself from the team." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: targetMember, error: fetchErr } = await admin
    .from("clinic_members")
    .select("role")
    .eq("clinic_id", ctx.clinicId)
    .eq("app_user_id", targetUserId)
    .maybeSingle();
  if (fetchErr || !targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { count, error: ownerCountErr } = await admin
    .from("clinic_members")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", ctx.clinicId)
    .eq("role", "owner");
  if (!ownerCountErr && count !== null && count <= 1 && (targetMember as { role: string }).role === "owner") {
    return NextResponse.json({ error: "Cannot remove the last owner." }, { status: 400 });
  }

  const { error: deleteErr } = await admin
    .from("clinic_members")
    .delete()
    .eq("clinic_id", ctx.clinicId)
    .eq("app_user_id", targetUserId);
  if (deleteErr) {
    return NextResponse.json({ error: "Failed to remove staff" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/app/team/[userId] — update staff role and/or email/password (app_users).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await getClinicIdAndCurrentUser(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (ctx.currentUserRole !== "owner") {
    return NextResponse.json({ error: "Only the main owner can edit staff roles." }, { status: 403 });
  }

  const { userId: targetUserId } = await params;
  if (!targetUserId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  let body: { role?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : null;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const password = typeof body.password === "string" ? body.password : null;
  if (!role && !email && !password) {
    return NextResponse.json({ error: "Provide at least one of role, email, or password" }, { status: 400 });
  }
  if (password !== null && password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: targetMember, error: fetchErr } = await admin
    .from("clinic_members")
    .select("role")
    .eq("clinic_id", ctx.clinicId)
    .eq("app_user_id", targetUserId)
    .maybeSingle();
  if (fetchErr || !targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (email || password) {
    const updates: { email?: string; password_hash?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (email) updates.email = email;
    if (password) {
      updates.password_hash = await hash(password, 10);
    }
    const { error: userErr } = await admin
      .from("app_users")
      .update(updates)
      .eq("id", targetUserId);
    if (userErr) {
      return NextResponse.json({ error: userErr.message || "Failed to update email/password" }, { status: 400 });
    }
  }

  if (role) {
    const { count, error: ownerCountErr } = await admin
      .from("clinic_members")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", ctx.clinicId)
      .eq("role", "owner");
    if (
      !ownerCountErr &&
      count !== null &&
      count <= 1 &&
      (targetMember as { role: string }).role === "owner" &&
      role !== "owner"
    ) {
      return NextResponse.json({ error: "Cannot change the last owner to another role." }, { status: 400 });
    }
    const { error: updateErr } = await admin
      .from("clinic_members")
      .update({ role })
      .eq("clinic_id", ctx.clinicId)
      .eq("app_user_id", targetUserId);
    if (updateErr) {
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, role: role ?? undefined });
}
