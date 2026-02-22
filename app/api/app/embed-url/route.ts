import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { signClinicSlug } from "@/lib/chat-signature";

/**
 * Returns signed embed URL and iframe snippet for the clinic. Requires auth + clinic membership.
 * Send: Authorization: Bearer <access_token>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Server config" }, { status: 500 });

  const supabase = createClient(url, anonKey);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) {
    return NextResponse.json({ error: "No clinic" }, { status: 403 });
  }
  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { data: clinic } = await admin
    .from("clinics")
    .select("slug")
    .eq("id", clinicId)
    .single();
  if (!clinic?.slug) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }
  const sig = signClinicSlug(clinic.slug);
  if (!sig) {
    return NextResponse.json(
      { error: "Chat widget is not configured. Set CHAT_PROTECTION_SECRET in your server environment." },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location")?.trim() || null;
  const agentId = searchParams.get("agent")?.trim() || null;

  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://www.dentraflow.com").replace(/\/$/, "");
  let embedUrl = `${base}/embed/chat?clinic=${encodeURIComponent(clinic.slug)}&sig=${sig}`;
  if (agentId) {
    const { data: agent } = await admin
      .from("ai_agents")
      .select("id")
      .eq("id", agentId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (agent) embedUrl += `&agent=${encodeURIComponent(agentId)}`;
  }
  if (locationId && !agentId) {
    const { data: loc } = await admin
      .from("clinic_locations")
      .select("id")
      .eq("id", locationId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (loc) embedUrl += `&location=${encodeURIComponent(locationId)}`;
  }
  // Single iframe: widget inside has launcher (open) and header minimize (close). Each URL is clinic/location-specific.
  const iframeSnippet = `<!-- DentraFlow chat widget: one iframe per clinic/location. Widget includes launcher icon and chat panel with close (X). -->
<div id="dentraflow-chat-root" style="position:fixed;bottom:0;right:0;z-index:99999;font-family:system-ui,sans-serif;background:transparent;pointer-events:none;">
  <iframe
    src="${embedUrl}"
    title="Chat with us"
    allow="clipboard-write"
    style="width:min(360px,100vw);height:min(480px,75vh);border:none;display:block;border-radius:0;box-shadow:0 -4px 24px rgba(0,0,0,0.12);pointer-events:auto;"
  ></iframe>
</div>`;
  return NextResponse.json({
    embedUrl,
    iframeSnippet,
    clinicSlug: clinic.slug,
    locationId: locationId || null,
    agentId: agentId || null,
  });
}
