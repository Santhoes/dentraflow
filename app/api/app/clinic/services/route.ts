import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";

/**
 * GET /api/app/clinic/services — list appointment types (name + duration) for the clinic. Auth required.
 */
export async function GET(request: Request) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) {
    return NextResponse.json({ error: "No clinic" }, { status: 403 });
  }

  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { data: rows, error } = await admin
    .from("clinic_services")
    .select("id, name, duration_minutes, sort_order, enabled")
    .eq("clinic_id", clinicId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const services = (rows || []).map((r: { id: string; name: string; duration_minutes: number; sort_order: number; enabled?: boolean }) => ({
    id: r.id,
    name: r.name,
    duration_minutes: r.duration_minutes,
    sort_order: r.sort_order,
    enabled: r.enabled !== false,
  }));

  return NextResponse.json({ services });
}

/**
 * PATCH /api/app/clinic/services — replace appointment types. Body: { services: [ { id?, name, duration_minutes } ] }. Auth required.
 */
export async function PATCH(request: Request) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) {
    return NextResponse.json({ error: "No clinic" }, { status: 403 });
  }

  const clinicId = (member as { clinic_id: string }).clinic_id;

  let body: { services?: { id?: string; name: string; duration_minutes: number; enabled?: boolean }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = Array.isArray(body.services) ? body.services : [];
  const valid = input.filter(
    (s): s is { id?: string; name: string; duration_minutes: number; enabled?: boolean } =>
      typeof s?.name === "string" &&
      s.name.trim().length > 0 &&
      typeof s?.duration_minutes === "number" &&
      s.duration_minutes >= 15 &&
      s.duration_minutes <= 480
  );

  const validIds = new Set(
    valid
      .filter((s) => typeof s.id === "string" && (s.id as string).trim().length > 0)
      .map((s) => (s.id as string).trim())
  );

  const { data: existing } = await admin
    .from("clinic_services")
    .select("id")
    .eq("clinic_id", clinicId);

  const toDelete = (existing || [])
    .filter((r: { id: string }) => !validIds.has(r.id))
    .map((r: { id: string }) => r.id);
  if (toDelete.length > 0) {
    await admin.from("clinic_services").delete().in("id", toDelete).eq("clinic_id", clinicId);
  }

  let sortOrder = 0;
  for (const s of valid) {
    const name = s.name.trim();
    const duration = Math.round(s.duration_minutes);
    const enabled = s.enabled !== false;
    const id = typeof s.id === "string" && s.id.trim() ? s.id.trim() : null;
    if (id && validIds.has(id)) {
      await admin
        .from("clinic_services")
        .update({ name, duration_minutes: duration, sort_order: sortOrder, enabled })
        .eq("id", id)
        .eq("clinic_id", clinicId);
    } else {
      await admin.from("clinic_services").insert({
        clinic_id: clinicId,
        name,
        duration_minutes: duration,
        sort_order: sortOrder,
        enabled,
      });
    }
    sortOrder += 1;
  }

  const { data: rows } = await admin
    .from("clinic_services")
    .select("id, name, duration_minutes, sort_order, enabled")
    .eq("clinic_id", clinicId)
    .order("sort_order", { ascending: true });

  const services = (rows || []).map((r: { id: string; name: string; duration_minutes: number; sort_order: number; enabled?: boolean }) => ({
    id: r.id,
    name: r.name,
    duration_minutes: r.duration_minutes,
    sort_order: r.sort_order,
    enabled: r.enabled !== false,
  }));

  return NextResponse.json({ services });
}
