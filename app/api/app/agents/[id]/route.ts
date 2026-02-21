import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

async function getClinicId(token: string): Promise<string | null> {
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
  return member?.clinic_id ?? null;
}

/**
 * PATCH /api/app/agents/[id] — update agent name or location_id.
 * DELETE /api/app/agents/[id] — delete agent.
 */
export async function PATCH(request: Request, { params }: Params) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId(token);
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 403 });

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: "Invalid agent" }, { status: 400 });

  let body: { name?: string; location_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("ai_agents")
    .select("id")
    .eq("id", id.trim())
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updates: { name?: string; location_id?: string | null } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    updates.name = name;
  }
  if (body.location_id !== undefined) {
    const locationId = body.location_id === null || (typeof body.location_id === "string" && body.location_id.trim() === "")
      ? null
      : typeof body.location_id === "string"
        ? body.location_id.trim() || null
        : undefined;
    if (locationId !== undefined) {
      if (locationId) {
        const { data: loc } = await admin
          .from("clinic_locations")
          .select("id")
          .eq("id", locationId)
          .eq("clinic_id", clinicId)
          .maybeSingle();
        if (!loc) return NextResponse.json({ error: "Invalid location" }, { status: 400 });
      }
      updates.location_id = locationId;
    }
  }

  if (Object.keys(updates).length === 0) {
    const { data: agent } = await admin
      .from("ai_agents")
      .select("id, name, location_id, sort_order, created_at, updated_at")
      .eq("id", id.trim())
      .single();
    return NextResponse.json({ agent });
  }

  const { data: agent, error } = await admin
    .from("ai_agents")
    .update(updates)
    .eq("id", id.trim())
    .eq("clinic_id", clinicId)
    .select("id, name, location_id, sort_order, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  return NextResponse.json({ agent });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId(token);
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 403 });

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: "Invalid agent" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("ai_agents")
    .delete()
    .eq("id", id.trim())
    .eq("clinic_id", clinicId);

  if (error) return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
