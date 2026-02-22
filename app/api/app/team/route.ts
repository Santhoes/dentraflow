import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanLimit } from "@/lib/plan-features";

async function getClinicIdAndPlan(
  token: string
): Promise<{ clinicId: string; plan: string; currentUserId: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return null;

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", user.id)
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
  return { clinicId, plan, currentUserId: user.id };
}

/**
 * GET /api/app/team — list staff (clinic_members) and plan limit for current clinic.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getClinicIdAndPlan(token);
  if (!ctx) return NextResponse.json({ error: "No clinic" }, { status: 403 });

  const admin = createAdminClient();
  const { data: members, error: membersError } = await admin
    .from("clinic_members")
    .select("user_id, role")
    .eq("clinic_id", ctx.clinicId);

  if (membersError) {
    return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
  }

  const memberList = members ?? [];
  const emailMap: Record<string, string> = {};
  for (const row of memberList) {
    const uid = (row as { user_id: string }).user_id;
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(uid);
      if (user?.email) emailMap[uid] = user.email;
    } catch {
      emailMap[uid] = "(unknown)";
    }
  }

  const staff = memberList.map((m) => {
    const r = m as { user_id: string; role: string };
    return { user_id: r.user_id, email: emailMap[r.user_id] ?? "(unknown)", role: r.role };
  });

  // Limit applies to staff only (do not count owner)
  const limit = getPlanLimit(ctx.plan, "staffAssistants");
  const currentUserRole = staff.find((m) => m.user_id === ctx.currentUserId)?.role ?? "staff";
  return NextResponse.json({ members: staff, limit, currentUserRole });
}

/**
 * POST /api/app/team — add staff (email + password). Creates auth user if needed, adds to clinic_members. Enforces plan limit.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getClinicIdAndPlan(token);
  if (!ctx) return NextResponse.json({ error: "No clinic" }, { status: 403 });

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
  // Count only staff (not owner) for plan limit
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

  let userId: string;
  const { data: { user: existingUser }, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already") || createErr.message?.toLowerCase().includes("registered")) {
      const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const byEmail = users?.find((u) => u.email?.toLowerCase() === email);
      if (!byEmail?.id) {
        return NextResponse.json({ error: "Could not find existing user for this email." }, { status: 400 });
      }
      userId = byEmail.id;
    } else {
      return NextResponse.json({ error: createErr.message || "Failed to create user" }, { status: 400 });
    }
  } else if (existingUser?.id) {
    userId = existingUser.id;
  } else {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  const { data: existingMember, error: memberCheckErr } = await admin
    .from("clinic_members")
    .select("user_id, role")
    .eq("clinic_id", ctx.clinicId)
    .eq("user_id", userId)
    .maybeSingle();
  if (memberCheckErr) {
    return NextResponse.json({ error: "Failed to check membership" }, { status: 500 });
  }
  if (existingMember) {
    const r = existingMember as { user_id: string; role: string };
    return NextResponse.json({ member: { user_id: r.user_id, email, role: r.role } });
  }

  const { error: insertErr } = await admin
    .from("clinic_members")
    .insert({ clinic_id: ctx.clinicId, user_id: userId, role });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message || "Failed to add staff" }, { status: 500 });
  }
  return NextResponse.json({ member: { user_id: userId, email, role } });
}
