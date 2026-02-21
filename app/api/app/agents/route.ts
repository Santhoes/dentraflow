import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanLimit } from "@/lib/plan-features";

/**
 * GET /api/app/agents — list AI agents for the clinic. Returns agents and plan limit.
 * POST /api/app/agents — create an AI agent (name required). Enforces plan limit.
 */
async function getClinicIdAndPlan(token: string): Promise<{ clinicId: string; plan: string } | null> {
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
  return { clinicId, plan };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getClinicIdAndPlan(token);
  if (!ctx) return NextResponse.json({ error: "No clinic" }, { status: 403 });

  const admin = createAdminClient();
  const { data: agents, error } = await admin
    .from("ai_agents")
    .select("id, name, location_id, sort_order, created_at, updated_at")
    .eq("clinic_id", ctx.clinicId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to list agents" }, { status: 500 });
  }

  const limit = getPlanLimit(ctx.plan, "aiAgents");
  return NextResponse.json({
    agents: agents ?? [],
    limit,
    count: (agents ?? []).length,
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getClinicIdAndPlan(token);
  if (!ctx) return NextResponse.json({ error: "No clinic" }, { status: 403 });

  let body: { name?: string; location_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const limit = getPlanLimit(ctx.plan, "aiAgents");
  const { count, error: countErr } = await admin
    .from("ai_agents")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", ctx.clinicId);

  if (countErr) {
    return NextResponse.json({ error: "Failed to check limit" }, { status: 500 });
  }
  const currentCount = count ?? 0;
  if (limit !== null && currentCount >= limit) {
    return NextResponse.json(
      { error: `Plan limit reached. Your plan allows ${limit} AI agent${limit === 1 ? "" : "s"}. Upgrade to add more.` },
      { status: 403 }
    );
  }

  const locationId = body.location_id === null || (typeof body.location_id === "string" && body.location_id.trim() === "")
    ? null
    : typeof body.location_id === "string"
      ? body.location_id.trim() || null
      : null;

  if (locationId) {
    const { data: loc } = await admin
      .from("clinic_locations")
      .select("id")
      .eq("id", locationId)
      .eq("clinic_id", ctx.clinicId)
      .maybeSingle();
    if (!loc) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
  }

  const { data: agent, error: insertErr } = await admin
    .from("ai_agents")
    .insert({
      clinic_id: ctx.clinicId,
      name,
      location_id: locationId,
      sort_order: currentCount,
    })
    .select("id, name, location_id, sort_order, created_at, updated_at")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }

  return NextResponse.json({ agent });
}
