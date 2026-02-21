import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClinicSignature } from "@/lib/chat-signature";

/**
 * Public clinic info by slug (for embed chat). Requires valid sig= so slug cannot be guessed.
 * Optional ?location=<uuid> or ?agent=<uuid> for location/agent-wise widget.
 * If agent= is set, returns agent_name and location info from that agent. If plan expired, 403.
 * GET /api/public/clinic?slug=my-clinic&sig=<signature>&location=<uuid>|&agent=<uuid>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  const sig = searchParams.get("sig")?.trim();
  const locationId = searchParams.get("location")?.trim() || null;
  const agentId = searchParams.get("agent")?.trim() || null;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }
  if (!sig || !verifyClinicSignature(slug, sig)) {
    return NextResponse.json({ error: "Invalid or missing signature" }, { status: 403 });
  }
  try {
    const supabase = createAdminClient();
    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .select("id, name, slug, plan, accepts_insurance, insurance_notes, plan_expires_at, logo_url, widget_primary_color, widget_background_color")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    if (clinicErr || !clinic) {
      return NextResponse.json({ error: clinicErr?.message || "Clinic not found" }, { status: clinicErr ? 500 : 404 });
    }
    const planExpiresAt = clinic.plan_expires_at ? new Date(clinic.plan_expires_at) : null;
    if (planExpiresAt && planExpiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Chat unavailable", plan_active: false },
        { status: 403 }
      );
    }
    let name = clinic.name;
    let accepts_insurance = clinic.accepts_insurance ?? true;
    let insurance_notes: string | null = clinic.insurance_notes ?? null;
    let location_name: string | null = null;
    let agent_name: string | null = null;
    let effectiveLocationId: string | null = locationId;

    if (agentId) {
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("name, location_id")
        .eq("id", agentId)
        .eq("clinic_id", clinic.id)
        .maybeSingle();
      if (agent) {
        agent_name = (agent as { name: string }).name;
        const locId = (agent as { location_id?: string | null }).location_id;
        if (locId) effectiveLocationId = locId;
      }
    }

    if (effectiveLocationId) {
      const { data: loc } = await supabase
        .from("clinic_locations")
        .select("name, working_hours, accepts_insurance, insurance_notes")
        .eq("id", effectiveLocationId)
        .eq("clinic_id", clinic.id)
        .maybeSingle();
      if (loc) {
        location_name = loc.name;
        if (loc.accepts_insurance !== undefined && loc.accepts_insurance !== null) accepts_insurance = loc.accepts_insurance;
        if (loc.insurance_notes !== undefined && loc.insurance_notes !== null) insurance_notes = loc.insurance_notes;
      }
    }

    const plan = clinic.plan === "pro" || clinic.plan === "elite" ? clinic.plan : "starter";
    const customLogo = (clinic.logo_url ?? "").trim();
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl && typeof request.url === "string") {
      try {
        baseUrl = new URL(request.url).origin;
      } catch {
        baseUrl = "";
      }
    }
    baseUrl = baseUrl || "https://dentraflow.com";
    const defaultLogoUrl = `${baseUrl}/logo.png`;
    const logo_url =
      plan === "elite" && customLogo ? customLogo : defaultLogoUrl;

    return NextResponse.json({
      id: clinic.id,
      name,
      location_name,
      agent_name: agent_name ?? null,
      agent_id: agentId || null,
      slug: clinic.slug,
      accepts_insurance,
      insurance_notes,
      plan_active: true,
      logo_url,
      widget_primary_color: clinic.widget_primary_color ?? null,
      widget_background_color: clinic.widget_background_color ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
