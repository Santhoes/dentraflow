import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";
import { getPlanLimit } from "@/lib/plan-features";

async function getClinicIdAndPlan(
  request: Request
): Promise<{ clinicId: string; plan: string; currentUserId: string } | null> {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return null;
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) return null;
  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { data: clinic } = await admin
    .from("clinics")
    .select("plan")
    .eq("id", clinicId)
    .single();
  const plan = (clinic as { plan?: string } | null)?.plan ?? "starter";
  return { clinicId, plan, currentUserId: ctx.user.id };
}

/**
 * GET /api/app/team — list staff (clinic_members) and plan limit for current clinic.
 */
export async function GET(request: Request) {
  const ctx = await getClinicIdAndPlan(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: members, error: membersError } = await admin
    .from("clinic_members")
    .select("app_user_id, role")
    .eq("clinic_id", ctx.clinicId);

  if (membersError) {
    return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
  }

  const memberList = members ?? [];
  const emailMap: Record<string, string> = {};
  const appUserIds = memberList
    .map((m) => (m as { app_user_id: string | null }).app_user_id)
    .filter(Boolean) as string[];
  if (appUserIds.length > 0) {
    const { data: users } = await admin.from("app_users").select("id, email").in("id", appUserIds);
    for (const u of users ?? []) {
      const row = u as { id: string; email: string };
      emailMap[row.id] = row.email;
    }
  }

  const staff = memberList.map((m) => {
    const r = m as { app_user_id: string | null; role: string };
    const uid = r.app_user_id ?? "";
    return { user_id: uid, email: emailMap[uid] ?? "(unknown)", role: r.role };
  });

  const limit = getPlanLimit(ctx.plan, "staffAssistants");
  const currentUserRole = staff.find((m) => m.user_id === ctx.currentUserId)?.role ?? "staff";
  return NextResponse.json({ members: staff, limit, currentUserRole });
}

/**
 * POST /api/app/team — add staff (email + password). Creates app_user if needed, adds to clinic_members. Enforces plan limit.
 */
export async function POST(request: Request) {
  const ctx = await getClinicIdAndPlan(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "staff";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const limit = getPlanLimit(ctx.plan, "staffAssistants");
  const { count, error: countErr } = await admin
    .from("clinic_members")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", ctx.clinicId)
    .eq("role", "staff");
  if (countErr) {
    return NextResponse.json({ error: "Failed to check limit" }, { status: 500 });
  }
  const currentCount = count ?? 0;
  if (limit !== null && currentCount >= limit) {
    return NextResponse.json(
      { error: `Plan limit reached. Your plan allows ${limit} staff account${limit === 1 ? "" : "s"}.` },
      { status: 403 }
    );
  }

  let appUserId: string;
  const { data: existingAppUser } = await admin.from("app_users").select("id").eq("email", email).maybeSingle();
  if (existingAppUser?.id) {
    appUserId = (existingAppUser as { id: string }).id;
  } else {
    const passwordHash = await hash(password, 10);
    const { data: inserted, error: insertErr } = await admin
      .from("app_users")
      .insert({ email, password_hash: passwordHash })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      return NextResponse.json({ error: insertErr?.message || "Could not create account." }, { status: 500 });
    }
    appUserId = (inserted as { id: string }).id;
  }

  const { data: existingMember, error: memberCheckErr } = await admin
    .from("clinic_members")
    .select("app_user_id, role")
    .eq("clinic_id", ctx.clinicId)
    .eq("app_user_id", appUserId)
    .maybeSingle();
  if (memberCheckErr) {
    return NextResponse.json({ error: "Failed to check membership" }, { status: 500 });
  }
  if (existingMember) {
    return NextResponse.json({ member: { user_id: appUserId, email, role: (existingMember as { role: string }).role } });
  }

  const { error: insertErr } = await admin
    .from("clinic_members")
    .insert({ clinic_id: ctx.clinicId, app_user_id: appUserId, role });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message || "Failed to add staff" }, { status: 500 });
  }
  return NextResponse.json({ member: { user_id: appUserId, email, role } });
}
