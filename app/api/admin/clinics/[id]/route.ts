import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Clinic ID required" }, { status: 400 });

  let body: {
    name?: string;
    slug?: string;
    country?: string;
    timezone?: string;
    plan?: string;
    plan_expires_at?: string | null;
    phone?: string | null;
    working_hours?: Record<string, { open: string; close: string }> | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "") || null;
    if (slug && slug !== "demo") updates.slug = slug;
  }
  if (body.country !== undefined) updates.country = body.country.trim();
  if (body.timezone !== undefined) updates.timezone = body.timezone?.trim() || "America/New_York";
  if (body.plan !== undefined) {
    const allowedPlans = ["starter", "pro", "elite", "smart_booking"];
    updates.plan = allowedPlans.includes(body.plan) ? body.plan : "starter";
  }
  if (body.plan_expires_at !== undefined) updates.plan_expires_at = body.plan_expires_at || null;
  if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
  if (body.working_hours !== undefined) updates.working_hours = body.working_hours;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data: clinic, error } = await admin
    .from("clinics")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    console.error("admin clinics PATCH", error);
    return NextResponse.json({ error: error.message || "Failed to update clinic" }, { status: 500 });
  }

  return NextResponse.json({ clinic });
}
