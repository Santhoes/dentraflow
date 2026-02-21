import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { slugFromName } from "@/lib/supabase/types";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10)));
  const offset = (page - 1) * limit;

  const admin = createAdminClient();

  const { data: clinics, error: clinicsError, count } = await admin
    .from("clinics")
    .select("id, name, slug, country, timezone, plan, plan_expires_at, phone, working_hours, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (clinicsError) {
    console.error("admin clinics", clinicsError);
    return NextResponse.json({ error: "Failed to fetch clinics" }, { status: 500 });
  }

  const list = clinics || [];
  const clinicIds = list.map((c) => c.id);

  const { data: members, error: membersError } = await admin
    .from("clinic_members")
    .select("clinic_id, user_id, role")
    .in("clinic_id", clinicIds);

  if (membersError) {
    return NextResponse.json({
      clinics: list.map((c) => ({ ...c, staff: [] })),
      total: count ?? 0,
      page,
      limit,
    });
  }

  const memberList = members || [];
  const userIds = Array.from(new Set(memberList.map((m) => (m as { user_id: string }).user_id)));
  const emailMap: Record<string, string> = {};

  for (const uid of userIds) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(uid);
      if (user?.email) emailMap[uid] = user.email;
    } catch {
      emailMap[uid] = "(unknown)";
    }
  }

  const staffByClinic: Record<string, { email: string; role: string }[]> = {};
  for (const m of memberList) {
    const row = m as { clinic_id: string; user_id: string; role: string };
    if (!staffByClinic[row.clinic_id]) staffByClinic[row.clinic_id] = [];
    staffByClinic[row.clinic_id].push({
      email: emailMap[row.user_id] ?? "(unknown)",
      role: row.role,
    });
  }

  const result = list.map((c) => ({
    ...c,
    staff: staffByClinic[c.id] || [],
  }));

  return NextResponse.json({
    clinics: result,
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  let body: { name: string; country: string; timezone?: string; plan?: string; plan_expires_at?: string | null; phone?: string; working_hours?: Record<string, { open: string; close: string }> | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, country, timezone, plan, plan_expires_at, phone, working_hours } = body;
  if (!name?.trim() || !country?.trim()) {
    return NextResponse.json({ error: "name and country are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const slug = slugFromName(name.trim());
  const { data: existing } = await admin.from("clinics").select("id").eq("slug", slug).maybeSingle();
  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const { data: clinic, error } = await admin
    .from("clinics")
    .insert({
      name: name.trim(),
      slug: finalSlug,
      country: country.trim(),
      timezone: timezone?.trim() || "America/New_York",
      plan: plan === "pro" || plan === "elite" ? plan : "starter",
      plan_expires_at: plan_expires_at?.trim() || null,
      phone: phone?.trim() || null,
      working_hours: working_hours || null,
    })
    .select("id, name, slug, country, timezone, plan, phone, created_at")
    .single();

  if (error) {
    console.error("admin clinics POST", error);
    return NextResponse.json({ error: error.message || "Failed to create clinic" }, { status: 500 });
  }

  return NextResponse.json({ clinic });
}
