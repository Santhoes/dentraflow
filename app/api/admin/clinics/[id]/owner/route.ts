import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id: clinicId } = await params;
  if (!clinicId) return NextResponse.json({ error: "Clinic ID required" }, { status: 400 });

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Owner email required" }, { status: 400 });

  const admin = createAdminClient();

  // Resolve app_user by email (case-insensitive). Fallback if RPC not available.
  const { data: userRows, error: rpcError } = await admin.rpc("get_app_user_by_email", { em: email });
  let appUser: { id: string; email: string } | null =
    Array.isArray(userRows) && userRows.length > 0 ? (userRows[0] as { id: string; email: string }) : null;
  if (!appUser && rpcError) {
    const { data: fallback, error: fallbackError } = await admin
      .from("app_users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    if (fallbackError) {
      console.error("admin set-owner app_users fallback lookup", fallbackError);
      return NextResponse.json({ error: "Failed to resolve user by email" }, { status: 500 });
    }
    appUser = fallback as typeof appUser;
  }

  if (!appUser?.id) {
    return NextResponse.json({ error: "No app user found for that email" }, { status: 404 });
  }

  // Ensure clinic exists (better error message).
  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .maybeSingle();
  if (clinicError) {
    console.error("admin set-owner clinic lookup", clinicError);
    return NextResponse.json({ error: "Failed to lookup clinic" }, { status: 500 });
  }
  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  // Demote any existing owners to 'admin' (keeps access).
  const { data: currentOwners, error: ownersError } = await admin
    .from("clinic_members")
    .select("id, app_user_id")
    .eq("clinic_id", clinicId)
    .eq("role", "owner");

  if (ownersError) {
    console.error("admin set-owner current owners", ownersError);
    return NextResponse.json({ error: "Failed to read current owner" }, { status: 500 });
  }

  const ownerIds = (currentOwners || [])
    .map((r) => (r as { id: string }).id)
    .filter(Boolean);
  if (ownerIds.length > 0) {
    const { error: demoteError } = await admin
      .from("clinic_members")
      .update({ role: "admin" })
      .in("id", ownerIds);
    if (demoteError) {
      console.error("admin set-owner demote owners", demoteError);
      return NextResponse.json({ error: "Failed to update existing owner" }, { status: 500 });
    }
  }

  // Promote/insert membership for new owner.
  const { data: existingMember, error: existingError } = await admin
    .from("clinic_members")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("app_user_id", appUser.id)
    .maybeSingle();

  if (existingError) {
    console.error("admin set-owner existing member lookup", existingError);
    return NextResponse.json({ error: "Failed to update owner" }, { status: 500 });
  }

  if (existingMember?.id) {
    const { error: promoteError } = await admin
      .from("clinic_members")
      .update({ role: "owner" })
      .eq("id", (existingMember as { id: string }).id);
    if (promoteError) {
      console.error("admin set-owner promote member", promoteError);
      return NextResponse.json({ error: "Failed to set owner" }, { status: 500 });
    }
  } else {
    const { error: insertError } = await admin.from("clinic_members").insert({
      clinic_id: clinicId,
      app_user_id: appUser.id,
      role: "owner",
    });
    if (insertError) {
      console.error("admin set-owner insert member", insertError);
      return NextResponse.json({ error: "Failed to set owner" }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    clinicId,
    owner: { app_user_id: appUser.id, email: appUser.email ?? email },
  });
}

